import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { GameState } from '../game/types';
import { DisconnectPolicy, RoomSeatMember, RoomStatus } from '../multiplayer/protocol';

export interface PersistedRoomRecord {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: RoomStatus;
  capacity: number;
  hostPlayerId: string;
  seats: RoomSeatMember[];
  reconnectTokenHashes: Record<string, string>; // playerId -> SHA-256 hash of reconnectToken
  config: GameState['config'];
  disconnectPolicy: DisconnectPolicy;
  reconnectGraceMs: number;
  stateVersion: number;
  prngState: number;
  secretSeed: number;
  gameState: GameState | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface PersistedActionAuditRecord {
  roomCode: string;
  stateVersion: number;
  actionId: string;
  actorPlayerId: string;
  actionType: string;
  payloadJson: string;
  timestamp: number;
}

export class RoomRepository {
  private db: DatabaseSync;

  constructor(dbFilePath: string = ':memory:') {
    if (dbFilePath !== ':memory:') {
      const dir = path.dirname(dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbFilePath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        status TEXT NOT NULL,
        state_version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        record_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_status_expires
        ON rooms (status, expires_at);

      CREATE TABLE IF NOT EXISTS action_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        state_version INTEGER NOT NULL,
        action_id TEXT NOT NULL,
        actor_player_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_room_version
        ON action_audit_log (room_code, state_version);
    `);
  }

  saveRoom(record: PersistedRoomRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (
        room_code, room_id, status, state_version, updated_at, expires_at, record_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_code) DO UPDATE SET
        status = excluded.status,
        state_version = excluded.state_version,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at,
        record_json = excluded.record_json
    `);

    stmt.run(
      record.roomCode,
      record.roomId,
      record.status,
      record.stateVersion,
      record.updatedAt,
      record.expiresAt,
      JSON.stringify(record)
    );
  }

  saveRoomAndActionAudit(record: PersistedRoomRecord, audit: PersistedActionAuditRecord): void {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      this.saveRoom(record);
      const auditStmt = this.db.prepare(`
        INSERT INTO action_audit_log (
          room_code, state_version, action_id, actor_player_id, action_type, payload_json, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      auditStmt.run(
        audit.roomCode,
        audit.stateVersion,
        audit.actionId,
        audit.actorPlayerId,
        audit.actionType,
        audit.payloadJson,
        audit.timestamp
      );
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  getRoom(roomCode: string): PersistedRoomRecord | null {
    const stmt = this.db.prepare(`SELECT record_json FROM rooms WHERE room_code = ?`);
    const row = stmt.get(roomCode) as { record_json?: string } | undefined;
    if (!row || !row.record_json) return null;
    try {
      return JSON.parse(row.record_json) as PersistedRoomRecord;
    } catch {
      return null;
    }
  }

  loadAllActiveRooms(now: number = Date.now()): PersistedRoomRecord[] {
    const stmt = this.db.prepare(`
      SELECT record_json FROM rooms
      WHERE status != 'EXPIRED' AND expires_at > ?
    `);
    const rows = stmt.all(now) as Array<{ record_json: string }>;
    const results: PersistedRoomRecord[] = [];
    for (const row of rows) {
      try {
        results.push(JSON.parse(row.record_json) as PersistedRoomRecord);
      } catch {
        // Ignore corrupted row
      }
    }
    return results;
  }

  getActionAuditLog(roomCode: string): PersistedActionAuditRecord[] {
    const stmt = this.db.prepare(`
      SELECT room_code, state_version, action_id, actor_player_id, action_type, payload_json, timestamp
      FROM action_audit_log
      WHERE room_code = ?
      ORDER BY state_version ASC
    `);
    const rows = stmt.all(roomCode) as Array<{
      room_code: string;
      state_version: number;
      action_id: string;
      actor_player_id: string;
      action_type: string;
      payload_json: string;
      timestamp: number;
    }>;
    return rows.map(r => ({
      roomCode: r.room_code,
      stateVersion: r.state_version,
      actionId: r.action_id,
      actorPlayerId: r.actor_player_id,
      actionType: r.action_type,
      payloadJson: r.payload_json,
      timestamp: r.timestamp,
    }));
  }

  deleteRoom(roomCode: string): void {
    const stmt = this.db.prepare(`DELETE FROM rooms WHERE room_code = ?`);
    stmt.run(roomCode);
  }

  pruneExpiredRooms(now: number = Date.now()): { expiredRoomsDeleted: number; walCheckpointed: number } {
    const stmt = this.db.prepare(`
      DELETE FROM rooms
      WHERE status = 'EXPIRED' OR expires_at <= ?
    `);
    const result = stmt.run(now) as { changes?: number };
    const ckpt = this.walCheckpoint('PASSIVE');
    return {
      expiredRoomsDeleted: Number(result?.changes ?? 0),
      walCheckpointed: ckpt.checkpointed,
    };
  }

  checkIntegrity(): { ok: boolean; status: string } {
    try {
      const stmt = this.db.prepare('PRAGMA integrity_check');
      const row = stmt.get() as { integrity_check?: string } | undefined;
      const status = row?.integrity_check ?? 'unknown';
      return { ok: status === 'ok', status };
    } catch (err: any) {
      return { ok: false, status: err?.message || String(err) };
    }
  }

  walCheckpoint(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'PASSIVE'): {
    busy: number;
    log: number;
    checkpointed: number;
  } {
    try {
      const stmt = this.db.prepare(`PRAGMA wal_checkpoint(${mode})`);
      const row = stmt.get() as { busy?: number; log?: number; checkpointed?: number } | undefined;
      return {
        busy: row?.busy ?? 0,
        log: row?.log ?? 0,
        checkpointed: row?.checkpointed ?? 0,
      };
    } catch {
      return { busy: -1, log: -1, checkpointed: -1 };
    }
  }

  backup(targetFilePath: string): void {
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
    }
    const escapedPath = targetFilePath.replace(/'/g, "''");
    this.db.exec(`VACUUM INTO '${escapedPath}'`);
  }

  getStats(): { roomCount: number; auditCount: number; journalMode: string } {
    const roomStmt = this.db.prepare('SELECT COUNT(*) as count FROM rooms');
    const roomRow = roomStmt.get() as { count?: number } | undefined;
    const auditStmt = this.db.prepare('SELECT COUNT(*) as count FROM action_audit_log');
    const auditRow = auditStmt.get() as { count?: number } | undefined;
    const jStmt = this.db.prepare('PRAGMA journal_mode');
    const jRow = jStmt.get() as { journal_mode?: string } | undefined;

    return {
      roomCount: roomRow?.count ?? 0,
      auditCount: auditRow?.count ?? 0,
      journalMode: jRow?.journal_mode ?? 'unknown',
    };
  }

  close(): void {
    this.db.close();
  }
}
