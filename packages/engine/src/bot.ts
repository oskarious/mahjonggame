import {
  type Kind,
  type Tile,
  EAST,
  doraFromIndicator,
  isDragon,
  isHonor,
  isRedTile,
  isSimple,
  isTerminalOrHonor,
  kindOf,
  suitOf,
} from './tiles.ts';
import { countKinds, distinctTerminalsAndHonors, kokushiShanten, shanten } from './hand.ts';
import { type Action, type GameState, legalActions, seatWindOf } from './game.ts';
import { type DiscardOption, analyzeDiscards, unseenCounts } from './analysis.ts';
import type { Meld, Seat } from './types.ts';
import { BOT_RATINGS } from './bot-ratings.ts';

// ---------------------------------------------------------------------------
// Profiles

/**
 * How a bot plays. Every knob gets worse towards skill 0; `botProfile(skill)` interpolates them,
 * and the calibration script measures the Elo each skill level actually plays at.
 */
export interface BotProfile {
  skill: number;
  /** Chance per discard of throwing a random legal tile. */
  blunderRate: number;
  /** Softmax temperature over discard scores; 0 always plays the best-scored tile. */
  noise: number;
  /** Look at tile acceptance (ukeire), not only shanten. */
  useUkeire: boolean;
  /** 0-1: weight on keeping dora, red fives and value honours, and steering towards yaku. */
  valueAware: number;
  /** 0-1: how much discard danger counts against opponents' threats. */
  defense: number;
  /** Use suji and walls (no-chance tiles) when judging danger, not just genbutsu. */
  reading: boolean;
  /** Weigh own hand value and shape when deciding to push or fold, instead of folding only when far. */
  pushFold: boolean;
  /** Treat open hands with several calls as threats, not just riichi. */
  readOpenHands: boolean;
  /** none: never calls. yakuhai: pons value honours. smart: calls that speed up a hand with a guaranteed yaku. */
  callStyle: 'none' | 'yakuhai' | 'smart';
  /** always: riichi whenever possible. smart: stays silent with valuable hands that already have a yaku. */
  riichiStyle: 'always' | 'smart';
  /** Declare concealed/extended quads when they don't hurt the hand. */
  kans: boolean;
  /** Plays more safely when leading in the last hand. */
  placementAware: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Profile for a skill level between 0 (beginner) and 1 (strongest the heuristics get). */
export function botProfile(skill: number): BotProfile {
  const s = clamp01(skill);
  const ramp = (from: number, to: number) => clamp01((s - from) / (to - from));
  return {
    skill: s,
    blunderRate: 0.3 * (1 - ramp(0, 0.5)),
    noise: 2.5 * (1 - ramp(0, 0.85)),
    useUkeire: s >= 0.15,
    valueAware: ramp(0.3, 0.8),
    defense: ramp(0.15, 0.7),
    reading: s >= 0.55,
    pushFold: s >= 0.4,
    readOpenHands: s >= 0.75,
    callStyle: s < 0.2 ? 'none' : s < 0.55 ? 'yakuhai' : 'smart',
    riichiStyle: s < 0.65 ? 'always' : 'smart',
    kans: s >= 0.5,
    placementAware: s >= 0.8,
  };
}

// ---------------------------------------------------------------------------
// Ratings: measured by scripts/calibrate.ts

/** The measured table, made non-decreasing (neighbouring levels can swap by noise). */
const CURVE = (() => {
  let best = -Infinity;
  return [...BOT_RATINGS]
    .sort((a, b) => a.skill - b.skill)
    .map((r) => ({ skill: r.skill, elo: (best = Math.max(best, r.elo)) }));
})();

/** Elo range the bots cover, weakest to strongest. */
export const BOT_ELO_RANGE: [number, number] = [CURVE[0].elo, CURVE[CURVE.length - 1].elo];

/** Measured playing strength of a skill level. */
export function botElo(skill: number): number {
  const s = clamp01(skill);
  for (let i = 1; i < CURVE.length; i++) {
    const a = CURVE[i - 1];
    const b = CURVE[i];
    if (s <= b.skill) return a.elo + ((s - a.skill) / (b.skill - a.skill)) * (b.elo - a.elo);
  }
  return CURVE[CURVE.length - 1].elo;
}

/** Skill level that plays at roughly this Elo (clamped to what the bots can do). */
export function skillForElo(elo: number): number {
  if (elo <= CURVE[0].elo) return CURVE[0].skill;
  for (let i = 1; i < CURVE.length; i++) {
    const a = CURVE[i - 1];
    const b = CURVE[i];
    if (elo <= b.elo)
      return b.elo === a.elo ? a.skill : a.skill + ((elo - a.elo) / (b.elo - a.elo)) * (b.skill - a.skill);
  }
  return CURVE[CURVE.length - 1].skill;
}

export interface BotOptions {
  /** 0 (beginner) to 1 (strongest). Default 0.6. Ignored when `profile` is given. */
  skill?: number;
  profile?: BotProfile;
  /** Source of randomness (0 <= x < 1) for noise and blunders. */
  random?: () => number;
}

// ---------------------------------------------------------------------------
// Entry point

export function botAction(g: GameState, seat: Seat, opts: BotOptions = {}): Action | null {
  const prof = opts.profile ?? botProfile(opts.skill ?? 0.6);
  const random = opts.random ?? Math.random;
  const legal = legalActions(g, seat);
  if (!legal.length) return null;
  const find = <T extends Action['type']>(type: T) =>
    legal.find((a): a is Extract<Action, { type: T }> => a.type === type);

  // Winning is always right for these bots.
  const win = find('tsumo') ?? find('ron');
  if (win) return win;

  const ctx = new Context(g, seat, prof);
  if (g.hand.step.type !== 'turn') return ctx.respond(legal) ?? find('pass')!;

  const kyuushu = find('kyuushu');
  if (kyuushu && ctx.wantsAbort()) return kyuushu;

  const kan = legal.find((a): a is Extract<Action, { type: 'kan' }> => a.type === 'kan' && ctx.wantsKan(a.kind));
  if (kan) return kan;

  return ctx.discard(legal, random);
}

// ---------------------------------------------------------------------------

interface Threat {
  seat: Seat;
  /** 1 for riichi, less for open hands that look close and valuable. */
  level: number;
}

class Context {
  readonly g: GameState;
  readonly seat: Seat;
  readonly prof: BotProfile;
  readonly unseen: number[];
  readonly doraKinds: Kind[];
  readonly threats: Threat[];

