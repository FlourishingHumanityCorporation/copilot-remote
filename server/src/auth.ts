import { randomBytes, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Request, Response, NextFunction } from 'express';

const CONFIG_DIR = join(homedir(), '.copilot-remote');
const TOKEN_FILE = join(CONFIG_DIR, 'auth-token');

let authToken: string;

export function getOrCreateToken(): string {
  if (authToken) return authToken;

  if (existsSync(TOKEN_FILE)) {
    authToken = readFileSync(TOKEN_FILE, 'utf-8').trim();
  } else {
    mkdirSync(CONFIG_DIR, { recursive: true });
    authToken = randomBytes(32).toString('hex');
    writeFileSync(TOKEN_FILE, authToken, { mode: 0o600 });
  }

  return authToken;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check
  if (req.path === '/api/health') {
    next();
    return;
  }

  const token = req.headers.authorization?.replace('Bearer ', '') ||
                req.query.token as string;

  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const expected = Buffer.from(getOrCreateToken());
  const provided = Buffer.from(token);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
}

export function validateWsToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(getOrCreateToken());
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
