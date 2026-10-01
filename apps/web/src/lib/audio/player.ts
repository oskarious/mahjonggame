// Plays the cues named in sounds.ts through Web Audio. Silent, never throwing, until everything needed is there:
// a file for the cue, Web Audio, a first user gesture (autoplay policy), sound switched on.
import { SOUNDS, type SoundId, type SoundManifest } from "./sounds";

/** The same cue again within this many ms is dropped (fast bot play, fast-forwarded games). */
export const REPEAT_MS = 40;

export interface PlayerDeps {
  manifest: SoundManifest;
  /** URL prefix of the files. */
  base: string;
  /** Null when Web Audio is unavailable. */
  createContext: () => AudioContext | null;
  fetch: (url: string) => Promise<Response>;
  now: () => number;
}

export class SoundPlayer {
  #deps: PlayerDeps;
  #ctx: AudioContext | null = null;
  #broken = false;
  #buffers = new Map<SoundId, Promise<AudioBuffer | null>>();
  #last = new Map<SoundId, number>();
  #enabled = true;
  #volume = 0.7;

  constructor(deps: PlayerDeps) {
    this.#deps = deps;
  }

  get enabled(): boolean {
    return this.#enabled;
  }
  get volume(): number {
    return this.#volume;
  }
  get unlocked(): boolean {
    return this.#ctx !== null;
  }

  setEnabled(on: boolean): void {
    this.#enabled = on;
    if (on) this.#prefetch();
  }

  /** 0..1 */
  setVolume(v: number): void {
    this.#volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  }

  /** Call from a user gesture: creates (or resumes) the audio context. */
  unlock(): void {
    try {
      if (!this.#ctx && !this.#broken) {
        this.#ctx = this.#deps.createContext();
        if (!this.#ctx) this.#broken = true;
        else this.#prefetch();
      }
      if (this.#ctx && this.#ctx.state !== "running")
        void this.#ctx.resume().catch(() => {});
    } catch {
      this.#ctx = null;
      this.#broken = true;
    }
  }

  /** Plays a cue after `delay` ms. A no-op for cues without a file, when muted or before unlock. */
  play(id: SoundId, delay = 0): void {
    try {
      if (!this.#enabled || this.#volume <= 0) return;
      const entry = this.#deps.manifest[id];
      if (!entry) return;
      const ctx = this.#ctx;
      if (!ctx) return;
      const now = this.#deps.now();
      const last = this.#last.get(id);
      if (last !== undefined && now - last < REPEAT_MS) return;
      this.#last.set(id, now);
      const gain =
        (typeof entry === "string" ? 1 : (entry.volume ?? 1)) * this.#volume;
      const at = ctx.currentTime + Math.max(0, delay) / 1000;
      void this.#load(id).then((buffer) => {
        if (!buffer) return;
        try {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const g = ctx.createGain();
          g.gain.value = gain;
          source.connect(g).connect(ctx.destination);
          source.start(Math.max(at, ctx.currentTime));
        } catch {
          /* playback failed: stay silent */
        }
      });
    } catch {
      /* never disturb the game */
    }
  }

  /** Resolves to null for cues without a file and for files that fail to load or decode (cached: asked once). */
  #load(id: SoundId): Promise<AudioBuffer | null> {
    let p = this.#buffers.get(id);
    if (p) return p;
    const entry = this.#deps.manifest[id];
    const ctx = this.#ctx;
    if (!entry || !ctx) return Promise.resolve(null);
    const file = typeof entry === "string" ? entry : entry.file;
    p = (async () => {
      try {
        const res = await this.#deps.fetch(this.#deps.base + file);
        if (!res.ok) return null;
        return await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    this.#buffers.set(id, p);
    return p;
  }

  #prefetch(): void {
    if (!this.#enabled || !this.#ctx) return;
    for (const id of Object.keys(this.#deps.manifest) as SoundId[]) {
      if (this.#deps.manifest[id]) void this.#load(id);
    }
  }
}

const ENABLED_KEY = "riichi:sound";
const VOLUME_KEY = "riichi:volume";
const DEFAULT_VOLUME = 70;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage unavailable: the setting lasts for this page */
  }
}

let shared: SoundPlayer | null = null;
let armed = false;

/** The page's player, with its settings from localStorage. */
export function sound(): SoundPlayer {
  if (shared) return shared;
  shared = new SoundPlayer({
    manifest: SOUNDS,
    base: "/audio/",
    createContext: () => {
      if (typeof window === "undefined") return null;
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      return Ctx ? new Ctx() : null;
    },
    fetch: (url) => fetch(url),
    now: () => performance.now(),
  });
  shared.setEnabled(read(ENABLED_KEY) !== "0");
  const v = Number(read(VOLUME_KEY) ?? DEFAULT_VOLUME);
  shared.setVolume((Number.isFinite(v) ? v : DEFAULT_VOLUME) / 100);
  return shared;
}

/** Call once at app start (root layout): the first pointer or key press anywhere on the site unlocks audio. */
export function armSound(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const p = sound();
  const unlock = () => p.unlock();
  for (const type of ["pointerdown", "keydown", "touchend"] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
  // Mobile browsers suspend the context in the background; the next gesture resumes it (iOS needs a gesture).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && p.unlocked) p.unlock();
  });
}

export function setSoundEnabled(on: boolean): void {
  sound().setEnabled(on);
  write(ENABLED_KEY, on ? "1" : "0");
}

/** 0..100 */
export function setSoundVolume(percent: number): void {
  sound().setVolume(percent / 100);
  write(VOLUME_KEY, String(Math.round(percent)));
}
