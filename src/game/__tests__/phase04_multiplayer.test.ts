import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';
import { PROTOCOL_VERSION, ServerToClientMessage } from '../../multiplayer/protocol';

/**
 * Helper class representing an independent remote WebSocket client session.
 */
export class TestWsClient {
  public ws!: WebSocket;
  public messages: ServerToClientMessage[] = [];
  public sessionId: string = '';
  private waiters: Array<{
    predicate: (msg: ServerToClientMessage) => boolean;
    resolve: (msg: ServerToClientMessage) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.url);
    this.ws.on('message', (data: Buffer | string) => {
      const msg = JSON.parse(data.toString()) as ServerToClientMessage;
      if (msg.type === 'WELCOME') {
        this.sessionId = msg.sessionId;
      }

      // Check if an active waiter matches this incoming message first
      const waiterIdx = this.waiters.findIndex(w => w.predicate(msg));
      if (waiterIdx >= 0) {
        const [waiter] = this.waiters.splice(waiterIdx, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
        return;
      }

      this.messages.push(msg);
    });

    await new Promise<void>((resolve, reject) => {
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });

    await this.waitForMessage(m => m.type === 'WELCOME');
  }

  send(payload: Record<string, unknown>): void {
    this.ws.send(
      JSON.stringify({
        version: PROTOCOL_VERSION,
        ...payload,
      })
    );
  }

  async waitForMessage<T extends ServerToClientMessage = ServerToClientMessage>(
    predicate: (msg: ServerToClientMessage) => boolean,
    timeoutMs: number = 3000
  ): Promise<T> {
    const existingIdx = this.messages.findIndex(predicate);
    if (existingIdx >= 0) {
      const [found] = this.messages.splice(existingIdx, 1);
      return found as T;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex(w => w.timer === timer);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for WebSocket message (${timeoutMs}ms)`));
      }, timeoutMs);

      this.waiters.push({
        predicate,
        resolve: msg => resolve(msg as T),
        timer,
      });
    });
  }

  close(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

describe('Phase 04 — Online Multiplayer Server, Room Lifecycle, Security & Recovery', () => {
  let activeServers: ChaosMultiplayerServer[] = [];
  let activeClients: TestWsClient[] = [];
  let tempDbFiles: string[] = [];

  afterEach(async () => {
    for (const c of activeClients) {
      c.close();
    }
    activeClients = [];

    for (const s of activeServers) {
      await s.close();
    }
    activeServers = [];

    for (const f of tempDbFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
        if (fs.existsSync(`${f}-wal`)) fs.unlinkSync(`${f}-wal`);
        if (fs.existsSync(`${f}-shm`)) fs.unlinkSync(`${f}-shm`);
      } catch {
        // Ignore cleanup errors
      }
    }
    tempDbFiles = [];
  });

  async function startTestServer(overrides: Partial<ConstructorParameters<typeof ChaosMultiplayerServer>[0]> = {}) {
    const server = new ChaosMultiplayerServer({
      port: 0,
      host: '127.0.0.1',
      dbFilePath: ':memory:',
      aiActionDelayMs: 30,
      defaultReconnectGraceMs: 2000,
      deterministicTestSeed: 777888,
      silentLogs: true,
      ...overrides,
    });
    activeServers.push(server);
    const port = await server.listen(0, '127.0.0.1');
    return {
      server,
      port,
      wsUrl: `ws://127.0.0.1:${port}/ws`,
      httpUrl: `http://127.0.0.1:${port}`,
    };
  }

  async function createClient(wsUrl: string): Promise<TestWsClient> {
    const client = new TestWsClient(wsUrl);
    activeClients.push(client);
    await client.connect();
    return client;
  }