  constructor(g: GameState, seat: Seat, prof: BotProfile) {
    this.g = g;
    this.seat = seat;
    this.prof = prof;
    this.unseen = unseenCounts(g, seat);
    const h = g.hand;
    this.doraKinds = h.doraIndicators.slice(0, h.doraRevealed).map((t) => doraFromIndicator(kindOf(t)));
    this.threats = this.findThreats();
  }

  get me() {
    return this.g.hand.players[this.seat];
  }

  isValueHonor(k: Kind): boolean {
    return isDragon(k) || k === EAST + this.g.roundWind || k === EAST + seatWindOf(this.g, this.seat);
  }

  private findThreats(): Threat[] {
    const out: Threat[] = [];
    this.g.hand.players.forEach((p, s) => {
      if (s === this.seat) return;
      if (p.riichi) out.push({ seat: s, level: 1 });
      else if (this.prof.readOpenHands && p.melds.length >= 3) out.push({ seat: s, level: 0.7 });
      else if (this.prof.readOpenHands && p.melds.length === 2 && p.melds.some((m) => this.meldLooksValuable(m, s))) {
        out.push({ seat: s, level: 0.4 });
      }
    });
    return out;
  }

  private meldLooksValuable(m: Meld, owner: Seat): boolean {
    const k = kindOf(m.tiles[0]);
    const valueForOwner = isDragon(k) || k === EAST + this.g.roundWind || k === EAST + seatWindOf(this.g, owner);
    return (m.type !== 'chii' && valueForOwner) || m.tiles.some((t) => this.doraKinds.includes(kindOf(t)));
  }

