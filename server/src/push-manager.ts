import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.copilot-remote');
const VAPID_FILE = join(CONFIG_DIR, 'vapid-keys.json');
const SUBS_FILE = join(CONFIG_DIR, 'push-subscriptions.json');

/** Maximum number of push subscriptions to retain */
const MAX_SUBSCRIPTIONS = 500;

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

function loadOrCreateVapidKeys(): VapidKeys {
  if (existsSync(VAPID_FILE)) {
    try {
      return JSON.parse(readFileSync(VAPID_FILE, 'utf8'));
    } catch {
      // Fall through to generate new keys
    }
  }
  mkdirSync(CONFIG_DIR, { recursive: true });
  const keys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), { mode: 0o600 });
  return keys;
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function loadSubscriptions(): PushSubscription[] {
  if (!existsSync(SUBS_FILE)) return [];
  try {
    const raw = JSON.parse(readFileSync(SUBS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: PushSubscription[]): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), { mode: 0o600 });
}

const vapidKeys = loadOrCreateVapidKeys();

webpush.setVapidDetails(
  'mailto:noreply@copilot-remote.local',
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

export function addSubscription(sub: PushSubscription): void {
  const subs = loadSubscriptions();
  // Deduplicate by endpoint
  const filtered = subs.filter(s => s.endpoint !== sub.endpoint);
  const updated = [...filtered, sub].slice(-MAX_SUBSCRIPTIONS);
  saveSubscriptions(updated);
}

export function removeSubscription(endpoint: string): void {
  const subs = loadSubscriptions();
  saveSubscriptions(subs.filter(s => s.endpoint !== endpoint));
}

export async function sendPushNotification(
  title: string,
  body: string,
  tag?: string,
): Promise<void> {
  const subs = loadSubscriptions();
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, tag: tag ?? 'copilot-remote' });
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
      ),
    ),
  );

  // Remove expired/invalid subscriptions (HTTP 410 Gone or 404)
  const toRemove: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toRemove.push(subs[i].endpoint);
      }
    }
  });
  if (toRemove.length > 0) {
    saveSubscriptions(subs.filter(s => !toRemove.includes(s.endpoint)));
  }
}
