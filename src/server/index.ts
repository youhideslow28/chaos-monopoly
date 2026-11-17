import path from 'node:path';
import { ChaosMultiplayerServer } from './multiplayerServer';

const port = Number(process.env.MULTIPLAYER_PORT || process.env.PORT || 3001);
const host = process.env.MULTIPLAYER_HOST || '0.0.0.0';
const dbFilePath =
  process.env.MULTIPLAYER_DB_PATH ||
  path.resolve(process.cwd(), 'data', 'chaos-multiplayer.sqlite');

const server = new ChaosMultiplayerServer({
  port,
  host,
  dbFilePath,
  defaultReconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS || 60_000),
  roomExpirationMs: Number(process.env.ROOM_EXPIRATION_MS || 7_200_000),
  aiActionDelayMs: Number(process.env.AI_ACTION_DELAY_MS || 550),
});

server
  .listen(port, host)
  .then(actualPort => {
    console.log(
      `[CHAOS MONOPOLY MULTIPLAYER SERVER] Listening on http://${host}:${actualPort} (WS: /ws, DB: ${dbFilePath})`
    );
  })
  .catch(err => {
    console.error('[CHAOS MONOPOLY MULTIPLAYER SERVER] Failed to start:', err);
    process.exit(1);
  });

const shutdown = async () => {
  console.log('[CHAOS MONOPOLY MULTIPLAYER SERVER] Shutting down gracefully...');
  await server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