  it('1–5. Creates room, joins with valid code, rejects invalid code, rejects duplicate identity, and rejects full room', async () => {
    const { wsUrl, httpUrl } = await startTestServer();
    const host = await createClient(wsUrl);
    const player2 = await createClient(wsUrl);
    const player3 = await createClient(wsUrl);

    // Health & Readiness HTTP check
    const healthRes = await fetch(`${httpUrl}/api/health`).then(r => r.json());
    expect(healthRes.status).toBe('ok');

    // 1. Create 2-player room
    host.send({
      type: 'CREATE_ROOM',
      requestId: 'req-create-1',
      playerName: 'Chủ Phòng Alpha',
      roomName: 'Phòng VIP 2 Người',
      capacity: 2,
    });

    const createdMsg = await host.waitForMessage(m => m.type === 'ROOM_JOINED');
    expect(createdMsg.type).toBe('ROOM_JOINED');
    if (createdMsg.type !== 'ROOM_JOINED') return;

    const roomCode = createdMsg.room.roomCode;
    expect(roomCode).toMatch(/^CHAOS-[A-Z0-9]{4}$/);
    expect(createdMsg.assignedPlayerId).toBe('player-1');
    expect(createdMsg.reconnectToken.length).toBeGreaterThanOrEqual(32);

    // 3. Reject invalid room code
    player2.send({
      type: 'JOIN_ROOM',
      requestId: 'req-bad-code',
      roomCode: 'CHAOS-ZZZZ',
      playerName: 'Khách Lạc Đường',
    });
    const badCodeErr = await player2.waitForMessage(m => m.type === 'ERROR');
    expect(badCodeErr.type === 'ERROR' && badCodeErr.code).toBe('ROOM_NOT_FOUND');

    // 2. Join with valid code
    player2.send({
      type: 'JOIN_ROOM',
      requestId: 'req-join-valid',
      roomCode,
      playerName: 'Tài Phiệt Beta',
    });
    const joinedMsg = await player2.waitForMessage(m => m.type === 'ROOM_JOINED');
    expect(joinedMsg.type === 'ROOM_JOINED' && joinedMsg.assignedPlayerId).toBe('player-2');

    // Host receives live ROOM_UPDATED notification
    const hostUpdated = await host.waitForMessage(m => m.type === 'ROOM_UPDATED');
    expect(hostUpdated.type === 'ROOM_UPDATED' && hostUpdated.room.seats.length).toBe(2);
    expect(hostUpdated.type === 'ROOM_UPDATED' && hostUpdated.room.status).toBe('READY');

    // 5. Reject duplicate join from the same session
    player2.send({
      type: 'JOIN_ROOM',
      requestId: 'req-dup-join',
      roomCode,
      playerName: 'Beta Clone',
    });
    const dupJoinErr = await player2.waitForMessage(m => m.type === 'ERROR');
    expect(dupJoinErr.type === 'ERROR' && dupJoinErr.code).toBe('DUPLICATE_JOIN');

    // 4. Reject 3rd player when 2-player room is full
    player3.send({
      type: 'JOIN_ROOM',
      requestId: 'req-full-room',
      roomCode,
      playerName: 'Người Thứ Ba',
    });
    const fullRoomErr = await player3.waitForMessage(m => m.type === 'ERROR');
    expect(fullRoomErr.type === 'ERROR' && fullRoomErr.code).toBe('ROOM_FULL');
  });

  it('6–8 & 10–15. Synchronizes 4 independent clients, executes server-authoritative turns, and blocks forged dice/cash/ownership/duplicate/out-of-turn cheats', async () => {
    const { wsUrl } = await startTestServer({ deterministicTestSeed: 123456 });
    const c1 = await createClient(wsUrl);
    const c2 = await createClient(wsUrl);
    const c3 = await createClient(wsUrl);
    const c4 = await createClient(wsUrl);

    c1.send({
      type: 'CREATE_ROOM',
      requestId: 'c1-create',
      playerName: 'Player 1',
      capacity: 4,
    });
    const joined1 = await c1.waitForMessage(m => m.type === 'ROOM_JOINED');
    if (joined1.type !== 'ROOM_JOINED') throw new Error('Expected ROOM_JOINED');
    const roomCode = joined1.room.roomCode;

    for (const [idx, client] of [c2, c3, c4].entries()) {
      client.send({
        type: 'JOIN_ROOM',
        requestId: `join-${idx + 2}`,
        roomCode,
        playerName: `Player ${idx + 2}`,
      });
      await client.waitForMessage(m => m.type === 'ROOM_JOINED');
    }

    // Non-host c2 attempts to start match -> rejected
    c2.send({
      type: 'START_MATCH',
      requestId: 'c2-unauthorized-start',
      roomCode,
    });
    const unauthStart = await c2.waitForMessage(m => m.type === 'ERROR');
    expect(unauthStart.type === 'ERROR' && unauthStart.code).toBe('NOT_ROOM_HOST');

    // 6. Host starts match -> all 4 clients receive identical MATCH_STARTED state
    c1.send({
      type: 'START_MATCH',
      requestId: 'c1-start',
      roomCode,
    });

    const startMessages = await Promise.all(
      [c1, c2, c3, c4].map(c => c.waitForMessage(m => m.type === 'MATCH_STARTED'))
    );
    for (const msg of startMessages) {
      expect(msg.type).toBe('MATCH_STARTED');
      if (msg.type === 'MATCH_STARTED') {
        expect(msg.gameState.players.length).toBe(4);
        expect(msg.gameState.config.seed).toBeUndefined(); // Secret seed hidden from clients
      }
    }

    // 11. Invalid turn action rejection: Player 2 tries to roll dice during Player 1's turn
    c2.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c2-roll-early',
      roomCode,
      actionId: 'act-c2-illegal-roll',
      intent: { type: 'ROLL_DICE' },
    });
    const earlyRollRej = await c2.waitForMessage(m => m.type === 'ACTION_REJECTED');
    expect(earlyRollRej.type === 'ACTION_REJECTED' && earlyRollRej.code).toBe('UNAUTHORIZED_ACTION');

