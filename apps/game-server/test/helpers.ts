import type { HintLevel } from '@mahjong/engine';
import type { RatingInfo, ServerMessage } from '@mahjong/protocol';
import { DEFAULT_CONFIG, type Config } from '../src/config.ts';
import type { HubClient } from '../src/hub.ts';

export const TEST_CONFIG: Config = { ...DEFAULT_CONFIG, databaseUrl: 'memory' };

/** A connection that records what it is sent. */
export class FakeClient implements HubClient {
  readonly user: { id: string; name: string };
  rating: RatingInfo = { rating: 1000, games: 0 };
  hints: HintLevel = 'full';
  sent: ServerMessage[] = [];
  closedWith: { code: number; reason: string } | null = null;

  constructor(id: string, name = id) {
    this.user = { id, name };
  }

  send(msg: ServerMessage): void {
    this.sent.push(msg);
  }

  close(code: number, reason: string): void {
    this.closedWith = { code, reason };
  }

  /** Last message of a type, or undefined. */
  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      if (this.sent[i].type === type) return this.sent[i] as Extract<ServerMessage, { type: T }>;
    }
    return undefined;
  }

  all<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[] {
    return this.sent.filter((m) => m.type === type) as Extract<ServerMessage, { type: T }>[];
  }

  clear(): void {
    this.sent = [];
  }
}
