import { describe, expect, it } from 'vitest';
import type { BotSchedule } from '@mahjong/protocol';
import {
  intensity,
  localTime,
  meanSessionMin,
  onlineChance,
  parseSchedule,
  randomSchedule,
  sessionLength,
  sessionStartChance,
} from '../src/schedule.ts';
import { DEFAULT_BOT_SETTINGS } from '../src/settings.ts';
import { seeded } from './helpers.ts';

const evening: BotSchedule = {
  tz: 'Europe/Stockholm',
  weekday: [18 * 60, 24 * 60],
  weekend: [18 * 60, 24 * 60],
  appetiteMin: 90,
};
const SESSION: [number, number] = [20, 150];
/** 2026-10-07, a Wednesday, 00:00 UTC. */
const WED = Date.UTC(2026, 9, 7);
const H = 3_600_000;

/** Runs a bot's sessions minute by minute; returns minutes online per local hour and the start minutes of sessions. */
function simulate(s: BotSchedule, days: number, seed = 'sim') {
  const random = seeded(seed);
  const perHour = new Array(24).fill(0);
  const starts: number[] = [];
  let until = 0;
  let online = 0;
  for (let t = WED; t < WED + days * 24 * H; t += 60_000) {
    if (t >= until && random() < sessionStartChance(s, t, SESSION, 60_000)) {
      until = t + sessionLength(random, SESSION);
      starts.push(localTime(s.tz, t).minute);
    }
    if (t < until) {
      online++;
      perHour[Math.floor(localTime(s.tz, t).minute / 60)]++;
    }
  }
  return { perHour, starts, perDay: online / days };
}

describe('local time', () => {
  it('follows the zone, daylight saving included', () => {
    // 12:00 UTC on a Wednesday: 21:00 in Tokyo, 14:00 in Stockholm (summer time), 13:00 in Stockholm in winter.
    expect(localTime('Asia/Tokyo', WED + 12 * H)).toEqual({ day: 3, minute: 21 * 60 });
    expect(localTime('Europe/Stockholm', WED + 12 * H)).toEqual({ day: 3, minute: 14 * 60 });
    expect(localTime('Europe/Stockholm', Date.UTC(2026, 11, 2, 12))).toEqual({ day: 3, minute: 13 * 60 });
    // Midnight wraps the day.
    expect(localTime('America/New_York', WED + 2 * H)).toEqual({ day: 2, minute: 22 * 60 });
  });
});

describe('the daily curve', () => {
  it('peaks mid-window, is lower at the edges, spills a little outside and is near zero at night', () => {
    const at = (h: number) => intensity(evening, 3, h * 60);
    expect(at(21)).toBeCloseTo(1);
    expect(at(18.5)).toBeLessThan(at(21));
    expect(at(23.5)).toBeLessThan(at(21));
    expect(at(17.5)).toBeGreaterThan(0.05);
    expect(at(17.5)).toBeLessThan(at(18));
    expect(at(4)).toBeLessThan(0.01);
    expect(at(11)).toBeLessThan(0.01);
  });

  it('a window running past midnight carries on into the next day', () => {
    const late: BotSchedule = { ...evening, weekday: [22 * 60, 26 * 60], weekend: [22 * 60, 26 * 60] };
    expect(intensity(late, 4, 60)).toBeGreaterThan(0.5); // Thursday 01:00, in Wednesday's window
    expect(intensity(late, 4, 6 * 60)).toBeLessThan(0.05);
  });

  it('uses the weekend window on Saturdays and Sundays', () => {
    const s: BotSchedule = { ...evening, weekend: [12 * 60, 24 * 60] };
    expect(intensity(s, 6, 13 * 60)).toBeGreaterThan(0.3);
    expect(intensity(s, 0, 13 * 60)).toBeGreaterThan(0.3);
    expect(intensity(s, 3, 13 * 60)).toBeLessThan(0.01);
  });

  it('Japanese evening players are online at 12:00 UTC, European ones are not', () => {
    const tokyo = { ...evening, tz: 'Asia/Tokyo' };
    expect(onlineChance(tokyo, WED + 12 * H)).toBeGreaterThan(10 * onlineChance(evening, WED + 12 * H));
  });
});

