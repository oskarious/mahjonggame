import { describe, expect, it, vi } from 'vitest';
import { originAllowed, sessionFromCookie } from '../src/auth.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('originAllowed', () => {
  it('requires the exact origin in production', () => {
    const c = { origin: 'https://riichi.example' };
    expect(originAllowed('https://riichi.example', c)).toBe(true);
    expect(originAllowed('https://riichi.example.evil', c)).toBe(false);
    expect(originAllowed('http://riichi.example', c)).toBe(false);
    expect(originAllowed(undefined, c)).toBe(false);
  });

  it('accepts localhost and private LAN hosts in development', () => {
    const c = { origin: null };
    for (const o of [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://192.168.1.20:5173',
      'http://10.0.0.5',
      'http://172.20.0.1:3000',
    ]) {
      expect(originAllowed(o, c), o).toBe(true);
    }
    for (const o of ['http://evil.example', 'http://172.99.0.1', 'file://', 'null', undefined]) {
      expect(originAllowed(o, c), String(o)).toBe(false);
    }
  });
});

describe('sessionFromCookie', () => {
  const config = { webInternalUrl: 'http://web:3000' };

  it('forwards the cookie to the web app and reads the user', async () => {
    const fetchFn = vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
      expect(url).toBe('http://web:3000/api/auth/get-session');
      expect(init.headers.cookie).toBe('better-auth.session_token=abc');
      return json(200, {
        session: { id: 's' },
        user: { id: 'u1', name: 'n', username: 'oskar', displayUsername: 'Oskar' },
      });
    });
    await expect(sessionFromCookie('better-auth.session_token=abc', config, fetchFn)).resolves.toEqual({
      id: 'u1',
      name: 'Oskar',
    });
  });

  it('falls back through username and name', async () => {
    const f = async () => json(200, { user: { id: 'u1', name: 'Name', username: 'user' } });
    await expect(sessionFromCookie('c', config, f)).resolves.toEqual({ id: 'u1', name: 'user' });
    const g = async () => json(200, { user: { id: 'u1', name: 'Name' } });
    await expect(sessionFromCookie('c', config, g)).resolves.toEqual({ id: 'u1', name: 'Name' });
  });

  it('is null without a cookie, without a session, on errors and on bad bodies', async () => {
    const fetchFn = vi.fn(async () => json(200, null));
    await expect(sessionFromCookie(undefined, config, fetchFn)).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    await expect(sessionFromCookie('c', config, fetchFn)).resolves.toBeNull();
    await expect(sessionFromCookie('c', config, async () => json(401, { error: 'x' }))).resolves.toBeNull();
    await expect(sessionFromCookie('c', config, async () => json(200, { user: { id: 5 } }))).resolves.toBeNull();
    await expect(
      sessionFromCookie('c', config, async () => new Response('<html>', { status: 200 })),
    ).resolves.toBeNull();
    await expect(
      sessionFromCookie('c', config, async () => {
        throw new Error('ECONNREFUSED');
      }),
    ).resolves.toBeNull();
  });
});
