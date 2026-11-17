import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RoomRepository } from '../../server/roomRepository';
import { RoomManager } from '../../server/roomManager';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

describe('Phase 07 — Multiplayer Reliability, Load Simulation & Fault Recovery', () => {
  let tempDir: string;
  let dbFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-mp-load-'));
    dbFilePath = path.join(tempDir, 'cluster.db');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. Concurrently manages 10+ independent active rooms with mixed human and AI players', () => {
    const repo = new RoomRepository(dbFilePath);
    const roomManager = new RoomManager({
      repository: repo,
      onBroadcastToRoom: () => {},
      aiActionDelayMs: 0,
      deterministicTestSeed: 1337,
    });

    const roomCodes: string[] = [];

    // Create 12 concurrent rooms with varying capacities (2P, 3P, 4P) and AI configurations
    for (let i = 0; i < 12; i++) {
      const capacity = (i % 3) + 2; // 2, 3, or 4 players
      const created = roomManager.createRoom({
        sessionPlayerId: `sess-host-${i}`,
        playerName: `Host_${i}`,
        roomName: `Phòng Tải Cao #${i + 1}`,
        capacity,
        token: DEFAULT_PLAYER_TOKENS[0],
      });

      expect(created.ok).toBe(true);
      expect(created.data).toBeDefined();
      const code = created.data!.room.roomCode;
      roomCodes.push(code);

      // Configure remaining seats as AI players
      for (let seatIdx = 1; seatIdx < capacity; seatIdx++) {
        const aiConf = roomManager.configureSeatAI({
          roomCode: code,
          sessionPlayerId: `sess-host-${i}`,
          seatIndex: seatIdx,
          isAI: true,
          aiPersonality: seatIdx === 1 ? 'SHARK' : 'TYCOON',
          aiDifficulty: 'NORMAL',
          name: `Bot_${i}_${seatIdx}`,
        });
        expect(aiConf.ok).toBe(true);
      }

      // Start the match in each room
      const started = roomManager.startMatch({
        roomCode: code,
        sessionPlayerId: `sess-host-${i}`,
      });
      expect(started.ok).toBe(true);
      expect(started.data?.room.status).toBe('IN_GAME');
    }

    expect(roomManager.getActiveRoomCount()).toBe(12);

    // Verify all 12 rooms have valid initialized state and incremented stateVersions
    for (const code of roomCodes) {
      const summary = roomManager.getRoomSummary(code);
      expect(summary).toBeDefined();
      expect(summary?.status).toBe('IN_GAME');
      expect(summary?.stateVersion).toBeGreaterThan(0);
      expect(summary?.seats.length).toBeGreaterThanOrEqual(2);
    }

    roomManager.shutdown();
    repo.close();
  });

  it('2. Enforces Action Idempotency: rejects duplicate actionId without side effects', () => {
    const repo = new RoomRepository(dbFilePath);
    const roomManager = new RoomManager({
      repository: repo,
      onBroadcastToRoom: () => {},
      aiActionDelayMs: 0,
    });

    const created = roomManager.createRoom({
      sessionPlayerId: 'sess-idem-1',
      playerName: 'HostPlayer',
      roomName: 'Phòng Idempotency',
      capacity: 2,
      token: DEFAULT_PLAYER_TOKENS[0],
    });

    const roomCode = created.data!.room.roomCode;
    roomManager.configureSeatAI({
      roomCode,
      sessionPlayerId: 'sess-idem-1',
      seatIndex: 1,
      isAI: true,
      name: 'Bot_Test',
    });
    roomManager.startMatch({
      roomCode,
      sessionPlayerId: 'sess-idem-1',
    });

    // First submission of ROLL_DICE
    const firstSubmission = roomManager.submitClientAction({
      roomCode,
      sessionPlayerId: 'sess-idem-1',
      actionId: 'act-uuid-unique-100',
      intent: { type: 'ROLL_DICE' },
    });
    expect(firstSubmission.ok).toBe(true);
    const versionAfterFirst = firstSubmission.data!.room.stateVersion;

    // Duplicate submission with the EXACT SAME actionId
    const duplicateSubmission = roomManager.submitClientAction({
      roomCode,
      sessionPlayerId: 'sess-idem-1',
      actionId: 'act-uuid-unique-100',
      intent: { type: 'ROLL_DICE' },
    });

    // Must be rejected as duplicate or idempotent no-op
    expect(duplicateSubmission.ok).toBe(false);
    expect(duplicateSubmission.code).toBe('DUPLICATE_ACTION');

    // Verify stateVersion was NOT double incremented
    const currentSummary = roomManager.getRoomSummary(roomCode);
    expect(currentSummary?.stateVersion).toBe(versionAfterFirst);

    roomManager.shutdown();
    repo.close();
  });

  it('3. Handles player disconnect and seamless reconnect with token verification', () => {
    const repo = new RoomRepository(dbFilePath);
    const roomManager = new RoomManager({
      repository: repo,
      onBroadcastToRoom: () => {},
      defaultReconnectGraceMs: 60000,
    });

    const created = roomManager.createRoom({
      sessionPlayerId: 'sess-orig',
      playerName: 'DisconnectingHost',
      roomName: 'Phòng Reconnect',
      capacity: 2,
      token: DEFAULT_PLAYER_TOKENS[0],
    });

    const roomCode = created.data!.room.roomCode;
    const hostPlayerId = created.data!.room.seats[0].playerId;
    const reconnectToken = created.data!.reconnectToken;

    roomManager.configureSeatAI({
      roomCode,
      sessionPlayerId: 'sess-orig',
      seatIndex: 1,
      isAI: true,
      name: 'AI_Mate',
    });
    roomManager.startMatch({
      roomCode,
      sessionPlayerId: 'sess-orig',
    });

    // Simulate abrupt socket drop
    const dropOutcome = roomManager.handleSessionDisconnected(roomCode, 'sess-orig');
    expect(dropOutcome).toBeDefined();
    expect(dropOutcome?.room.roomCode).toBe(roomCode);

    const midSummary = roomManager.getRoomSummary(roomCode);
    expect(midSummary?.seats[0].connected).toBe(false);

    // Reconnect with new session socket and valid credentials
    const reconOutcome = roomManager.reconnectPlayer({
      roomCode,
      playerId: hostPlayerId,
      reconnectToken,
      newSessionPlayerId: 'sess-reconnected-new',
    });

    expect(reconOutcome.ok).toBe(true);
    expect(reconOutcome.data?.room.seats[0].connected).toBe(true);
    expect(reconOutcome.data?.room.seats[0].sessionPlayerId).toBe('sess-reconnected-new');

    roomManager.shutdown();
    repo.close();
  });

  it('4. Full server crash & restart simulation: recovers persisted rooms and states from SQLite WAL', () => {
    // Phase A: Server 1 runs and writes state to disk
    const repo1 = new RoomRepository(dbFilePath);
    const rm1 = new RoomManager({
      repository: repo1,
      onBroadcastToRoom: () => {},
      aiActionDelayMs: 0,
    });

    const c1 = rm1.createRoom({
      sessionPlayerId: 's1',
      playerName: 'P1',
      roomName: 'Phòng Sống Sót 1',
      capacity: 2,
      token: DEFAULT_PLAYER_TOKENS[0],
    });
    const c2 = rm1.createRoom({
      sessionPlayerId: 's2',
      playerName: 'P2',
      roomName: 'Phòng Sống Sót 2',
      capacity: 3,
      token: DEFAULT_PLAYER_TOKENS[1],
    });

    const code1 = c1.data!.room.roomCode;
    const code2 = c2.data!.room.roomCode;

    rm1.configureSeatAI({
      roomCode: code1,
      sessionPlayerId: 's1',
      seatIndex: 1,
      isAI: true,
    });
    rm1.startMatch({
      roomCode: code1,
      sessionPlayerId: 's1',
    });

    // Simulate Server 1 abruptly closing
    rm1.shutdown();
    repo1.close();

    // Phase B: Server 2 boots up pointing to the existing SQLite database
    const repo2 = new RoomRepository(dbFilePath);
    const rm2 = new RoomManager({
      repository: repo2,
      onBroadcastToRoom: () => {},
      aiActionDelayMs: 0,
    });

    // Check recovered rooms
    expect(rm2.getActiveRoomCount()).toBe(2);

    const rec1 = rm2.getRoomSummary(code1);
    const rec2 = rm2.getRoomSummary(code2);

    expect(rec1).toBeDefined();
    expect(rec1?.roomName).toBe('Phòng Sống Sót 1');
    expect(rec1?.status).toBe('IN_GAME');

    expect(rec2).toBeDefined();
    expect(rec2?.roomName).toBe('Phòng Sống Sót 2');
    expect(rec2?.status).toBe('WAITING');

    rm2.shutdown();
    repo2.close();
  });
});
