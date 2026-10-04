import { describe, expect, it } from 'vitest';
import { botTarget, pickVoters, utcDate } from '../src/daily-discard.ts';
import { JOBS } from '../src/jobs.ts';
import cron from 'node-cron';
import { seeded } from './helpers.ts';

describe('daily discard bot votes', () => {
  const ids = Array.from({ length: 100 }, (_, i) => `b${i}`);

  it('never picks more than needed', () => {
    expect(pickVoters(ids, 3, 1, seeded('a'))).toEqual(['b0', 'b1', 'b2']);
    expect(pickVoters(ids, 0, 1, seeded('a'))).toEqual([]);
  });

  it('spreads votes: each candidate votes with the chance per run', () => {
    const picked = pickVoters(ids, 100, 0.2, seeded('spread'));
    expect(picked.length).toBeGreaterThan(8);
    expect(picked.length).toBeLessThan(35);
  });

  it('targets the share of the bot players for the day, paced over the UTC day', () => {
    const midnight = Date.UTC(2026, 9, 4);
    expect(botTarget(0.6, 100, midnight)).toBe(0);
    expect(botTarget(0.6, 100, midnight + 12 * 3_600_000)).toBe(30);
    expect(botTarget(0.6, 100, midnight + 86_400_000 - 1)).toBe(59);
    expect(botTarget(0.6, 0, midnight + 12 * 3_600_000)).toBe(0);
  });

  it('dates days in UTC', () => {
    const late = Date.UTC(2026, 9, 4, 23, 59);
    expect(utcDate(late)).toBe('2026-10-04');
    expect(utcDate(late, 1)).toBe('2026-10-05');
  });

  it('schedules only valid cron expressions', () => {
    for (const j of JOBS) expect(cron.validate(j.cron), j.name).toBe(true);
  });
});
