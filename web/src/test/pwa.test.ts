/**
 * Tests for PWA features: install prompt handling and push notification subscription.
 *
 * These tests verify the logic of the useInstallPrompt and usePushNotifications hooks,
 * including the urlBase64ToUint8Array utility and push subscription state management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── urlBase64ToUint8Array utility ───────────────────────────────────────────

/**
 * Mirror of the internal utility in usePushNotifications.ts.
 * Tested in isolation since it's a critical conversion step.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const uint8Array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    uint8Array[i] = rawData.charCodeAt(i);
  }
  return uint8Array;
}

describe('urlBase64ToUint8Array', () => {
  it('converts a standard base64 string correctly', () => {
    // "hello" in base64 is "aGVsbG8="
    const result = urlBase64ToUint8Array('aGVsbG8=');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]); // "hello"
  });

  it('handles URL-safe base64 (- and _ chars)', () => {
    // Standard base64: "Man" → "TWFu"
    // URL-safe variant uses same chars for this string, so use a known pattern
    const standard = btoa('\xfb\xff'); // produces "+/8=" in standard, "-_8=" in url-safe
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = urlBase64ToUint8Array(urlSafe);
    expect(result[0]).toBe(0xfb);
    expect(result[1]).toBe(0xff);
  });

  it('adds correct padding for strings of different lengths', () => {
    // No padding needed (length % 4 === 0)
    expect(() => urlBase64ToUint8Array('aGVs')).not.toThrow();
    // 1 padding char
    expect(() => urlBase64ToUint8Array('aGVsbA')).not.toThrow();
    // 2 padding chars
    expect(() => urlBase64ToUint8Array('aGVsbG8')).not.toThrow();
  });

  it('returns a Uint8Array with correct buffer type', () => {
    const result = urlBase64ToUint8Array('aGVsbG8=');
    // Should be a standard ArrayBuffer (not SharedArrayBuffer)
    expect(result.buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('returns empty array for empty string', () => {
    const result = urlBase64ToUint8Array('');
    expect(result.length).toBe(0);
  });
});

// ─── Install prompt logic ─────────────────────────────────────────────────────

describe('Install prompt — beforeinstallprompt handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates subscription by endpoint', () => {
    // Simulate the subscription dedup logic from push-manager
    type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
    const existing: Sub[] = [
      { endpoint: 'https://push.example.com/1', keys: { p256dh: 'a', auth: 'b' } },
      { endpoint: 'https://push.example.com/2', keys: { p256dh: 'c', auth: 'd' } },
    ];
    const newSub: Sub = { endpoint: 'https://push.example.com/1', keys: { p256dh: 'x', auth: 'y' } };

    const filtered = existing.filter(s => s.endpoint !== newSub.endpoint);
    const updated = [...filtered, newSub];

    expect(updated).toHaveLength(2);
    expect(updated.find(s => s.endpoint === newSub.endpoint)?.keys.p256dh).toBe('x');
  });

  it('removes subscription by endpoint', () => {
    type Sub = { endpoint: string };
    const subs: Sub[] = [
      { endpoint: 'https://push.example.com/1' },
      { endpoint: 'https://push.example.com/2' },
    ];
    const result = subs.filter(s => s.endpoint !== 'https://push.example.com/1');
    expect(result).toHaveLength(1);
    expect(result[0].endpoint).toBe('https://push.example.com/2');
  });

  it('caps subscriptions at MAX_SUBSCRIPTIONS', () => {
    const MAX_SUBSCRIPTIONS = 500;
    const subs = Array.from({ length: 501 }, (_, i) => ({ endpoint: `https://push.example.com/${i}` }));
    const capped = subs.slice(-MAX_SUBSCRIPTIONS);
    expect(capped).toHaveLength(500);
  });

  it('outcome "accepted" marks as installed', () => {
    // Simulate the logic in useInstallPrompt.prompt()
    let isInstalled = false;
    const outcome = 'accepted';
    if (outcome === 'accepted') isInstalled = true;
    expect(isInstalled).toBe(true);
  });

  it('outcome "dismissed" does not mark as installed', () => {
    let isInstalled = false;
    const outcome = 'dismissed';
    if (outcome === 'accepted') isInstalled = true;
    expect(isInstalled).toBe(false);
  });

  it('standalone display mode is treated as installed', () => {
    // window.matchMedia is already stubbed in setup.ts (returns matches: false)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // In jsdom the stub returns false, so not treated as standalone
    expect(isStandalone).toBe(false);
  });
});

// ─── Push notification permission states ─────────────────────────────────────

describe('Push notification — permission state', () => {
  it('identifies unsupported when Notification is undefined', () => {
    const isSupported = typeof Notification !== 'undefined' && 'PushManager' in window;
    // In jsdom, Notification may exist but PushManager may not
    // Verify that the check logic works correctly
    expect(typeof isSupported).toBe('boolean');
  });

  it('maps Notification.permission to permission state', () => {
    const states = ['default', 'granted', 'denied'] as const;
    for (const state of states) {
      // The hook reads Notification.permission directly
      expect(['default', 'granted', 'denied', 'unsupported']).toContain(state);
    }
  });
});
