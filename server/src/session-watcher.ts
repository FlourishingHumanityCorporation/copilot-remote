import { watch, readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ChatMessage } from './types.js';

const SESSION_STATE_DIR = join(homedir(), '.copilot', 'session-state');

// Track file offsets so we only process new lines
const fileOffsets = new Map<string, number>();
const watchers = new Map<string, ReturnType<typeof watch>>();

type MessageCallback = (sessionId: string, message: ChatMessage) => void;

function parseEvent(line: string): { type: string; data: any; id?: string; timestamp?: string } | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function processNewLines(sessionId: string, eventsPath: string, callback: MessageCallback) {
  try {
    const stat = statSync(eventsPath);
    const currentOffset = fileOffsets.get(eventsPath) || 0;

    if (stat.size <= currentOffset) return;

    const fd = readFileSync(eventsPath, 'utf-8');
    const newContent = fd.slice(currentOffset);
    fileOffsets.set(eventsPath, fd.length);

    const lines = newContent.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const event = parseEvent(line);
      if (!event) continue;

      if (event.type === 'user.message' && event.data?.content) {
        callback(sessionId, {
          id: event.id || '',
          role: 'user',
          content: event.data.content,
          timestamp: event.timestamp || '',
        });
      } else if (event.type === 'assistant.message' && event.data?.content) {
        callback(sessionId, {
          id: event.data.messageId || event.id || '',
          role: 'copilot',
          content: event.data.content,
          timestamp: event.timestamp || '',
        });
      }
    }
  } catch {
    // File read error — skip
  }
}

function watchSession(sessionId: string, callback: MessageCallback) {
  const eventsPath = join(SESSION_STATE_DIR, sessionId, 'events.jsonl');
  if (!existsSync(eventsPath) || watchers.has(sessionId)) return;

  // Set initial offset to end of file so we only get new events
  try {
    const content = readFileSync(eventsPath, 'utf-8');
    fileOffsets.set(eventsPath, content.length);
  } catch {
    return;
  }

  try {
    const watcher = watch(eventsPath, (eventType) => {
      if (eventType === 'change') {
        processNewLines(sessionId, eventsPath, callback);
      }
    });
    watchers.set(sessionId, watcher);
  } catch {
    // Watch failed
  }
}

export function watchSessionEvents(callback: MessageCallback) {
  if (!existsSync(SESSION_STATE_DIR)) return { stop: () => {} };

  // Watch existing session directories
  try {
    const entries = readdirSync(SESSION_STATE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        watchSession(entry.name, callback);
      }
    }
  } catch {
    // Can't read session state dir
  }

  // Watch for new session directories
  const dirWatcher = watch(SESSION_STATE_DIR, (eventType, filename) => {
    if (filename && !watchers.has(filename)) {
      const sessionDir = join(SESSION_STATE_DIR, filename);
      if (existsSync(sessionDir) && statSync(sessionDir).isDirectory()) {
        watchSession(filename, callback);
      }
    }
  });

  return {
    stop: () => {
      dirWatcher.close();
      for (const w of watchers.values()) w.close();
      watchers.clear();
    },
  };
}
