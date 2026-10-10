import { fail } from '@sveltejs/kit';
import type { AdminBot, AdminPoolSnapshot, BotSettings } from '@mahjong/protocol';
import { internalApi, requireAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals);
  const r = await internalApi<AdminPoolSnapshot>('GET', '/bots');
  return r.ok
    ? { pool: r.data, error: null, loadedAt: Date.now() }
    : { pool: null, error: r.error, loadedAt: Date.now() };
};

const num = (v: FormDataEntryValue | null): number | undefined => {
  if (v === null || String(v).trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
/** Form fields in seconds → ms. */
const ms = (v: FormDataEntryValue | null): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n * 1000);
};

const SECONDS = [
  'backgroundEveryMs',
  'warmupEveryMs',
  'growAfterMs',
  'thinkTurnMs',
  'thinkPerTileMs',
  'joinMedianMs',
  'joinMinMs',
  'readyMedianMs',
  'readyMinMs',
  'readySlowFromMs',
] as const;
const RANGES = ['summonAfterMs', 'botArrivalMs', 'botRestMs', 'thinkForcedMs', 'thinkCallMs'] as const;
/** Ranges entered in minutes, sent as is. */
const MINUTE_RANGES = ['appetiteMin', 'sessionMin'] as const;

/** One region per line: `Asia/Tokyo 55`. Unparseable lines are sent as they are, for the game server to reject. */
function regions(v: FormDataEntryValue | null): BotSettings['regions'] | undefined {
  const lines = String(v ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  return lines.map((l) => {
    const [tz, weight] = l.split(/\s+/);
    return { tz, weight: num(weight ?? null) ?? NaN };
  });
}
const COUNTS = ['botPoolMin', 'botPoolMax', 'idleReserve', 'warmupTables'] as const;
/** Plain numbers (multipliers, percents). */
const NUMBERS = [
  'thinkScale',
  'thinkSpecialScale',
  'thinkOpeningScale',
  'longThinkPercent',
  'readySlowPercent',
  'timeoutPercent',
] as const;

export const actions: Actions = {
  settings: async ({ locals, request }) => {
    requireAdmin(locals);
    const f = await request.formData();
    const patch: Partial<BotSettings> = {
      backgroundEnabled: f.get('backgroundEnabled') === 'on',
      schedulesEnabled: f.get('schedulesEnabled') === 'on',
    };
    const r0 = regions(f.get('regions'));
    if (r0) patch.regions = r0;
    for (const k of MINUTE_RANGES) {
      const lo = num(f.get(`${k}.lo`));
      const hi = num(f.get(`${k}.hi`));
      if (lo !== undefined && hi !== undefined) patch[k] = [lo, hi];
    }
    for (const k of [...COUNTS, ...NUMBERS]) {
      const v = num(f.get(k));
      if (v !== undefined) patch[k] = v;
    }
    for (const k of SECONDS) {
      const v = ms(f.get(k));
      if (v !== undefined) patch[k] = v;
    }
    for (const k of RANGES) {
      const lo = ms(f.get(`${k}.lo`));
      const hi = ms(f.get(`${k}.hi`));
      if (lo !== undefined && hi !== undefined) patch[k] = [lo, hi];
    }
    const r = await internalApi<{ settings: BotSettings }>('PUT', '/settings', patch);
    if (!r.ok) return fail(400, { form: 'settings', error: r.error });
    return { form: 'settings', ok: 'Saved' };
  },

  create: async ({ locals, request }) => {
    requireAdmin(locals);
    const f = await request.formData();
    const count = num(f.get('count'));
    const body =
      count !== undefined
        ? { count, minRating: num(f.get('minRating')), maxRating: num(f.get('maxRating')) }
        : { name: String(f.get('name') ?? '').trim() || undefined, skill: num(f.get('skill')) };
    const r = await internalApi<{ created: AdminBot[] }>('POST', '/bots', body);
    if (!r.ok) return fail(400, { form: 'create', error: r.error });
    const n = r.data.created.length;
    return { form: 'create', ok: n === 1 ? `Created ${r.data.created[0].name}` : `Created ${n} bots` };
  },

  update: async ({ locals, request }) => {
    requireAdmin(locals);
    const f = await request.formData();
    const id = String(f.get('id') ?? '');
    const patch: { name?: string; skill?: number; active?: boolean } = {};
    const name = String(f.get('name') ?? '').trim();
    if (name) patch.name = name;
    const skill = num(f.get('skill'));
    if (skill !== undefined) patch.skill = skill;
    if (f.has('active')) patch.active = f.get('active') === 'true';
    const r = await internalApi<{ ok: true }>('PATCH', `/bots/${encodeURIComponent(id)}`, patch);
    if (!r.ok) return fail(400, { form: 'update', id, error: r.error });
    return { form: 'update', id, ok: 'Saved' };
  },
};
