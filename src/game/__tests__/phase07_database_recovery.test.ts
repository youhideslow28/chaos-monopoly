import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { RoomRepository, PersistedRoomRecord } from '../../server/roomRepository';
import { ChaosMultiplayerServer } from '../../server/multiplayerServer';
import { INITIAL_GAME_STATE } from '../gameReducer';

describe('Phase 07 — SQLite WAL Integrity, Backup & Disaster Recovery', () => {
  let tempDir: string;
  let dbPath: string;
  let backupPath: string;
  let repo: RoomRepository;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-sqlite-test-'));
    dbPath = path.join(tempDir, 'chaos_game.db');
    backupPath = path.join(tempDir, 'chaos_backup.db');
    repo = new RoomRepository(dbPath);
  });

  afterEach(() => {
    try {
      repo.close();
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  const createDummyRoom = (code: string): PersistedRoomRecord => ({
    roomId: `room-${code}`,
    roomCode: code,
    roomName: `Phòng ${code}`,
    status: 'IN_GAME',
    capacity: 4,
    hostPlayerId: 'p-1',
    seats: [
      {
        seatIndex: 0,
        playerId: 'p-1',
        sessionPlayerId: 'sess-p-1',
        name: 'Chủ phòng',
        isHost: true,
        isAI: false,
        connected: true,
        isReady: true,
        disconnectedAt: null,
        reconnectDeadlineAt: null,
        token: { id: 't1', name: 'Xe', symbol: '🚗', colorHex: '#ff0000', accentHex: '#ff4444' },
      },
    ],
    reconnectTokenHashes: { 'p-1': 'dummyhash' },
    config: INITIAL_GAME_STATE.config,
    disconnectPolicy: 'AI_TAKEOVER',
    reconnectGraceMs: 30000,
    stateVersion: 12,
    prngState: 98765,
    secretSeed: 12345,
    gameState: INITIAL_GAME_STATE,
    createdAt: Date.now() - 5000,
    updatedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  });

  it('1. PRAGMA integrity_check verifies database health', () => {
    const check = repo.checkIntegrity();
    expect(check.ok).toBe(true);
    expect(check.status).toBe('ok');

    const stats = repo.getStats();
    expect(stats.roomCount).toBe(0);
    expect(stats.auditCount).toBe(0);
    expect(stats.journalMode.toLowerCase()).toBe('wal');
  });

  it('2. WAL Checkpoint flushes logs without locking the repository', () => {
    repo.saveRoom(createDummyRoom('CHAOS-WAL1'));
    repo.saveRoom(createDummyRoom('CHAOS-WAL2'));

    const checkpoint = repo.walCheckpoint('PASSIVE');
    expect(checkpoint.busy).toBe(0);
    expect(checkpoint.checkpointed).toBeGreaterThanOrEqual(0);

    const stats = repo.getStats();
    expect(stats.roomCount).toBe(2);
  });

  it('3. Atomic VACUUM INTO creates a verifiable, fully restorable backup file', () => {
    const roomA = createDummyRoom('CHAOS-BK1');
    const roomB = createDummyRoom('CHAOS-BK2');
    repo.saveRoom(roomA);
    repo.saveRoom(roomB);

    repo.saveRoomAndActionAudit(roomA, {
      roomCode: 'CHAOS-BK1',
      stateVersion: 13,
      actionId: 'act-audit-1',
      actorPlayerId: 'p-1',
      actionType: 'ROLL_DICE',
      payloadJson: JSON.stringify({}),
      timestamp: Date.now(),
    });

    // Create backup snapshot
    repo.backup(backupPath);
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.statSync(backupPath).size).toBeGreaterThan(0);

    // Open restored database with a completely fresh repository instance
    const restoredRepo = new RoomRepository(backupPath);
    try {
      const integrity = restoredRepo.checkIntegrity();
      expect(integrity.ok).toBe(true);

      const restoredA = restoredRepo.getRoom('CHAOS-BK1');
      const restoredB = restoredRepo.getRoom('CHAOS-BK2');
      expect(restoredA?.roomName).toBe('Phòng CHAOS-BK1');
      expect(restoredB?.roomName).toBe('Phòng CHAOS-BK2');

      const auditLog = restoredRepo.getActionAuditLog('CHAOS-BK1');
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].actionId).toBe('act-audit-1');
      expect(auditLog[0].actionType).toBe('ROLL_DICE');
    } finally {
      restoredRepo.close();
    }
  });

  it('4. Transactional atomicity: rollback prevents partial state corruption', () => {
    const room = createDummyRoom('CHAOS-ROLL');

    // Attempt an audit insert with broken schema or simulated failure
    expect(() => {
      // Intentionally pass an invalid audit record that throws an error
      repo.saveRoomAndActionAudit(room, {
        roomCode: null as any, // violates NOT NULL constraint
        stateVersion: 1,
        actionId: 'err-act',
        actorPlayerId: 'p-1',
        actionType: 'ERROR',
        payloadJson: '{}',
        timestamp: Date.now(),
      });
    }).toThrow();

    // Verify that the room record was NOT saved (atomic rollback succeeded)
    const fetched = repo.getRoom('CHAOS-ROLL');
    expect(fetched).toBeNull();
  });

  it('5. Fault tolerance: loadAllActiveRooms gracefully ignores corrupted records', () => {
    repo.saveRoom(createDummyRoom('CHAOS-OK1'));
    repo.saveRoom(createDummyRoom('CHAOS-OK2'));

    // Inject a manually corrupted JSON string into SQLite
    (repo as any).db.exec(`
      INSERT INTO rooms (room_code, room_id, status, state_version, updated_at, expires_at, record_json)
      VALUES ('CHAOS-CORRUPT', 'r-corrupt', 'PLAYING', 1, 1000, 999999999999, 'INVALID{JSON:BROKEN');
    `);

    const activeRooms = repo.loadAllActiveRooms();
    // Must return the 2 valid rooms without throwing syntax errors
    expect(activeRooms.length).toBe(2);
    expect(activeRooms.some((r) => r.roomCode === 'CHAOS-OK1')).toBe(true);
    expect(activeRooms.some((r) => r.roomCode === 'CHAOS-OK2')).toBe(true);
  });

  it('6. HTTP /api/health and /api/ready return status 200 with DB integrity telemetry', async () => {
    const server = new ChaosMultiplayerServer({
      port: 0,
      host: '127.0.0.1',
      dbFilePath: dbPath,
      silentLogs: true,
    });

    const port = await server.listen(0, '127.0.0.1');

    const fetchJson = (endpoint: string): Promise<{ statusCode: number; data: any }> => {
      return new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${port}${endpoint}`, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              resolve({ statusCode: res.statusCode || 0, data: JSON.parse(body) });
            });
          })
          .on('error', reject);
      });
    };

    try {
      const health = await fetchJson('/api/health');
      expect(health.statusCode).toBe(200);
      expect(health.data.status).toBe('ok');
      expect(health.data.database.integrity).toBe('ok');
      expect(health.data.database.journalMode.toLowerCase()).toBe('wal');

      const ready = await fetchJson('/api/ready');
      expect(ready.statusCode).toBe(200);
      expect(ready.data.ready).toBe(true);
      expect(ready.data.storage).toBe('sqlite-wal');
    } finally {
      await server.stop();
    }
  });
});
