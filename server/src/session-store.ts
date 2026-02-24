import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse as parseYaml } from 'yaml';
import type { Session, ChatMessage } from './types.js';

const SESSION_STATE_DIR = join(homedir(), '.copilot', 'session-state');

interface WorkspaceYaml {
  id?: string;
  cwd?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
}

export function listHistoricalSessions(): Session[] {
  if (!existsSync(SESSION_STATE_DIR)) return [];

  const sessions: Session[] = [];

  try {
    const entries = readdirSync(SESSION_STATE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const workspacePath = join(SESSION_STATE_DIR, entry.name, 'workspace.yaml');
      if (!existsSync(workspacePath)) continue;

      try {
        const raw = readFileSync(workspacePath, 'utf-8');
        const data = parseYaml(raw) as WorkspaceYaml;
        const stat = statSync(workspacePath);

        sessions.push({
          id: data.id || entry.name,
          cwd: data.cwd || '',
          summary: data.summary,
          status: 'exited',
          createdAt: data.created_at || stat.birthtime.toISOString(),
          updatedAt: data.updated_at || stat.mtime.toISOString(),
        });
      } catch {
        // Skip malformed session directories
      }
    }
  } catch {
    // Session state dir unreadable
  }

  // Sort by most recent first
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions;
}

export function getSessionDetail(sessionId: string): Session | null {
  const sessionDir = join(SESSION_STATE_DIR, sessionId);
  const workspacePath = join(sessionDir, 'workspace.yaml');

  if (!existsSync(workspacePath)) return null;

  try {
    const raw = readFileSync(workspacePath, 'utf-8');
    const data = parseYaml(raw) as WorkspaceYaml;
    const stat = statSync(workspacePath);

    return {
      id: data.id || sessionId,
      cwd: data.cwd || '',
      summary: data.summary,
      status: 'exited',
      createdAt: data.created_at || stat.birthtime.toISOString(),
      updatedAt: data.updated_at || stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  const eventsPath = join(SESSION_STATE_DIR, sessionId, 'events.jsonl');
  if (!existsSync(eventsPath)) return [];

  const messages: ChatMessage[] = [];
  try {
    const raw = readFileSync(eventsPath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'user.message' && event.data?.content) {
          messages.push({
            id: event.id || '',
            role: 'user',
            content: event.data.content,
            timestamp: event.timestamp || event.data?.timestamp || '',
          });
        } else if (event.type === 'assistant.message' && event.data?.content) {
          messages.push({
            id: event.data.messageId || event.id || '',
            role: 'copilot',
            content: event.data.content,
            timestamp: event.timestamp || '',
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Events file unreadable
  }

  return messages;
}