describe('sessions', () => {
  it('online time per day is close to the appetite, and the bot is not online for the whole window', () => {
    const { perDay, perHour } = simulate(evening, 60);
    expect(perDay).toBeGreaterThan(90 * 0.75);
    expect(perDay).toBeLessThan(90 * 1.25);
    // The window is 360 min a day; the bot is online for a fraction of it.
    expect(perHour.slice(18).reduce((a, b) => a + b, 0) / 60).toBeLessThan(0.5 * 360);
  });

  it('a heavy player with a short window still gets about its appetite', () => {
    const heavy: BotSchedule = { ...evening, appetiteMin: 180 };
    const { perDay } = simulate(heavy, 60, 'heavy');
    expect(perDay).toBeGreaterThan(180 * 0.85);
    expect(perDay).toBeLessThan(180 * 1.15);
  });

  it('most playing happens mid-window; some spills outside it; almost none at night or during the day', () => {
    const { perHour, starts } = simulate(evening, 120, 'spill');
    expect(perHour[21]).toBeGreaterThan(perHour[18]);
    expect(perHour[21]).toBeGreaterThan(perHour[23]);
    const before = starts.filter((m) => m >= 16 * 60 && m < 18 * 60).length;
    expect(before).toBeGreaterThan(0);
    // Sessions starting late in the window run past midnight.
    expect(perHour[0]).toBeGreaterThan(0);
    const night = starts.filter((m) => m >= 3 * 60 && m < 7 * 60).length;
    const work = starts.filter((m) => m >= 9 * 60 && m < 15 * 60).length;
    expect(night + work).toBeLessThan(starts.length * 0.03);
  });

  it('session lengths stay in range with the expected mean', () => {
    const random = seeded('len');
    const lens = Array.from({ length: 4000 }, () => sessionLength(random, SESSION) / 60_000);
    expect(Math.min(...lens)).toBeGreaterThanOrEqual(20);
    expect(Math.max(...lens)).toBeLessThanOrEqual(150);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    expect(Math.abs(mean - meanSessionMin(SESSION))).toBeLessThan(3);
  });
});

describe('new schedules', () => {
  it('spread over the region mix with Japan the largest share, varied windows, appetite in range', () => {
    const random = seeded('regions');
    const all = Array.from({ length: 2000 }, () => randomSchedule(random, DEFAULT_BOT_SETTINGS));
    const share = (tz: string) => all.filter((s) => s.tz === tz).length / all.length;
    const zones = new Set(all.map((s) => s.tz));
    expect(zones.size).toBeGreaterThanOrEqual(6);
    for (const tz of zones) if (tz !== 'Asia/Tokyo') expect(share('Asia/Tokyo')).toBeGreaterThan(share(tz));
    expect(share('Asia/Tokyo')).toBeGreaterThan(0.45);
    expect(new Set(all.map((s) => s.weekday[0])).size).toBeGreaterThan(10);
    const [lo, hi] = DEFAULT_BOT_SETTINGS.appetiteMin;
    for (const s of all) {
      expect(s.appetiteMin).toBeGreaterThanOrEqual(lo);
      expect(s.appetiteMin).toBeLessThanOrEqual(hi);
      expect(s.weekend[0]).toBeLessThanOrEqual(s.weekday[0]);
      expect(s.weekend[1]).toBeGreaterThanOrEqual(s.weekday[1]);
      expect(parseSchedule(JSON.parse(JSON.stringify(s)))).toEqual(s);
    }
    // Skewed low: most bots play less than the middle of the range.
    expect(all.filter((s) => s.appetiteMin < (lo + hi) / 2).length / all.length).toBeGreaterThan(0.6);
  });

  it('rejects stored values that are not a schedule', () => {
    expect(parseSchedule(null)).toBeNull();
    expect(parseSchedule({ ...evening, tz: 'Mars/Olympus' })).toBeNull();
    expect(parseSchedule({ ...evening, weekday: [600, 500] })).toBeNull();
    expect(parseSchedule({ ...evening, appetiteMin: -1 })).toBeNull();
    expect(parseSchedule(evening)).toEqual(evening);
  });
});
