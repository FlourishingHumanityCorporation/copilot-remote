import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Session, ChatMessage } from './types.js';
import { listHistoricalSessions } from './session-store.js';

// node-pty is a native module — dynamic import for resilience
let ptyModule: typeof import('node-pty') | null = null;

async function getPty() {
  if (!ptyModule) {
    ptyModule = await import('node-pty');
  }
  return ptyModule;
}

interface ManagedSession {
  session: Session;
  pty: import('node-pty').IPty | null;
  messages: ChatMessage[];
  buffer: string;
}

class SessionManager extends EventEmitter {
  private sessions = new Map<string, ManagedSession>();

  getAllSessions(): Session[] {
    const running = Array.from(this.sessions.values()).map(s => s.session);
    const historical = listHistoricalSessions();
    // Merge: running sessions first, then historical (excluding running ones)
    const runningIds = new Set(running.map(s => s.id));
    const merged = [
      ...running,
      ...historical.filter(h => !runningIds.has(h.id)),
    ];
    return merged;
  }

  getSession(id: string): ManagedSession | undefined {
    return this.sessions.get(id);
  }

  getMessages(id: string): ChatMessage[] {
    return this.sessions.get(id)?.messages || [];
  }

  async createSession(opts: { prompt?: string; cwd?: string; resume?: string }): Promise<Session> {
    const pty = await getPty();
    const id = opts.resume || uuidv4();

    const args: string[] = [];
    if (opts.resume) {
      args.push('--resume', opts.resume);
    }
    if (opts.prompt) {
      args.push('-p', opts.prompt);
    }

    const copilotPath = 'copilot';
    const cwd = opts.cwd || process.env.HOME || '/';

    const ptyProcess = pty.spawn(copilotPath, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd,
      env: { ...process.env } as Record<string, string>,
    });

    const session: Session = {
      id,
      cwd,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pid: ptyProcess.pid,
    };

    const managed: ManagedSession = {
      session,
      pty: ptyProcess,
      messages: [],
      buffer: '',
    };

    this.sessions.set(id, managed);

    // Stream PTY output
    ptyProcess.onData((data: string) => {
      managed.buffer += data;
      managed.session.updatedAt = new Date().toISOString();
      this.emit('output', id, data);

      // Parse into messages periodically
      this.parseBuffer(managed);
    });

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      managed.session.status = 'exited';
      managed.pty = null;
      this.emit('status', id, 'exited');

      const sysMsg: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Session exited with code ${exitCode}`,
        timestamp: new Date().toISOString(),
      };
      managed.messages.push(sysMsg);
      this.emit('message', id, sysMsg);
    });

    // Add initial system message
    if (opts.prompt) {
      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: opts.prompt,
        timestamp: new Date().toISOString(),
      };
      managed.messages.push(userMsg);
      this.emit('message', id, userMsg);
    }

    return session;
  }

  sendInput(id: string, text: string): boolean {
    const managed = this.sessions.get(id);
    if (!managed?.pty) return false;

    managed.pty.write(text + '\n');

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    managed.messages.push(userMsg);
    this.emit('message', id, userMsg);

    return true;
  }

  killSession(id: string): boolean {
    const managed = this.sessions.get(id);
    if (!managed?.pty) return false;
    managed.pty.kill();
    return true;
  }

  resize(id: string, cols: number, rows: number): void {
    const managed = this.sessions.get(id);
    if (managed?.pty) {
      managed.pty.resize(cols, rows);
    }
  }

  private parseBuffer(managed: ManagedSession): void {
    // Simple heuristic: accumulate output, emit as copilot message
    // when we detect a pause (debounced via timeout)
    if ((managed as any)._parseTimeout) {
      clearTimeout((managed as any)._parseTimeout);
    }

    (managed as any)._parseTimeout = setTimeout(() => {
      if (managed.buffer.trim()) {
        const stripped = stripAnsi(managed.buffer);
        if (stripped.trim()) {
          const msg: ChatMessage = {
            id: uuidv4(),
            role: 'copilot',
            content: stripped.trim(),
            timestamp: new Date().toISOString(),
          };
          managed.messages.push(msg);
          this.emit('message', managed.session.id, msg);
        }
        managed.buffer = '';
      }
    }, 500);
  }
}

// Strip ANSI escape codes
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\][^\x07]*\x07/g, '')
            .replace(/\x1B[()][AB012]/g, '')
            .replace(/\x1B[\x40-\x5F]/g, '');
}

export const sessionManager = new SessionManager();
