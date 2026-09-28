import { describe, expect, it, vi } from 'vitest';
import { type PlayerDeps, REPEAT_MS, SoundPlayer } from './player';
import { SOUNDS, type SoundManifest } from './sounds';

const allNull = Object.fromEntries(Object.keys(SOUNDS).map((k) => [k, null])) as SoundManifest;

function stubContext() {
  const started: unknown[] = [];
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => {
      if (data.byteLength === 0) throw new Error('undecodable');
      return { data } as unknown as AudioBuffer;
    }),
    createGain: () => ({ gain: { value: 1 }, connect: (x: unknown) => x }),
    createBufferSource() {
      const source = {
        buffer: null as unknown,
        connect: (x: unknown) => x,
        start: () => started.push(source.buffer),
      };
      return source;
    },
  };
  return { ctx, started };
}

function setup(manifest: Partial<SoundManifest>, files: Record<string, number> = {}) {
  const { ctx, started } = stubContext();
  let now = 1000;
  const fetch = vi.fn(async (url: string) => {
    const size = files[url];
    if (size === undefined) return new Response('<h1>Not found</h1>', { status: 404 });
    return new Response(new Uint8Array(size));
  });
  const deps: PlayerDeps = {
    manifest: { ...allNull, ...manifest },
    base: '/audio/',
    createContext: () => ctx as unknown as AudioContext,
    fetch,
    now: () => now,
  };
  const player = new SoundPlayer(deps);
  return { player, fetch, started, advance: (ms: number) => (now += ms) };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('SoundPlayer', () => {
  it('a null cue makes no request and throws nothing', async () => {
    const { player, fetch, started } = setup({});
    player.unlock();
    expect(() => player.play('callPon')).not.toThrow();
    await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(started).toEqual([]);
  });

  it('an all-null manifest stays silent for every cue', async () => {
    const { player, fetch, started } = setup({});
    player.unlock();
    for (const id of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) player.play(id);
    await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(started).toEqual([]);
  });

  it('plays a cue with a file', async () => {
    const { player, started } = setup({ tilePlace: 'a.mp3' }, { '/audio/a.mp3': 8 });
    player.unlock();
    player.play('tilePlace');
    await settle();
    expect(started).toHaveLength(1);
  });

  it('a missing or undecodable file silences only that cue and is fetched once', async () => {
    const { player, fetch, started, advance } = setup(
      { tilePlace: 'missing.mp3', callPon: 'broken.mp3', callChii: 'ok.mp3' },
      { '/audio/broken.mp3': 0, '/audio/ok.mp3': 8 },
    );
    player.unlock();
    for (let i = 0; i < 3; i++) {
      player.play('tilePlace');
      player.play('callPon');
      player.play('callChii');
      await settle();
      advance(REPEAT_MS);
    }
    expect(started).toHaveLength(3);
    expect(fetch.mock.calls.filter(([u]) => u === '/audio/missing.mp3')).toHaveLength(1);
    expect(fetch.mock.calls.filter(([u]) => u === '/audio/broken.mp3')).toHaveLength(1);
  });

  it('is silent before unlock and without Web Audio', async () => {
    const { player, fetch, started } = setup({ tilePlace: 'a.mp3' }, { '/audio/a.mp3': 8 });
    player.play('tilePlace');
    await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(started).toEqual([]);

    const none = new SoundPlayer({
      manifest: { ...allNull, tilePlace: 'a.mp3' },
      base: '/audio/',
      createContext: () => null,
      fetch: vi.fn(),
      now: () => 0,
    });
    none.unlock();
    expect(() => none.play('tilePlace')).not.toThrow();

    const throwing = new SoundPlayer({
      manifest: { ...allNull, tilePlace: 'a.mp3' },
      base: '/audio/',
      createContext: () => {
        throw new Error('no audio');
      },
      fetch: vi.fn(),
      now: () => 0,
    });
    expect(() => throwing.unlock()).not.toThrow();
    expect(() => throwing.play('tilePlace')).not.toThrow();
  });

  it('drops repeats of the same cue within the throttle window', async () => {
    const { player, started, advance } = setup({ tilePlace: 'a.mp3' }, { '/audio/a.mp3': 8 });
    player.unlock();
    player.play('tilePlace');
    player.play('tilePlace');
    advance(REPEAT_MS);
    player.play('tilePlace');
    await settle();
    expect(started).toHaveLength(2);
  });

  it('muted: plays nothing and downloads nothing', async () => {
    const { player, fetch, started } = setup({ tilePlace: 'a.mp3' }, { '/audio/a.mp3': 8 });
    player.setEnabled(false);
    player.unlock();
    player.play('tilePlace');
    await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(started).toEqual([]);
  });
});