  /** Rough han the own hand is heading for: dora, red fives, value triplets, riichi, all simples. */
  estimateValue(): number {
    const p = this.me;
    const tiles = [...p.hand, ...p.melds.flatMap((m) => m.tiles)];
    let han = 0;
    for (const d of this.doraKinds) han += tiles.filter((t) => kindOf(t) === d).length;
    han += tiles.filter((t) => isRedTile(t, this.g.rules.redFives)).length;
    const c = countKinds(tiles);
    for (let k = 27; k < 34; k++) if (c[k] >= 3 && this.isValueHonor(k)) han++;
    const closed = p.melds.every((m) => m.type === 'ankan');
    if (closed) han++;
    if (tiles.every((t) => isSimple(kindOf(t)))) han++;
    return han;
  }

  // --- Defense ---------------------------------------------------------------

  /** 0 (safe) to 1 (very dangerous) against one opponent. */
  danger(kind: Kind, threat: Seat): number {
    const t = this.g.hand.players[threat];
    const discarded = (k: Kind) => t.discards.some((d) => kindOf(d.tile) === k);
    // Genbutsu: they can't ron a tile they discarded themselves (furiten).
    if (discarded(kind)) return 0;
    if (isHonor(kind)) {
      const visible = 4 - this.unseen[kind];
      return [0.5, 0.35, 0.12, 0.02, 0][visible] ?? 0;
    }
    const r = kind % 9;
    let d = [0.3, 0.45, 0.55, 0.75, 0.8, 0.75, 0.55, 0.45, 0.3][r];
    if (this.prof.reading) {
      const base = kind - r;
      const inSuit = (n: number) => n >= 0 && n <= 8;
      const gone = (n: number) => !inSuit(n) || this.unseen[base + n] === 0;
      // A two-sided wait on this tile also wins on the tile three away (suji); if they discarded
      // that one, the wait would be furiten. A fully visible neighbour makes the wait impossible (wall).
      const lowSafe = !inSuit(r - 3) || discarded(base + r - 3) || gone(r - 1);
      const highSafe = !inSuit(r + 3) || discarded(base + r + 3) || gone(r + 1);
      if (lowSafe && highSafe) d *= 0.35;
      else if (lowSafe || highSafe) d *= 0.7;
    }
    return d;
  }

  threatDanger(kind: Kind): number {
    let worst = 0;
    for (const t of this.threats) worst = Math.max(worst, t.level * this.danger(kind, t.seat));
    return worst;
  }

  /** How much danger counts against efficiency: 0 = ignore, ~4 = full fold. */
  defenseWeight(best: DiscardOption): number {
    if (!this.threats.length || this.prof.defense === 0) return 0;
    const threat = Math.max(...this.threats.map((t) => t.level));
    const value = this.estimateValue();
    let base: number;
    if (!this.prof.pushFold) base = best.shanten >= 2 ? 4 : 0;
    else if (best.shanten === 0) base = value >= 3 || best.total >= 5 ? 0.15 : 0.6;
    else if (best.shanten === 1) base = value >= 4 ? 0.8 : 2.5;
    else base = 4;
    if (this.prof.placementAware && this.isAllLast() && this.isLeading()) base *= 1.5;
    return base * this.prof.defense * threat;
  }

  private isAllLast(): boolean {
    const last = this.g.rules.length === 'east' ? 0 : 1;
    return this.g.roundWind >= last && this.g.dealer === 3;
  }

  private isLeading(): boolean {
    const mine = this.g.scores[this.seat];
    return this.g.scores.every((s, i) => i === this.seat || s < mine);
  }

  // --- Discards ----------------------------------------------------------------

  /** Value lost by throwing a tile of this kind (dora, red fives, value-honour pairs). */
  private valueLoss(kind: Kind, tile: Tile): number {
    let loss = 0;
    for (const d of this.doraKinds) if (d === kind) loss += 10;
    if (isRedTile(tile, this.g.rules.redFives)) loss += 10;
    const count = this.me.hand.filter((t) => kindOf(t) === kind).length;
    if (isHonor(kind) && this.isValueHonor(kind) && count >= 2) loss += 12;
    return loss;
  }

