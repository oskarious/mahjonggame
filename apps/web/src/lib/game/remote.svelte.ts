import { type Action, DEFAULT_RULES, type FinalStanding, type HintLevel, type PlayerView, type RedFives } from '@mahjong/engine';
import {
  type ClientMessage,
  type Format,
  type GameInfo,
  PROTOCOL_VERSION,
  type RatingChange,
  type RatingInfo,
  type ServerMessage,
} from '@mahjong/protocol';
import type { GameSource } from './source';

export type RemoteStatus =
  /** Socket not open yet (first connection or reconnecting). */
  | 'connecting'
  /** Connected, nothing going on. */
  | 'idle'
  | 'queued'
  | 'playing'
  /** The game is over; `view.final` and `end` are set. */
  | 'ended'
  /** Another tab or device took the seat; this instance stays quiet. */
  | 'takenOver'
  /** Server shutting down or unreachable; reconnecting with backoff. */
  | 'offline';

/**
 * A game played on the game server over the same-origin /ws socket. The server holds the state; this client only
 * keeps the latest view and the pending decision's deadline, and reconnects by itself.
 */
export class RemoteGame implements GameSource {
  status: RemoteStatus = $state('connecting');
  user: { id: string; name: string } | null = $state(null);
  rating: RatingInfo | null = $state(null);
  queue: { format: Format; waitedMs: number; since: number } | null = $state(null);
  info: GameInfo | null = $state.raw(null);
  #view: PlayerView | null = $state.raw(null);
  /** Absolute time (Date.now based) at which the server acts for us; null when nothing is pending. */
  deadlineAt: number | null = $state(null);
  /** Remaining time bank, ms. */
  bank: number | null = $state(null);
  end: { final: FinalStanding[]; ratings: RatingChange[] } | null = $state.raw(null);
  error: string | null = $state(null);
  /** In riichi, discard the drawn tile automatically when nothing else is possible (as offline). */
  autoRiichiDiscard = $state(true);
  /** Pass on pon/chii/kan automatically (still asked for ron). */
  skipCalls = $state(false);
  readonly red: RedFives = DEFAULT_RULES.redFives;
  names: string[] = $derived.by(() => {
    const info = this.info as GameInfo | null;
    if (!info) return ['', '', '', ''];
    return info.players.map((p) => (p.seat === info.seat ? 'You' : p.name));
  });

  #ws: WebSocket | null = null;
  #hints: HintLevel;
  #attempt = 0;
  #retry: ReturnType<typeof setTimeout> | null = null;
  #auto: ReturnType<typeof setTimeout> | null = null;
  #destroyed = false;
  #url: string;

