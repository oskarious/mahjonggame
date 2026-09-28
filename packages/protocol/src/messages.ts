// Messages exchanged between the web client and the game server over the /ws WebSocket.
// JSON, one message per frame, every message has a `type`. Both sides import this package.
import type { Action, FinalStanding, GameEvent, HintLevel, PlayerView } from '@mahjong/engine';

/** Bumped when a change is not backwards compatible; the server refuses other versions. */
export const PROTOCOL_VERSION = 1;

/** Game length. Both use the online default rules (DEFAULT_RULES with this length). */
export type Format = 'east' | 'south';
export const FORMATS: readonly Format[] = ['east', 'south'];

export type { HintLevel };
export const HINT_LEVELS: readonly HintLevel[] = ['off', 'distance', 'waits', 'full'];

/** Largest client message the server accepts, in bytes. */
export const MAX_MESSAGE_BYTES = 16 * 1024;

// ---------------------------------------------------------------------------
// Client → server

export type ClientMessage =
  | { type: 'hello'; version: number }
  | { type: 'queue.join'; format: Format }
  | { type: 'queue.leave' }
  | { type: 'act'; gameId: string; seq: number; action: Action }
  /** Ready for the next hand (between hands). */
  | { type: 'ready'; gameId: string }
  /** Ask for the full current view (after missed updates). */
  | { type: 'resync' }
  /** Lower the hint level below what the rating allows (never raises it). */
  | { type: 'hints'; level: HintLevel }
  | { type: 'ping' };

// ---------------------------------------------------------------------------
// Server → client

export interface PlayerInfo {
  seat: number;
  name: string;
  rating: number;
  bot: boolean;
}

export interface GameInfo {
  gameId: string;
  /** The receiving player's seat. */
  seat: number;
  format: Format;
  players: PlayerInfo[];
}

export interface RatingInfo {
  rating: number;
  /** Rated games played. */
  games: number;
}

export interface RatingChange {
  seat: number;
  before: number;
  after: number;
}

export type ErrorCode =
  | 'badVersion'
  | 'badMessage'
  | 'notInGame'
  | 'wrongGame'
  | 'staleSeq'
  | 'illegal'
  | 'inGame'
  | 'rateLimited';

export type ServerMessage =
  | {
      type: 'welcome';
      user: { id: string; name: string };
      rating: RatingInfo;
      /** Set when the player is already seated in a running game (an `update` follows). */
      activeGame: GameInfo | null;
      /** Set when the player is still queued (queue state survives only while the server runs). */
      queued: Format | null;
    }
  | { type: 'queue.status'; format: Format; waitedMs: number }
  | { type: 'game.start'; game: GameInfo }
  | {
      type: 'update';
      gameId: string;
      seq: number;
      view: PlayerView;
      /** This step's events, redacted for the receiving seat; empty on a resync. */
      events: GameEvent[];
      /** Milliseconds until the server acts for this player, when they have something to decide. */
      deadline?: number;
      /** Milliseconds left in the player's time bank. */
      bank?: number;
    }
  | { type: 'error'; code: ErrorCode; message?: string; requestSeq?: number }
  /** Another connection of the same account took over; this one is done and must not reconnect. */
  | { type: 'takenOver' }
  | { type: 'game.end'; gameId: string; final: FinalStanding[]; ratings: RatingChange[] }
  /** The server is shutting down; reconnect with backoff. */
  | { type: 'server.restarting' }
  | { type: 'pong' };
