// One WebSocket: handshake (`hello`), message validation, rate limit, heartbeat. Game logic lives in the hub.
import { MAX_MESSAGE_BYTES, PROTOCOL_VERSION, type RatingInfo, type ServerMessage, parseClientMessage } from '@mahjong/protocol';
import type { WebSocket } from 'ws';
import type { AuthUser } from './auth.ts';
import type { Config } from './config.ts';
import type { Hub, HubClient } from './hub.ts';

/** Messages per second a client may send (burst = twice that). */
const RATE_PER_SECOND = 20;

export class Connection implements HubClient {
  readonly user: AuthUser;
  rating: RatingInfo = { rating: 1000, games: 0 };
  #ws: WebSocket;
  #hub: Hub;
  #ready = false;
  #closed = false;
  #tokens = RATE_PER_SECOND * 2;
  #lastRefill = Date.now();
  #missedPongs = 0;
  #heartbeat: ReturnType<typeof setInterval>;

  constructor(ws: WebSocket, user: AuthUser, hub: Hub, config: Pick<Config, 'heartbeatMs'>) {
    this.#ws = ws;
    this.user = user;
    this.#hub = hub;
    ws.on('message', (data, isBinary) => this.#onMessage(data, isBinary));
    ws.on('pong', () => (this.#missedPongs = 0));
    ws.on('close', () => this.#onClose());
    ws.on('error', () => ws.terminate());
    this.#heartbeat = setInterval(() => {
      if (this.#missedPongs >= 2) return ws.terminate();
      this.#missedPongs++;
      ws.ping();
    }, config.heartbeatMs);
  }

  send(msg: ServerMessage): void {
    if (this.#ws.readyState !== this.#ws.OPEN) return;
    this.#ws.send(JSON.stringify(msg));
  }

  close(code: number, reason: string): void {
    if (this.#closed) return;
    this.#ws.close(code, reason);
  }

  #onMessage(data: unknown, isBinary: boolean): void {
    if (this.#closed) return;
    if (!this.#takeToken()) {
      this.send({ type: 'error', code: 'rateLimited' });
      return this.close(1008, 'rate limit');
    }
    const buf = data as Buffer | Buffer[] | ArrayBuffer;
    const size = Array.isArray(buf) ? buf.reduce((n, b) => n + b.length, 0) : (buf as Buffer).byteLength ?? 0;
    const text = isBinary ? '' : Array.isArray(buf) ? Buffer.concat(buf).toString() : Buffer.from(buf as Buffer).toString();
    const msg = isBinary || size > MAX_MESSAGE_BYTES ? null : parseClientMessage(text, size);
    if (!msg) {
      this.send({ type: 'error', code: 'badMessage' });
      return this.close(1008, 'bad message');
    }
    if (!this.#ready) {
      if (msg.type !== 'hello' || msg.version !== PROTOCOL_VERSION) {
        this.send({ type: 'error', code: 'badVersion' });
        return this.close(1008, 'bad version');
      }
      this.#ready = true;
      this.#hub.attach(this).catch(() => this.close(1011, 'server error'));
      return;
    }
    this.#hub.handle(this, msg);
  }

  #takeToken(): boolean {
    const now = Date.now();
    this.#tokens = Math.min(RATE_PER_SECOND * 2, this.#tokens + ((now - this.#lastRefill) / 1000) * RATE_PER_SECOND);
    this.#lastRefill = now;
    if (this.#tokens < 1) return false;
    this.#tokens--;
    return true;
  }

  #onClose(): void {
    if (this.#closed) return;
    this.#closed = true;
    clearInterval(this.#heartbeat);
    if (this.#ready) this.#hub.detach(this);
  }
}