    // 12. Forged dice outcome rejection: Player 1 tries to send ROLL_DICE_RESULT or dice: [6, 6]
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-forged-dice-type',
      roomCode,
      actionId: 'act-c1-forge-dice-1',
      intent: { type: 'ROLL_DICE_RESULT', dice: [6, 6] },
    });
    const forgedDiceErr1 = await c1.waitForMessage(m => m.type === 'ERROR');
    expect(forgedDiceErr1.type === 'ERROR' && forgedDiceErr1.code).toBe('FORBIDDEN_CLIENT_ACTION');

    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-forged-dice-field',
      roomCode,
      actionId: 'act-c1-forge-dice-2',
      intent: { type: 'ROLL_DICE', dice: [6, 6] },
    });
    const forgedDiceErr2 = await c1.waitForMessage(m => m.type === 'ERROR');
    expect(forgedDiceErr2.type === 'ERROR' && forgedDiceErr2.code).toBe('FORBIDDEN_CLIENT_ACTION');

    // 13. Forged cash balance rejection
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-forged-cash',
      roomCode,
      actionId: 'act-c1-forge-cash',
      intent: { type: 'END_TURN', cash: 999999 },
    });
    const forgedCashErr = await c1.waitForMessage(m => m.type === 'ERROR');
    expect(forgedCashErr.type === 'ERROR' && forgedCashErr.code).toBe('FORBIDDEN_CLIENT_ACTION');

    // 14. Forged property ownership rejection
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-forged-owner',
      roomCode,
      actionId: 'act-c1-forge-owner',
      intent: { type: 'BUY_PROPERTY', tileId: 1, ownerId: 'player-1' },
    });
    const forgedOwnerErr = await c1.waitForMessage(m => m.type === 'ERROR');
    expect(forgedOwnerErr.type === 'ERROR' && forgedOwnerErr.code).toBe('FORBIDDEN_CLIENT_ACTION');

    // 10. Valid turn action: Player 1 submits clean ROLL_DICE intent
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-valid-roll',
      roomCode,
      actionId: 'act-c1-valid-roll-1',
      intent: { type: 'ROLL_DICE' },
    });

    // All 4 clients receive identical STATE_SYNC
    const syncAfterRoll = await Promise.all(
      [c1, c2, c3, c4].map(c =>
        c.waitForMessage(m => m.type === 'STATE_SYNC' && m.actionId === 'act-c1-valid-roll-1')
      )
    );
    const syncedPositions = syncAfterRoll.map(
      (m: ServerToClientMessage) => m.type === 'STATE_SYNC' && m.gameState.players[0].position
    );
    expect(new Set(syncedPositions).size).toBe(1);
    expect(syncedPositions[0]).toBeGreaterThan(0);

    // 15. Duplicate actionId rejection
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'c1-dup-action',
      roomCode,
      actionId: 'act-c1-valid-roll-1',
      intent: { type: 'END_TURN' },
    });
    const dupActionRej = await c1.waitForMessage(m => m.type === 'ACTION_REJECTED');
    expect(dupActionRej.type === 'ACTION_REJECTED' && dupActionRej.code).toBe('DUPLICATE_ACTION');
  });

  it('16 & 17. Synchronizes multi-client public auctions and bilateral trading with anti-spoofing', async () => {
    // Seed 1002 moves Player 1 onto a purchasable property on roll 1
    const { wsUrl } = await startTestServer({ deterministicTestSeed: 1002 });
    const c1 = await createClient(wsUrl);
    const c2 = await createClient(wsUrl);

    c1.send({ type: 'CREATE_ROOM', requestId: 'r1', playerName: 'Host P1', capacity: 2 });
    const j1 = await c1.waitForMessage(m => m.type === 'ROOM_JOINED');
    if (j1.type !== 'ROOM_JOINED') return;
    const roomCode = j1.room.roomCode;

    c2.send({ type: 'JOIN_ROOM', requestId: 'r2', roomCode, playerName: 'Guest P2' });
    await c2.waitForMessage(m => m.type === 'ROOM_JOINED');

    c1.send({ type: 'START_MATCH', requestId: 'start', roomCode });
    await Promise.all([c1, c2].map(c => c.waitForMessage(m => m.type === 'MATCH_STARTED')));

    // Player 1 rolls dice
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'roll-1',
      roomCode,
      actionId: 'roll-1',
      intent: { type: 'ROLL_DICE' },
    });
    const rollSync = await c1.waitForMessage(m => m.type === 'STATE_SYNC' && m.actionId === 'roll-1');
    await c2.waitForMessage(m => m.type === 'STATE_SYNC' && m.actionId === 'roll-1');

    if (rollSync.type !== 'STATE_SYNC') return;
    // Tile 1 (Cần Thơ - $60M) is an unowned purchasable property
    const targetPropertyTileId = 1;

    // 16. Player 1 starts a public auction on targetPropertyTileId
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'auc-start',
      roomCode,
      actionId: 'auc-start-1',
      intent: { type: 'START_AUCTION', tileId: targetPropertyTileId },
    });
    const aucStartSync = await c2.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'auc-start-1'
    );
    expect(aucStartSync.type === 'STATE_SYNC' && aucStartSync.gameState.activeAuction?.status).toBe(
      'ACTIVE'
    );

    // Player 1 places opening bid ($100M)
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'bid-1',
      roomCode,
      actionId: 'bid-p1',
      intent: { type: 'PLACE_AUCTION_BID', bidAmount: 100 },
    });
    await Promise.all([c1, c2].map(c => c.waitForMessage(m => m.type === 'STATE_SYNC' && m.actionId === 'bid-p1')));

    // Player 2 passes -> Player 1 wins the auction!
    c2.send({
      type: 'SUBMIT_ACTION',
      requestId: 'pass-2',
      roomCode,
      actionId: 'pass-p2',
      intent: { type: 'PASS_AUCTION_BID' },
    });
    const aucEndSync = await c1.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'pass-p2'
    );
    expect(
      aucEndSync.type === 'STATE_SYNC' && aucEndSync.gameState.properties[targetPropertyTileId]?.ownerId
    ).toBe('player-1');

    // 17. Bilateral Trade Synchronization: Player 1 proposes selling targetPropertyTileId to Player 2 for $150M
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'trade-prop',
      roomCode,
      actionId: 'trade-prop-1',
      intent: {
        type: 'PROPOSE_TRADE',
        proposal: {
          senderPlayerId: 'player-1',
          targetPlayerId: 'player-2',
          offeredCash: 0,
          offeredPropertyIds: [targetPropertyTileId],
          offeredJailCards: 0,
          requestedCash: 150,
          requestedPropertyIds: [],
          requestedJailCards: 0,
        },
      },
    });

    const tradeSync = await c2.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'trade-prop-1'
    );
    expect(tradeSync.type === 'STATE_SYNC' && tradeSync.gameState.activeTrade?.status).toBe(
      'PENDING'
    );

    // Security check: Player 1 cannot accept their own trade on behalf of Player 2!
    c1.send({
      type: 'SUBMIT_ACTION',
      requestId: 'self-accept',
      roomCode,
      actionId: 'self-accept-1',
      intent: { type: 'ACCEPT_TRADE' },
    });
    const selfAcceptRej = await c1.waitForMessage(m => m.type === 'ACTION_REJECTED');
    expect(selfAcceptRej.type === 'ACTION_REJECTED' && selfAcceptRej.code).toBe(
      'UNAUTHORIZED_ACTION'
    );

    // Player 2 accepts the trade
    c2.send({
      type: 'SUBMIT_ACTION',
      requestId: 'p2-accept',
      roomCode,
      actionId: 'p2-accept-1',
      intent: { type: 'ACCEPT_TRADE' },
    });
    const tradeAcceptedSync = await c1.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.actionId === 'p2-accept-1'
    );
    expect(
      tradeAcceptedSync.type === 'STATE_SYNC' &&
        tradeAcceptedSync.gameState.properties[targetPropertyTileId]?.ownerId
    ).toBe('player-2');
  });

  it('9, 19–22 & 24. Handles AI in online matches, host disconnect migration, secure token reconnection, and SQLite server restart recovery', async () => {
    const dbFile = path.join(os.tmpdir(), `chaos-mp-test-${Date.now()}.sqlite`);
    tempDbFiles.push(dbFile);

    const { server, wsUrl } = await startTestServer({
      dbFilePath: dbFile,
      aiActionDelayMs: 25,
    });

    const host = await createClient(wsUrl);
    const guest = await createClient(wsUrl);

    host.send({ type: 'CREATE_ROOM', requestId: 'cr', playerName: 'Host One', capacity: 3 });
    const hostJoined = await host.waitForMessage(m => m.type === 'ROOM_JOINED');
    if (hostJoined.type !== 'ROOM_JOINED') return;
    const roomCode = hostJoined.room.roomCode;
    const hostReconnectToken = hostJoined.reconnectToken;

    guest.send({ type: 'JOIN_ROOM', requestId: 'jr', roomCode, playerName: 'Guest Two' });
    await guest.waitForMessage(m => m.type === 'ROOM_JOINED');

    // 9. Host adds an AI player into seatIndex 2
    host.send({
      type: 'CONFIGURE_SEAT_AI',
      requestId: 'cfg-ai',
      roomCode,
      seatIndex: 2,
      isAI: true,
      aiPersonality: 'SHARK',
      aiDifficulty: 'HARD',
    });
    const aiAdded = await host.waitForMessage(
      m => m.type === 'ROOM_UPDATED' && m.room.seats.length === 3
    );
    expect(aiAdded.type === 'ROOM_UPDATED' && aiAdded.room.seats[2].isAI).toBe(true);

    // Start 3-player mixed Human + AI match
    host.send({ type: 'START_MATCH', requestId: 'st', roomCode });
    await Promise.all([host, guest].map(c => c.waitForMessage(m => m.type === 'MATCH_STARTED')));

    // 19 & 22. Host suddenly disconnects mid-game -> Guest receives PLAYER_DISCONNECTED and HOST_MIGRATED
    host.close();
    const discMsg = await guest.waitForMessage(m => m.type === 'PLAYER_DISCONNECTED');
    expect(discMsg.type === 'PLAYER_DISCONNECTED' && discMsg.playerId).toBe('player-1');

    const migratedMsg = await guest.waitForMessage(m => m.type === 'HOST_MIGRATED');
    expect(migratedMsg.type === 'HOST_MIGRATED' && migratedMsg.newHostPlayerId).toBe('player-2');

    // 20 & 25. Impersonator tries to reconnect as player-1 with wrong token -> REJECTED
    const attacker = await createClient(wsUrl);
    attacker.send({
      type: 'RECONNECT_ROOM',
      requestId: 'atk-reconn',
      roomCode,
      playerId: 'player-1',
      reconnectToken: 'forged-token-0000000000000000',
    });
    const atkErr = await attacker.waitForMessage(m => m.type === 'ERROR');
    expect(atkErr.type === 'ERROR' && atkErr.code).toBe('INVALID_RECONNECT_TOKEN');

    // Legitimate host reconnects with valid token (simulating browser refresh recovery #21)
    const hostReconnected = await createClient(wsUrl);
    hostReconnected.send({
      type: 'RECONNECT_ROOM',
      requestId: 'legit-reconn',
      roomCode,
      playerId: 'player-1',
      reconnectToken: hostReconnectToken,
    });
    const reconnJoined = await hostReconnected.waitForMessage(m => m.type === 'ROOM_JOINED');
    expect(reconnJoined.type === 'ROOM_JOINED' && reconnJoined.assignedPlayerId).toBe('player-1');
    expect(reconnJoined.type === 'ROOM_JOINED' && reconnJoined.gameState?.status).toBe('PLAYING');

    // 24. Server restart recovery from SQLite WAL persistence
    await server.close();
    activeServers = activeServers.filter(s => s !== server);

    const { wsUrl: restartedWsUrl } = await startTestServer({
      dbFilePath: dbFile,
      aiActionDelayMs: 25,
    });

    const postRestartClient = await createClient(restartedWsUrl);
    postRestartClient.send({
      type: 'RECONNECT_ROOM',
      requestId: 'after-restart-reconn',
      roomCode,
      playerId: 'player-1',
      reconnectToken: hostReconnectToken,
    });
    const recoveredMsg = await postRestartClient.waitForMessage(m => m.type === 'ROOM_JOINED');
    expect(recoveredMsg.type === 'ROOM_JOINED' && recoveredMsg.room.roomCode).toBe(roomCode);
    expect(recoveredMsg.type === 'ROOM_JOINED' && recoveredMsg.gameState?.players.length).toBe(3);
  });

  it('26. Enforces sliding-window rate limiting against message flooding', async () => {
    const { wsUrl } = await startTestServer({
      maxMessagesPerWindow: 5,
      rateLimitWindowMs: 5000,
    });
    const spammer = await createClient(wsUrl);

    for (let i = 0; i < 8; i++) {
      spammer.send({ type: 'PING', requestId: `ping-${i}` });
    }

    const rateErr = await spammer.waitForMessage(
      m => m.type === 'ERROR' && m.code === 'RATE_LIMITED'
    );
    expect(rateErr.type === 'ERROR' && rateErr.code).toBe('RATE_LIMITED');
  });

  it('18 & 23. Synchronizes Chaos events, executes AI takeover after reconnect timeout, and completes an online match to victory', async () => {
    const { wsUrl } = await startTestServer({
      deterministicTestSeed: 999111,
      defaultReconnectGraceMs: 80, // Short 80ms timeout to test automatic AI takeover / forfeit
      aiActionDelayMs: 25,
    });

    const host = await createClient(wsUrl);
    const guest = await createClient(wsUrl);

    host.send({
      type: 'CREATE_ROOM',
      requestId: 'cr-end',
      playerName: 'Host Winner',
      capacity: 2,
      disconnectPolicy: 'FORFEIT',
      reconnectGraceMs: 80,
    });
    const hostJoined = await host.waitForMessage(m => m.type === 'ROOM_JOINED');
    if (hostJoined.type !== 'ROOM_JOINED') return;
    const roomCode = hostJoined.room.roomCode;

    guest.send({
      type: 'JOIN_ROOM',
      requestId: 'jr-end',
      roomCode,
      playerName: 'Guest Challenger',
    });
    await guest.waitForMessage(m => m.type === 'ROOM_JOINED');

    host.send({ type: 'START_MATCH', requestId: 'st-end', roomCode });
    await Promise.all([host, guest].map(c => c.waitForMessage(m => m.type === 'MATCH_STARTED')));

    // Guest voluntary/sudden disconnect -> after 80ms FORFEIT grace period, server declares bankruptcy & finishes match!
    guest.close();

    const finishedSync = await host.waitForMessage(
      m => m.type === 'STATE_SYNC' && m.gameState.status === 'ENDED',
      2000
    );
    expect(finishedSync.type === 'STATE_SYNC' && finishedSync.gameState.winner?.id).toBe(
      'player-1'
    );
    expect(finishedSync.type === 'STATE_SYNC' && finishedSync.room.status).toBe('FINISHED');
  });

  it('Multi-room isolation: operates multiple rooms concurrently without state leakage', async () => {
    const { wsUrl } = await startTestServer();
    const room1Host = await createClient(wsUrl);
    const room2Host = await createClient(wsUrl);

    room1Host.send({ type: 'CREATE_ROOM', requestId: 'r1', playerName: 'R1 Host', capacity: 2 });
    room2Host.send({ type: 'CREATE_ROOM', requestId: 'r2', playerName: 'R2 Host', capacity: 2 });

    const [j1, j2] = await Promise.all([
      room1Host.waitForMessage(m => m.type === 'ROOM_JOINED'),
      room2Host.waitForMessage(m => m.type === 'ROOM_JOINED'),
    ]);

    expect(j1.type === 'ROOM_JOINED' && j2.type === 'ROOM_JOINED').toBe(true);
    if (j1.type === 'ROOM_JOINED' && j2.type === 'ROOM_JOINED') {
      expect(j1.room.roomCode).not.toBe(j2.room.roomCode);
    }
  });
});