  constructor(hints: HintLevel = 'full', url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`) {
    this.#hints = hints;
    this.#url = url;
    this.connect();
  }

  get view(): PlayerView {
    const v = this.#view as PlayerView | null;
    if (!v) throw new Error('No game');
    return v;
  }

  get hasView(): boolean {
    return this.#view !== null;
  }

  connect(): void {
    if (this.#destroyed || this.#ws) return;
    this.status = 'connecting';
    const ws = new WebSocket(this.#url);
    this.#ws = ws;
    ws.onopen = () => {
      this.#attempt = 0;
      this.#send({ type: 'hello', version: PROTOCOL_VERSION });
    };
    ws.onmessage = (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      this.#handle(msg);
    };
    ws.onclose = () => {
      if (this.#ws !== ws) return;
      this.#ws = null;
      if (this.#destroyed || this.status === 'takenOver') return;
      this.status = 'offline';
      this.#scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  /** Reconnect now (e.g. after being taken over, to take the seat back). */
  reconnect(): void {
    if (this.#retry) clearTimeout(this.#retry);
    this.#retry = null;
    this.#attempt = 0;
    if (this.#ws) {
      const ws = this.#ws;
      this.#ws = null;
      ws.close();
    }
    this.status = 'connecting';
    this.connect();
  }

  destroy(): void {
    this.#destroyed = true;
    if (this.#retry) clearTimeout(this.#retry);
    if (this.#auto) clearTimeout(this.#auto);
    this.#ws?.close();
    this.#ws = null;
  }

  joinQueue(format: Format): void {
    this.#send({ type: 'queue.join', format });
  }

  leaveQueue(): void {
    this.#send({ type: 'queue.leave' });
    this.queue = null;
    if (this.status === 'queued') this.status = 'idle';
  }

  act(action: Action): void {
    const v = this.#view as PlayerView | null;
    const info = this.info as GameInfo | null;
    if (!v || !info) return;
    this.#send({ type: 'act', gameId: info.gameId, seq: v.seq, action });
  }

  next(): void {
    const info = this.info as GameInfo | null;
    if (info) this.#send({ type: 'ready', gameId: info.gameId });
  }

  setHints(level: HintLevel): void {
    this.#hints = level;
    this.#send({ type: 'hints', level });
  }

  resync(): void {
    this.#send({ type: 'resync' });
  }

  /** Forget the finished game so a new one can be queued. */
  clearGame(): void {
    this.info = null;
    this.#view = null;
    this.end = null;
    this.deadlineAt = null;
    this.bank = null;
    if (this.status === 'ended') this.status = 'idle';
  }

  /** Decisions the player has opted out of making by hand, sent after a short pause so the table still shows them. */
  #automate(v: PlayerView): void {
    if (this.#auto) clearTimeout(this.#auto);
    this.#auto = null;
    if (v.phase !== 'playing' || !v.actions.length) return;
    const legal = v.actions;
    let action: Action | null = null;
    if (this.autoRiichiDiscard && v.players[v.seat].riichi && legal.every((a) => a.type === 'discard')) action = legal[0];
    else if (this.skipCalls && legal.some((a) => a.type === 'pass') && !legal.some((a) => a.type === 'ron')) {
      action = legal.find((a) => a.type === 'pass')!;
    }
    if (!action) return;
    const seq = v.seq;
    this.#auto = setTimeout(() => {
      this.#auto = null;
      const now = this.#view as PlayerView | null;
      if (now && now.seq === seq) this.act(action);
    }, 350);
  }

  #send(msg: ClientMessage): void {
    if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(msg));
  }

  #scheduleReconnect(): void {
    const delay = Math.min(15_000, 1000 * 2 ** Math.min(this.#attempt, 4)) * (0.8 + Math.random() * 0.4);
    this.#attempt++;
    this.#retry = setTimeout(() => {
      this.#retry = null;
      this.connect();
    }, delay);
  }

  #handle(msg: ServerMessage): void {
    switch (msg.type) {
      case 'welcome':
        this.user = msg.user;
        this.rating = msg.rating;
        this.error = null;
        if (this.#hints !== 'full') this.#send({ type: 'hints', level: this.#hints });
        if (msg.activeGame) {
          this.info = msg.activeGame;
          this.end = null;
          this.status = 'playing';
        } else if (msg.queued) {
          this.queue = { format: msg.queued, waitedMs: 0, since: Date.now() };
          this.status = 'queued';
        } else if (this.status !== 'ended') {
          this.status = 'idle';
        }
        return;
      case 'queue.status':
        this.queue = { format: msg.format, waitedMs: msg.waitedMs, since: Date.now() - msg.waitedMs };
        if (this.status !== 'playing') this.status = 'queued';
        return;
      case 'game.start':
        this.info = msg.game;
        this.queue = null;
        this.end = null;
        this.status = 'playing';
        return;
      case 'update': {
        const info = this.info as GameInfo | null;
        if (!info || info.gameId !== msg.gameId) return;
        this.#view = msg.view;
        this.deadlineAt = msg.deadline !== undefined ? Date.now() + msg.deadline : null;
        this.bank = msg.bank ?? null;
        this.error = null;
        if (this.status !== 'ended') this.status = 'playing';
        this.#automate(msg.view);
        return;
      }
      case 'game.end':
        this.end = { final: msg.final, ratings: msg.ratings };
        this.deadlineAt = null;
        this.status = 'ended';
        return;
      case 'error':
        if (msg.code === 'staleSeq' || msg.code === 'rateLimited') return; // an update follows
        if (msg.code === 'inGame') return; // game.start follows
        this.error = msg.message ?? msg.code;
        return;
      case 'takenOver':
        this.status = 'takenOver';
        return;
      case 'server.restarting':
        this.status = 'offline';
        return;
      case 'pong':
        return;
    }
  }
}
