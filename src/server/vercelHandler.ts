import os from 'node:os';
import path from 'node:path';
import type http from 'node:http';
import { ChaosMultiplayerServer } from './multiplayerServer';

// Global singleton across warm serverless function invocations on Vercel
const globalForServer = globalThis as unknown as {
  __chaosVercelServer?: ChaosMultiplayerServer;
};

function getServerInstance(): ChaosMultiplayerServer {
  if (!globalForServer.__chaosVercelServer) {
    const dbFilePath =
      process.env.MULTIPLAYER_DB_PATH ||
      (process.env.VERCEL
        ? path.join(os.tmpdir(), 'chaos-multiplayer.sqlite')
        : path.resolve(process.cwd(), 'data', 'chaos-multiplayer.sqlite'));

    globalForServer.__chaosVercelServer = new ChaosMultiplayerServer({
      dbFilePath,
      defaultReconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS || 60_000),
      roomExpirationMs: Number(process.env.ROOM_EXPIRATION_MS || 7_200_000),
      aiActionDelayMs: Number(process.env.AI_ACTION_DELAY_MS || 120),
      silentLogs: process.env.NODE_ENV === 'test',
    });
  }
  return globalForServer.__chaosVercelServer;
}

export default function handler(req: http.IncomingMessage, res: http.ServerResponse): void {
  const server = getServerInstance();
  server.handleHttpRequest(req, res);
}
