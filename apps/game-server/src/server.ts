// HTTP server with /healthz, the internal admin API and the authenticated /ws upgrade. Separated from main.ts so tests
// can start one.
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocketServer } from 'ws';
import { MAX_MESSAGE_BYTES } from '@mahjong/protocol';
import { handleInternal } from './admin.ts';
import { authenticateUpgrade, type FetchLike } from './auth.ts';
import type { Config } from './config.ts';
import { Connection } from './connection.ts';
import type { Hub } from './hub.ts';

export interface GameServer {
  http: Server;
  wss: WebSocketServer;
  /** Closes the listener and every connection. */
  close(): Promise<void>;
}

export function createGameServer(hub: Hub, config: Config, fetchFn?: FetchLike): GameServer {
  const http = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('ok');
      return;
    }
    if (req.url?.startsWith('/internal/')) {
      handleInternal(req, res, hub, config).catch((e) => {
        console.error('[admin] request failed', e);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, clientTracking: true });

  http.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/ws') return reject(socket, 404, 'Not Found');
    socket.on('error', () => {});
    authenticateUpgrade(req, config, fetchFn).then(
      (user) => {
        if (!user) return reject(socket, 401, 'Unauthorized');
        if (socket.destroyed) return;
        wss.handleUpgrade(req, socket, head, (ws) => new Connection(ws, user, hub, config));
      },
      () => reject(socket, 500, 'Internal Server Error'),
    );
  });

  return {
    http,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        for (const ws of wss.clients) ws.terminate();
        wss.close();
        http.close(() => resolve());
      }),
  };
}

function reject(socket: Socket, status: number, text: string): void {
  if (socket.destroyed) return;
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}