  /** Bonus for throwing tiles that don't fit the hand's direction (all simples, half flush). */
  private directionBonus(kind: Kind): number {
    const p = this.me;
    const tiles = [...p.hand, ...p.melds.flatMap((m) => m.tiles)].map(kindOf);
    const outside = tiles.filter(isTerminalOrHonor).length;
    let bonus = 0;
    if (this.g.rules.openTanyao && outside <= 3 && p.melds.every((m) => m.tiles.every((t) => isSimple(kindOf(t))))) {
      if (isTerminalOrHonor(kind)) bonus += 6;
    }
    const bySuit = [0, 0, 0];
    for (const k of tiles) if (k < 27) bySuit[suitOf(k)]++;
    const main = bySuit.indexOf(Math.max(...bySuit));
    const honors = tiles.filter(isHonor).length;
    if (bySuit[main] + honors >= 10 && kind < 27 && suitOf(kind) !== main) bonus += 8;
    return bonus;
  }

  /** Small tie-breaks: isolated honours, then terminals, go first. */
  private shapeTieBreak(kind: Kind): number {
    const c = countKinds(this.me.hand);
    if (isHonor(kind)) return c[kind] === 1 && !this.isValueHonor(kind) ? 3 : c[kind] === 1 ? 2 : 0;
    const r = kind % 9;
    const near = (d: number) => (r + d >= 0 && r + d <= 8 ? c[kind + d] : 0);
    const isolated = c[kind] === 1 && !near(-2) && !near(-1) && !near(1) && !near(2);
    return (isolated ? 2 : 0) + (r === 0 || r === 8 ? 1 : 0);
  }

  discard(legal: Action[], random: () => number): Action {
    const prof = this.prof;
    const p = this.me;
    const discards = legal.filter((a): a is Extract<Action, { type: 'discard' }> => a.type === 'discard');
    const plain = discards.filter((a) => !a.riichi);
    if (plain.length === 1) return this.maybeRiichi(plain[0], discards, null);

    if (random() < prof.blunderRate) return plain[Math.floor(random() * plain.length)];

    const options = analyzeDiscards(
      p.hand,
      p.melds,
      this.unseen,
      p.discards.map((d) => kindOf(d.tile)),
    );
    const byKind = new Map(options.map((o) => [o.kind, o]));
    const best = options[0];
    const w = this.defenseWeight(best);

    // One candidate per kind (prefer the drawn copy, then a non-red one).
    const candidates = new Map<Kind, Extract<Action, { type: 'discard' }>>();
    for (const a of plain) {
      const k = kindOf(a.tile);
      const cur = candidates.get(k);
      const better =
        !cur ||
        a.tile === p.drawn ||
        (cur.tile !== p.drawn &&
          isRedTile(cur.tile, this.g.rules.redFives) &&
          !isRedTile(a.tile, this.g.rules.redFives));
      if (better) candidates.set(k, a);
    }

    const scored = [...candidates.entries()].map(([kind, action]) => {
      const o = byKind.get(kind)!;
      let score = -o.shanten * 100;
      if (prof.useUkeire) score += Math.min(o.total, 60) * 1.2;
      if (o.furiten) score -= 8 * prof.valueAware;
      score += this.shapeTieBreak(kind);
      if (prof.valueAware > 0) {
        score -= prof.valueAware * this.valueLoss(kind, action.tile);
        score += prof.valueAware * this.directionBonus(kind);
      }
      if (w > 0) score -= w * this.threatDanger(kind) * 100;
      return { action, option: o, score };
    });

    const chosen = pickSoftmax(scored, prof.noise * 10, random);
    return this.maybeRiichi(chosen.action, discards, chosen.option);
  }

  private maybeRiichi(
    choice: Extract<Action, { type: 'discard' }>,
    discards: Extract<Action, { type: 'discard' }>[],
    option: DiscardOption | null,
  ): Action {
    const riichi = discards.find((a) => a.riichi && a.tile === choice.tile);
    if (!riichi) return choice;
    if (this.prof.riichiStyle === 'always') return riichi;
    // Smart: stay silent when the hand already has a yaku and is worth enough without riichi.
    const value = this.estimateValue() - 1; // estimateValue counts riichi for closed hands
    if (this.hasYakuWithoutRiichi(choice.tile) && value >= 3) return choice;
    if (option && option.total <= 2 && this.hasYakuWithoutRiichi(choice.tile) && this.g.hand.wall.length < 12) {
      return choice;
    }
    return riichi;
  }

