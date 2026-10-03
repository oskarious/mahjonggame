// Bot schedules: where a bot lives and when it tends to play. A bot is online only in sessions; the chance of being
// online follows a daily curve in its local time that peaks mid-window, tails off before and after the window and is
// near zero at night. Pure functions of (schedule, instant); the pool (bots.ts) owns the sessions.
import type { BotRegion, BotSchedule, BotSettings } from '@mahjong/protocol';

const DAY_MIN = 1440;
/** Curve value at a window's edges (its middle is 1). */
const EDGE = 0.35;
/** Outside a window the curve decays from the edge value with this scale (minutes): the spill. */
const SPILL_MIN = 45;
/** Lowest value anywhere: a rare session at an odd hour. */
const FLOOR = 0.005;
/** Never aim for a bot being online more than this share of the time, however high its curve. */
const MAX_ONLINE = 0.95;

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' });
    formatters.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** Local weekday (0 = Sunday) and minutes after local midnight in `tz` at `ms`. */
export function localTime(tz: string, ms: number): { day: number; minute: number } {
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const p of formatter(tz).formatToParts(ms)) {
    if (p.type === 'weekday') day = WEEKDAYS[p.value] ?? 0;
    else if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
  }
  return { day, minute: hour * 60 + minute };
}

function windowFor(s: BotSchedule, day: number): [number, number] {
  const d = ((day % 7) + 7) % 7;
  return d === 0 || d === 6 ? s.weekend : s.weekday;
}

/**
 * The daily curve at a local weekday and minute, 0..1: a bump inside the window (1 in the middle, EDGE at the edges),
 * exponential spill outside, FLOOR otherwise. Windows of the day before and after count too (late nights, early
 * spill), so a window running past midnight carries on into the next day.
 */
export function intensity(s: BotSchedule, day: number, minute: number): number {
  let best = FLOOR;
  for (let k = -1; k <= 1; k++) {
    const [start, end] = windowFor(s, day + k);
    const from = start + k * DAY_MIN;
    const to = end + k * DAY_MIN;
    let v: number;
    if (minute >= from && minute <= to) {
      const x = to > from ? (minute - from) / (to - from) : 0.5;
      v = EDGE + (1 - EDGE) * Math.sin(Math.PI * x);
    } else {
      v = EDGE * Math.exp(-(minute < from ? from - minute : minute - to) / SPILL_MIN);
    }
    if (v > best) best = v;
  }
  return best;
}

const dailyMeans = new WeakMap<BotSchedule, number>();

/** The curve's average over a week, per day (curve-minutes per day). Cached per schedule object. */
function dailyIntegral(s: BotSchedule): number {
  let v = dailyMeans.get(s);
  if (v === undefined) {
    const step = 5;
    let sum = 0;
    for (let day = 0; day < 7; day++) for (let m = 0; m < DAY_MIN; m += step) sum += intensity(s, day, m) * step;
    v = sum / 7;
    dailyMeans.set(s, v);
  }
  return v;
}

/** Mean of a log-uniform session length over [lo, hi] minutes. */
export function meanSessionMin([lo, hi]: [number, number]): number {
  if (hi <= lo || lo <= 0) return Math.max(lo, hi, 1);
  return (hi - lo) / Math.log(hi / lo);
}

/**
 * The share of time this bot should be online at `ms`: its appetite spread over the day in proportion to the curve.
 * Also the chance that a bot is mid-session at a random moment (used to seed sessions on startup).
 */
export function onlineChance(s: BotSchedule, ms: number): number {
  const { day, minute } = localTime(s.tz, ms);
  return Math.min(MAX_ONLINE, (s.appetiteMin * intensity(s, day, minute)) / dailyIntegral(s));
}

/**
 * Chance that an offline bot starts a session within the next `dtMs`. Chosen so that, with sessions of the given mean
 * length, the bot is online about `onlineChance` of the time (starts happen only while offline).
 */
export function sessionStartChance(s: BotSchedule, ms: number, sessionMin: [number, number], dtMs: number): number {
  const g = onlineChance(s, ms);
  const perMin = g / (meanSessionMin(sessionMin) * (1 - g));
  return 1 - Math.exp((-perMin * dtMs) / 60_000);
}

/** A session length in ms, log-uniform over the range (many short sessions, some long). */
export function sessionLength(random: () => number, [lo, hi]: [number, number]): number {
  const min = lo > 0 && hi > lo ? lo * (hi / lo) ** random() : Math.max(lo, hi, 1);
  return Math.round(min * 60_000);
}

function pickRegion(random: () => number, regions: BotRegion[]): string {
  const valid = regions.filter((r) => r.weight > 0 && isValidTimeZone(r.tz));
  if (!valid.length) return 'Asia/Tokyo';
  let x = random() * valid.reduce((a, r) => a + r.weight, 0);
  for (const r of valid) {
    x -= r.weight;
    if (x < 0) return r.tz;
  }
  return valid[valid.length - 1].tz;
}

/** Random minutes in [lo, hi), on a quarter hour. */
function quarter(random: () => number, lo: number, hi: number): number {
  return lo + Math.floor((random() * (hi - lo)) / 15) * 15;
}

/**
 * A new bot's habits: a home zone from the region mix, a weekday window (mostly evenings; some late-night or daytime
 * players) and a weekend window that starts earlier and may run later, and an appetite skewed towards the low end.
 */
export function randomSchedule(random: () => number, s: Pick<BotSettings, 'regions' | 'appetiteMin'>): BotSchedule {
  const tz = pickRegion(random, s.regions);
  const kind = random();
  let start: number;
  let length: number;
  if (kind < 0.6) {
    start = quarter(random, 17 * 60, 20 * 60); // after work or school
    length = quarter(random, 4 * 60, 7 * 60);
  } else if (kind < 0.8) {
    start = quarter(random, 21 * 60, 23 * 60); // night owls, past midnight
    length = quarter(random, 3 * 60, 5 * 60);
  } else {
    start = quarter(random, 9 * 60, 14 * 60); // students, shift workers, retired
    length = quarter(random, 4 * 60, 8 * 60);
  }
  const end = start + length;
  const weekendStart = Math.max(8 * 60, start - quarter(random, 0, 5 * 60));
  const weekendEnd = end + quarter(random, 0, 90);
  const [lo, hi] = s.appetiteMin;
  const appetiteMin = Math.round(lo + (hi - lo) * random() ** 2);
  return { tz, weekday: [start, end], weekend: [weekendStart, weekendEnd], appetiteMin };
}

/** A stored schedule as read back (JSON); null if it is not one, so the pool generates a new one. */
export function parseSchedule(v: unknown): BotSchedule | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const win = (w: unknown): w is [number, number] =>
    Array.isArray(w) && w.length === 2 && w.every((x) => Number.isFinite(x)) && w[0] >= 0 && w[0] < DAY_MIN && w[1] >= w[0] && w[1] < 2 * DAY_MIN;
  if (!isValidTimeZone(o.tz) || !win(o.weekday) || !win(o.weekend)) return null;
  if (typeof o.appetiteMin !== 'number' || !(o.appetiteMin >= 0 && o.appetiteMin <= DAY_MIN)) return null;
  return { tz: o.tz, weekday: [o.weekday[0], o.weekday[1]], weekend: [o.weekend[0], o.weekend[1]], appetiteMin: o.appetiteMin };
}
