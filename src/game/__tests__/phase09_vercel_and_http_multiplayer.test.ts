import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';
import { ChaosMultiplayerClient } from '../../multiplayer/client';
import { PROTOCOL_VERSION } from '../../multiplayer/protocol';

describe('Phase 09 — Vercel Full-Stack HTTP Transport, Database Maintenance & CI/CD Readiness', () => {
  let activeServers: ChaosMultiplayerServer[] = [];
  let activeClients: ChaosMultiplayerClient[] = [];

  afterEach(async () => {
    for (const c of activeClients) {
      c.disconnect();
    }
    activeClients = [];
    for (const s of activeServers) {
      await s.close();
    }
    activeServers = [];
  });

  async function startServer() {
    const server = new ChaosMultiplayerServer({
      port: 0,
      host: '127.0.0.1',
      dbFilePath: ':memory:',
      aiActionDelayMs: 20,
      deterministicTestSeed: 555666,
      silentLogs: true,
    });
    activeServers.push(server);
    const port = await server.listen(0, '127.0.0.1');
    return {
      server,
      port,
      httpUrl: `http://127.0.0.1:${port}`,
      apiMultiplayerUrl: `http://127.0.0.1:${port}/api/multiplayer`,
    };
  }

  async function postApi(url: string, sessionId: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({
        version: PROTOCOL_VERSION,
        ...body,
      }),
    });
    return {
      status: res.status,
      data: await res.json(),
    };
  }

  it('1. Full HTTP /api/multiplayer room lifecycle: create, join, add AI, start match, roll dice, and poll sync', async () => {
    const { apiMultiplayerUrl, httpUrl } = await startServer();

    // Welcome handshake via GET
    const welcomeRes = await fetch(apiMultiplayerUrl).then(r => r.json());
    expect(welcomeRes.type).toBe('WELCOME');
    expect(welcomeRes.sessionId).toMatch(/^http-/);

    const hostSession = welcomeRes.sessionId;
    const guestSession = 'http-guest-2';

    // 1. Host creates room via HTTP POST
    const createRes = await postApi(apiMultiplayerUrl, hostSession, {
      type: 'CREATE_ROOM',
      requestId: 'http-cr-1',
      playerName: 'Host Vercel',
      roomName: 'Phòng Cloud Full-Stack',
      capacity: 3,
    });
    expect(createRes.status).toBe(200);
    expect(createRes.data.type).toBe('ROOM_JOINED');
    const roomCode = createRes.data.room.roomCode;
    const hostReconnectToken = createRes.data.reconnectToken;

    // 2. Guest joins room via HTTP POST
    const joinRes = await postApi(apiMultiplayerUrl, guestSession, {
      type: 'JOIN_ROOM',
      requestId: 'http-jr-1',
      roomCode,
      playerName: 'Guest Vercel',
    });
    expect(joinRes.status).toBe(200);
    expect(joinRes.data.assignedPlayerId).toBe('player-2');

    // 3. Host adds an AI into seat 2
    const aiRes = await postApi(apiMultiplayerUrl, hostSession, {
      type: 'CONFIGURE_SEAT_AI',
      requestId: 'http-ai-1',
      roomCode,
      seatIndex: 2,
      isAI: true,
      aiPersonality: 'STRATEGIST',
      aiDifficulty: 'NORMAL',
    });
    expect(aiRes.status).toBe(200);
    expect(aiRes.data.room.seats).toHaveLength(3);

    // 4. Host starts the match
    const startRes = await postApi(apiMultiplayerUrl, hostSession, {
      type: 'START_MATCH',
      requestId: 'http-st-1',
      roomCode,
    });
    expect(startRes.status).toBe(200);
    expect(startRes.data.type).toBe('MATCH_STARTED');
    expect(startRes.data.gameState.status).toBe('PLAYING');

    // 5. Host rolls dice via HTTP POST
    const rollRes = await postApi(apiMultiplayerUrl, hostSession, {
      type: 'SUBMIT_ACTION',
      requestId: 'http-roll-1',
      roomCode,
      actionId: 'act-http-roll-1',
      intent: { type: 'ROLL_DICE' },
    });
    expect(rollRes.status).toBe(200);
    expect(rollRes.data.type).toBe('STATE_SYNC');
    expect(rollRes.data.gameState.players[0].position).toBeGreaterThan(0);

    // 6. Guest polls room state via GET /api/multiplayer?roomCode=...
    const pollRes = await fetch(`${apiMultiplayerUrl}?roomCode=${roomCode}&playerId=player-2`).then(r =>
      r.json()
    );
    expect(pollRes.type).toBe('STATE_SYNC');
    expect(pollRes.gameState.players[0].position).toBe(rollRes.data.gameState.players[0].position);

    // 7. Reconnect via HTTP POST works with valid token
    const reconnRes = await postApi(apiMultiplayerUrl, 'http-host-new-session', {
      type: 'RECONNECT_ROOM',
      requestId: 'http-reconn-1',
      roomCode,
      playerId: 'player-1',
      reconnectToken: hostReconnectToken,
    });
    expect(reconnRes.status).toBe(200);
    expect(reconnRes.data.type).toBe('ROOM_JOINED');

    // 8. Cron maintenance endpoint (/api/cron/maintenance) verifies DB integrity & WAL checkpoint
    const cronRes = await fetch(`${httpUrl}/api/cron/maintenance`).then(r => r.json());
    expect(cronRes.ok).toBe(true);
    expect(cronRes.database.integrity).toBe('ok');
    expect(cronRes.database.roomCount).toBe(1);
  });

  it('2. ChaosMultiplayerClient automatically falls back to HTTP polling when WebSocket endpoint is unavailable', async () => {
    const { port } = await startServer();

    // Create a dummy HTTP server that rejects WebSocket upgrades on /ws-blocked but forwards /api/multiplayer
    const proxyServer = http.createServer(async (req, res) => {
      const targetUrl = `http://127.0.0.1:${port}${req.url}`;
      const chunks: Buffer[] = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        const upstream = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': String(req.headers['x-session-id'] || ''),
          },
          body,
        });
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(await upstream.text());
      });
    });

    proxyServer.on('upgrade', (_req, socket) => {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
    });

    await new Promise<void>(resolve => proxyServer.listen(0, '127.0.0.1', () => resolve()));
    const proxyPort = (proxyServer.address() as any).port;

    try {
      let joinedRoomCode = '';
      const client = new ChaosMultiplayerClient(
        {
          onRoomUpdated: room => {
            joinedRoomCode = room.roomCode;
          },
        },
        `ws://127.0.0.1:${proxyPort}/ws`
      );
      activeClients.push(client);

      client.createRoom({
        playerName: 'Fallback Tester',
        roomName: 'Fallback Room',
        capacity: 2,
      });

      // Wait for WS failure -> HTTP fallback -> ROOM_JOINED
      for (let i = 0; i < 30 && !joinedRoomCode; i++) {
        await new Promise(r => setTimeout(r, 50));
      }

      expect(client.status).toBe('CONNECTED');
      expect(joinedRoomCode).toMatch(/^CHAOS-/);
    } finally {
      await new Promise<void>(resolve => proxyServer.close(() => resolve()));
    }
  });
});