  /** Cheap check for a yaku that doesn't depend on riichi: value triplet or all simples. */
  private hasYakuWithoutRiichi(discard: Tile): boolean {
    const rest = this.me.hand.filter((t) => t !== discard);
    const c = countKinds(rest);
    for (let k = 27; k < 34; k++) if (c[k] >= 3 && this.isValueHonor(k)) return true;
    return rest.every((t) => isSimple(kindOf(t)));
  }

  // --- Other turn decisions ------------------------------------------------------------

  wantsAbort(): boolean {
    // Strong bots keep hands with a real shot at thirteen orphans.
    const tiles = this.me.hand;
    return !(
      this.prof.skill >= 0.6 &&
      distinctTerminalsAndHonors(tiles) >= 11 &&
      kokushiShanten(countKinds(tiles)) <= 2
    );
  }

  wantsKan(kind: Kind): boolean {
    if (!this.prof.kans || this.threats.length) return false;
    const p = this.me;
    const before = Math.min(...analyzeDiscards(p.hand, p.melds, this.unseen).map((o) => o.shanten));
    const rest = p.hand.filter((t) => kindOf(t) !== kind);
    // A concealed quad adds a meld; an extended quad upgrades an existing pon.
    const concealed = p.hand.length - rest.length === 4;
    const after = shanten(countKinds(rest), p.melds.length + (concealed ? 1 : 0));
    return after <= before;
  }

  // --- Calls -------------------------------------------------------------------------

  respond(legal: Action[]): Action | null {
    const prof = this.prof;
    if (prof.callStyle === 'none') return null;
    const p = this.me;
    const now = shanten(countKinds(p.hand), p.melds.length);
    // Don't open up while folding.
    if (this.threats.length && this.prof.defense > 0.3 && now >= 2) return null;

    let best: { action: Action; after: number } | null = null;
    for (const a of legal) {
      if (a.type !== 'pon' && a.type !== 'chii') continue;
      const step = this.g.hand.step;
      if (step.type !== 'calls') continue;
      const called = step.tile;
      const kind = kindOf(called);
      const rest = p.hand.filter((t) => !a.tiles.includes(t));
      const meld: Meld = { type: a.type, tiles: [...a.tiles, called], called, from: step.seat };
      const melds = [...p.melds, meld];
      const after = Math.min(...analyzeDiscards(rest, melds, this.unseen).map((o) => o.shanten));

      if (a.type === 'pon' && this.isValueHonor(kind)) {
        // Value honours are a yaku by themselves; take them unless the hand is hopeless.
        if (after <= now && now <= 4) return a;
        continue;
      }
      if (prof.callStyle !== 'smart' || after >= now || after > 2) continue;
      if (!this.guaranteedYaku(rest, melds)) continue;
      if (!best || after < best.after) best = { action: a, after };
    }
    return best?.action ?? null;
  }

  /** After a call: does the hand keep a yaku it can't lose? */
  private guaranteedYaku(hand: Tile[], melds: Meld[]): boolean {
    if (melds.some((m) => m.type !== 'chii' && this.isValueHonor(kindOf(m.tiles[0])))) return true;
    const meldKinds = melds.flatMap((m) => m.tiles.map(kindOf));
    const handKinds = hand.map(kindOf);
    // All simples: melds all simple and at most one outside tile left to throw.
    if (this.g.rules.openTanyao && meldKinds.every(isSimple) && handKinds.filter(isTerminalOrHonor).length <= 1) {
      return true;
    }
    // Half/full flush: every meld in one suit (or honours) and at most one off-suit tile in hand.
    const suits = new Set(meldKinds.filter((k) => k < 27).map(suitOf));
    if (suits.size === 1) {
      const suit = [...suits][0];
      const off = handKinds.filter((k) => k < 27 && suitOf(k) !== suit).length;
      if (off <= 1) return true;
    }
    return false;
  }
}

function pickSoftmax<T extends { score: number }>(items: T[], temperature: number, random: () => number): T {
  let best = items[0];
  for (const it of items) if (it.score > best.score) best = it;
  if (temperature <= 0 || items.length === 1) return best;
  const weights = items.map((it) => Math.exp((it.score - best.score) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = random() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return best;
}
