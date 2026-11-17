import crypto from 'node:crypto';
import { DEFAULT_PLAYER_TOKENS } from '../game/board/boardData';
import { computeNextAIDecision, getActiveAIActor } from '../game/ai/aiDecisionEngine';
import { SeededPRNG } from '../game/chaos-engine/prng';
import { gameReducer, INITIAL_GAME_CONFIG, INITIAL_GAME_STATE } from '../game/gameReducer';
import { getTradeResponderId } from '../game/trade/tradeEngine';
import {
  AIDifficulty,
  AIPersonalityId,
  GameAction,
  GameConfig,
  GameState,
  PlayerId,
  PlayerToken,
} from '../game/types';
import {
  ClientIntentPayload,
  DisconnectPolicy,
  PROTOCOL_VERSION,
  RoomPublicSummary,
  RoomSeatMember,
  ServerErrorCode,
  ServerToClientMessage,
} from '../multiplayer/protocol';
import { PersistedRoomRecord, RoomRepository } from './roomRepository';
import { DEFAULT_WORLD_ID } from '../worlds/types';
import { getCatalogEntry, isWorldSelectable } from '../worlds/catalog';
import { sanitizePlayerCosmetics } from '../cosmetics/catalog';
import { PlayerCosmetics } from '../cosmetics/types';
import { BUSINESS_CATALOG } from '../game/business/businessCatalog';
import {
  generateSecureRoomCode,
  generateSecureSeed32,
  generateSecureToken,
  hashSecretToken,
  sanitizeDisplayText,
  verifySecretTokenHash,
} from './security';

/**
 * Returns `desired`, or `desired 2`, `desired 3`, ... when another seat already uses that name
 * (case-insensitive), so two players never look identical on the board.
 */
export function uniqueSeatName(seats: Pick<RoomSeatMember, 'name'>[], desired: string): string {
  const taken = new Set(seats.map((s) => s.name.trim().toLowerCase()));
  if (!taken.has(desired.trim().toLowerCase())) return desired;
  for (let n = 2; n <= 9; n++) {
    const suffix = ` ${n}`;
    const candidate = `${desired.slice(0, 24 - suffix.length)}${suffix}`;
    if (!taken.has(candidate.trim().toLowerCase())) return candidate;
  }
  return desired;
}

export interface RoomManagerOptions {
  repository: RoomRepository;
  onBroadcastToRoom: (roomCode: string, message: ServerToClientMessage) => void;
  defaultReconnectGraceMs?: number;
  roomExpirationMs?: number;
  aiActionDelayMs?: number;
  deterministicTestSeed?: number;
  turnTimeoutMs?: number;
  turnPostponeMs?: number;
}

interface ManagedRoom extends PersistedRoomRecord {
  prng: SeededPRNG;
  aiStepCount: number;
  lastActivePlayerId: string | null;
  aiTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimers: Map<PlayerId, ReturnType<typeof setTimeout>>;
  turnDeadlineAt: number | null;
}

export interface RoomOperationResult<T = undefined> {
  ok: boolean;
  code?: ServerErrorCode;
  messageVi?: string;
  data?: T;
}

export function sanitizeStateForClient(state: GameState | null, viewingPlayerId?: string): GameState | null {
  if (!state) return null;
  const baseLogs = Array.isArray(state.logs) ? state.logs.slice(0, 80) : undefined;
  const sanitizedConfig = state.config ? { ...state.config } : undefined;
  if (sanitizedConfig) {
    delete sanitizedConfig.seed;
  }
  return {
    ...state,
    ...(sanitizedConfig ? { config: sanitizedConfig } : {}),
    placedTraps: state.placedTraps?.map(trap => {
      if (!trap.revealed && trap.ownerPlayerId !== viewingPlayerId) {
        return {
          ...trap,
          trapType: 'HIDDEN' as any,
          ownerPlayerId: undefined as any,
        };
      }
      return trap;
    }),
    ...(baseLogs ? { logs: baseLogs } : {}),
  };
}

export function validateClientIntent(
  intent: any,
  _state?: any,
  _senderPlayerId?: string
): { isValid: boolean; error?: string } {
  if (!intent || !intent.type) {
    return { isValid: false, error: 'MISSING_INTENT_TYPE' };
  }

  switch (intent.type) {
    case 'CHOOSE_PATH':
    case 'CHOOSE_BRANCH_PATH': {
      if (!intent.targetNodeId) return { isValid: false, error: 'MISSING_TARGET_NODE' };
      return { isValid: true };
    }
    case 'PLACE_TRAP': {
      if (!intent.nodeId || !intent.trapType) return { isValid: false, error: 'INVALID_TRAP_PAYLOAD' };
      return { isValid: true };
    }
    case 'SELECT_BUSINESS_TYPE': {
      if (!intent.businessId) return { isValid: false, error: 'MISSING_BUSINESS_ID' };
      if (!BUSINESS_CATALOG[intent.businessId]) return { isValid: false, error: 'UNKNOWN_BUSINESS_ID' };
      return { isValid: true };
    }
    default:
      return { isValid: true };
  }
}

export class RoomManager {
  private rooms: Map<string, ManagedRoom> = new Map();
  private readonly defaultReconnectGraceMs: number;
  private readonly roomExpirationMs: number;
  private readonly aiActionDelayMs: number;
  private readonly turnTimeoutMs: number;
  private readonly turnPostponeMs: number;
  private turnTicker: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: RoomManagerOptions) {
    this.defaultReconnectGraceMs = options.defaultReconnectGraceMs ?? 60_000;
    this.roomExpirationMs = options.roomExpirationMs ?? 2 * 60 * 60 * 1000; // 2 hours
    this.aiActionDelayMs = options.aiActionDelayMs ?? 120;
    this.turnTimeoutMs = options.turnTimeoutMs ?? 60_000;
    this.turnPostponeMs = options.turnPostponeMs ?? 30_000;
    this.recoverRoomsFromRepository();
    this.turnTicker = setInterval(() => this.tickTurnTimers(), 1000);
    this.turnTicker.unref?.();
  }

  /**
   * Restores all active non-expired rooms from SQLite on server startup / restart.
   */
  public recoverRoomsFromRepository(): number {
    const now = Date.now();
    const persistedRooms = this.options.repository.loadAllActiveRooms(now);
    let recoveredCount = 0;

    for (const rec of persistedRooms) {
      const prng = new SeededPRNG(rec.secretSeed);
      // Restore exact PRNG internal state
      (prng as any).state = rec.prngState;

      // Mark any previously connected human players as temporarily disconnected on server restart
      // so they can reconnect within the grace period.
      const updatedSeats = rec.seats.map(s => {
        if (!s.isAI && s.connected) {
          // Only mark as disconnected if this is a first-time server boot recovery,
          // or keep disconnectedAt/reconnectDeadlineAt if already set.
          return {
            ...s,
            connected: false,
            disconnectedAt: s.disconnectedAt ?? now,
            reconnectDeadlineAt: s.reconnectDeadlineAt ?? now + rec.reconnectGraceMs,
          };
        }
        return s;
      });

      const managed: ManagedRoom = {
        ...rec,
        seats: updatedSeats,
        prng,
        aiStepCount: 0,
        lastActivePlayerId: null,
        aiTimer: null,
        disconnectTimers: new Map(),
        turnDeadlineAt: null,
      };

      this.rooms.set(managed.roomCode, managed);

      // Schedule reconnect grace timers for disconnected humans if match is in progress
      if (managed.status === 'IN_GAME') {
        for (const seat of managed.seats) {
          if (!seat.isAI && !seat.connected && !seat.takenOverByAI) {
            this.scheduleDisconnectGraceTimer(managed, seat.playerId, managed.reconnectGraceMs);
          }
        }
        this.scheduleAITurnIfNeeded(managed);
        this.syncTurnDeadline(managed);
      }

      recoveredCount += 1;
    }

    return recoveredCount;
  }

  public toPublicSummary(room: ManagedRoom): RoomPublicSummary {
    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      status: room.status,
      capacity: room.capacity,
      hostPlayerId: room.hostPlayerId,
      seats: room.seats.map(s => ({ ...s })),
      config: {
        ...room.config,
        worldId: room.config.worldId ?? DEFAULT_WORLD_ID,
        seed: undefined,
      },
      disconnectPolicy: room.disconnectPolicy,
      reconnectGraceMs: room.reconnectGraceMs,
      stateVersion: room.stateVersion,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt,
      turnDeadlineAt: room.turnDeadlineAt,
    };
  }

  /**
   * The turn clock runs only for a connected human whose turn it is in a playing room.
   * AI seats, disconnected seats (grace period) and finished matches have no deadline.
   */
  private computeTurnDeadline(room: ManagedRoom, now: number): number | null {
    if (room.status !== 'IN_GAME' || !room.gameState || room.gameState.status !== 'PLAYING') {
      return null;
    }
    const actor = room.gameState.players[room.gameState.activePlayerIndex];
    const seat = actor ? room.seats.find(s => s.playerId === actor.id) : undefined;
    if (!seat || seat.isAI || !seat.connected) return null;
    return now + this.turnTimeoutMs;
  }

  private syncTurnDeadline(room: ManagedRoom, now: number = Date.now()): void {
    room.turnDeadlineAt = this.computeTurnDeadline(room, now);
  }

  /**
   * Server-side turn clock. Expired roll/end-turn decisions are executed through the same
   * authoritative pipeline as player intents. Other phases (auction, trade, debt, chaos) are
   * postponed rather than decided on the player's behalf.
   */
  public tickTurnTimers(now: number = Date.now()): void {
    for (const room of this.rooms.values()) {
      if (room.turnDeadlineAt === null || now < room.turnDeadlineAt) continue;
      this.expireTurn(room, now);
    }
  }

  private expireTurn(room: ManagedRoom, now: number): void {
    const state = room.gameState;
    const actor = state ? state.players[state.activePlayerIndex] : undefined;
    const seat = actor ? room.seats.find(s => s.playerId === actor.id) : undefined;
    if (!state || !actor || !seat || seat.isAI || !seat.connected || room.status !== 'IN_GAME') {
      this.syncTurnDeadline(room, now);
      return;
    }

    let intent: ClientIntentPayload | null = null;
    if (state.turnPhase === 'WAITING_FOR_ROLL' || state.turnPhase === 'ROLLING') {
      intent = { type: 'ROLL_DICE' };
    } else if (state.turnPhase === 'ACTION_MENU') {
      intent = { type: 'END_TURN' };
    }

    const postpone = (reason: string) => {
      room.turnDeadlineAt = now + this.turnPostponeMs;
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: 'ROOM_UPDATED',
        room: this.toPublicSummary(room),
        reason,
        serverTimestamp: Date.now(),
      });
    };

    if (!intent) {
      postpone(`${seat.name} chưa quyết định kịp. Hạn được gia hạn thêm 30 giây.`);
      return;
    }

    const actionId = `timeout-${room.roomCode}-v${room.stateVersion}-${now}`;
    const result = this.executeAuthoritativeIntent(room, actor.id, actionId, intent);
    if (!result.ok || !result.data) {
      postpone(`${seat.name} hết giờ nhưng chưa thể tự động thực hiện nước đi.`);
      return;
    }

    this.options.onBroadcastToRoom(room.roomCode, {
      version: PROTOCOL_VERSION,
      type: 'STATE_SYNC',
      roomCode: room.roomCode,
      stateVersion: result.data.stateVersion,
      lastActionType: result.data.actionType,
      lastActorPlayerId: result.data.actorPlayerId,
      actionId,
      gameState: result.data.gameState,
      room: result.data.room,
      serverTimestamp: Date.now(),
    });

    if (result.data.room.status === 'FINISHED') {
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: 'MATCH_FINISHED',
        roomCode: room.roomCode,
        winner: result.data.gameState.winner,
        gameState: result.data.gameState,
        room: result.data.room,
        stateVersion: result.data.stateVersion,
        serverTimestamp: Date.now(),
      });
    }
  }

  private persistRoom(room: ManagedRoom): void {
    room.prngState = room.prng.getState();
    room.updatedAt = Date.now();
    const record: PersistedRoomRecord = {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      status: room.status,
      capacity: room.capacity,
      hostPlayerId: room.hostPlayerId,
      seats: room.seats,
      reconnectTokenHashes: room.reconnectTokenHashes,
      config: room.config,
      disconnectPolicy: room.disconnectPolicy,
      reconnectGraceMs: room.reconnectGraceMs,
      stateVersion: room.stateVersion,
      prngState: room.prngState,
      secretSeed: room.secretSeed,
      gameState: room.gameState,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt,
    };
    this.options.repository.saveRoom(record);
  }

  private updateLobbyStatus(room: ManagedRoom): void {
    if (room.status === 'IN_GAME' || room.status === 'FINISHED' || room.status === 'EXPIRED') {
      return;
    }
    const activeParticipants = room.seats.length;
    const allReady = room.seats.every(s => s.isAI || s.isReady);
    room.status = activeParticipants >= 2 && allReady ? 'READY' : 'WAITING';
  }

  public createRoom(params: {
    sessionPlayerId: string;
    playerName: string;
    roomName?: string;
    capacity?: number;
    token?: PlayerToken;
    cosmetics?: PlayerCosmetics;
    config?: Partial<GameConfig>;
    disconnectPolicy?: DisconnectPolicy;
    reconnectGraceMs?: number;
  }): RoomOperationResult<{
    room: RoomPublicSummary;
    assignedPlayerId: PlayerId;
    reconnectToken: string;
    gameState: GameState | null;
  }> {
    const now = Date.now();
    // Phase 05: the server is the only authority on which World a room uses.
    let worldIdForRoom: string = DEFAULT_WORLD_ID;
    if (params.config?.worldId !== undefined) {
      if (!isWorldSelectable(params.config.worldId)) {
        return {
          ok: false,
          code: 'INVALID_WORLD',
          messageVi: 'Thế giới được chọn không tồn tại hoặc chưa mở.',
        };
      }
      worldIdForRoom = params.config.worldId;
    }
    const existingCodes = new Set(this.rooms.keys());
    const roomCode = generateSecureRoomCode(existingCodes);
    const roomId = `room-${crypto.randomUUID()}`;
    const capacity = Math.min(4, Math.max(2, params.capacity ?? 4));
    const secretSeed = this.options.deterministicTestSeed ?? generateSecureSeed32();
    const prng = new SeededPRNG(secretSeed);

    const assignedPlayerId: PlayerId = 'player-1';
    const reconnectToken = generateSecureToken(24);
    const reconnectHash = hashSecretToken(reconnectToken);

    const hostToken = params.token || DEFAULT_PLAYER_TOKENS[0];
    const hostSeat: RoomSeatMember = {
      seatIndex: 0,
      playerId: assignedPlayerId,
      sessionPlayerId: params.sessionPlayerId,
      name: sanitizeDisplayText(params.playerName, 24, 'Người chơi 1'),
      token: hostToken,
      isHost: true,
      isReady: true,
      isAI: false,
      connected: true,
      disconnectedAt: null,
      reconnectDeadlineAt: null,
      cosmetics: params.cosmetics ? sanitizePlayerCosmetics(params.cosmetics) : undefined,
    };

    const config: GameConfig = {
      ...INITIAL_GAME_CONFIG,
      startingCash: params.config?.startingCash
        ? Math.min(5000, Math.max(500, Math.floor(params.config.startingCash)))
        : INITIAL_GAME_CONFIG.startingCash,
      // 0 = no round cap: the match ends on bankruptcy.
      maxRounds: params.config?.maxRounds ? Math.max(0, Math.floor(params.config.maxRounds)) : 0,
      seed: secretSeed,
      worldId: worldIdForRoom,
      gameMode: params.config?.gameMode || 'CLASSIC',
    };

    const managed: ManagedRoom = {
      roomId,
      roomCode,
      roomName: sanitizeDisplayText(params.roomName, 36, `Phòng của ${hostSeat.name}`),
      status: 'WAITING',
      capacity,
      hostPlayerId: assignedPlayerId,
      seats: [hostSeat],
      reconnectTokenHashes: {
        [assignedPlayerId]: reconnectHash,
      },
      config,
      disconnectPolicy: params.disconnectPolicy || 'AI_TAKEOVER',
      reconnectGraceMs: params.reconnectGraceMs ?? this.defaultReconnectGraceMs,
      stateVersion: 1,
      prngState: prng.getState(),
      secretSeed,
      gameState: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.roomExpirationMs,
      prng,
      aiStepCount: 0,
      lastActivePlayerId: null,
      aiTimer: null,
      disconnectTimers: new Map(),
      turnDeadlineAt: null,
    };

    this.rooms.set(roomCode, managed);
    this.persistRoom(managed);

    return {
      ok: true,
      data: {
        room: this.toPublicSummary(managed),
        assignedPlayerId,
        reconnectToken,
        gameState: null,
      },
    };
  }

  public joinRoom(params: {
    roomCode: string;
    sessionPlayerId: string;
    playerName: string;
    token?: PlayerToken;
    cosmetics?: PlayerCosmetics;
  }): RoomOperationResult<{
    room: RoomPublicSummary;
    assignedPlayerId: PlayerId;
    reconnectToken: string;
    gameState: GameState | null;
  }> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return {
        ok: false,
        code: 'ROOM_NOT_FOUND',
        messageVi: `Không tìm thấy phòng với mã [${params.roomCode}].`,
      };
    }

    if (room.status === 'EXPIRED' || Date.now() > room.expiresAt) {
      room.status = 'EXPIRED';
      this.persistRoom(room);
      return {
        ok: false,
        code: 'ROOM_EXPIRED',
        messageVi: 'Phòng chơi này đã hết hạn.',
      };
    }

    // Prevent duplicate join from the same session
    if (room.seats.some(s => !s.isAI && s.sessionPlayerId === params.sessionPlayerId)) {
      return {
        ok: false,
        code: 'DUPLICATE_JOIN',
        messageVi: 'Phiên kết nối của bạn đã ở trong phòng này.',
      };
    }

    if (room.status === 'IN_GAME' || room.status === 'STARTING' || room.status === 'FINISHED') {
      return {
        ok: false,
        code: 'ROOM_ALREADY_STARTED',
        messageVi: 'Trận đấu đã bắt đầu. Hãy dùng tính năng Kết nối lại (Reconnect) nếu bạn là thành viên cũ.',
      };
    }

    if (room.seats.length >= room.capacity) {
      return {
        ok: false,
        code: 'ROOM_FULL',
        messageVi: `Phòng đã đầy (${room.capacity}/${room.capacity} người chơi).`,
      };
    }

    // Find lowest available seat index 0..capacity-1
    const usedIndices = new Set(room.seats.map(s => s.seatIndex));
    let seatIndex = 0;
    while (usedIndices.has(seatIndex) && seatIndex < room.capacity) {
      seatIndex += 1;
    }

    const assignedPlayerId: PlayerId = `player-${seatIndex + 1}`;
    const reconnectToken = generateSecureToken(24);
    room.reconnectTokenHashes[assignedPlayerId] = hashSecretToken(reconnectToken);

    const usedTokenIds = new Set(room.seats.map(s => s.token.id));
    const chosenToken =
      params.token && !usedTokenIds.has(params.token.id)
        ? params.token
        : DEFAULT_PLAYER_TOKENS.find(t => !usedTokenIds.has(t.id)) ||
          DEFAULT_PLAYER_TOKENS[seatIndex % DEFAULT_PLAYER_TOKENS.length];

    const newSeat: RoomSeatMember = {
      seatIndex,
      playerId: assignedPlayerId,
      sessionPlayerId: params.sessionPlayerId,
      name: uniqueSeatName(
        room.seats,
        sanitizeDisplayText(params.playerName, 24, `Người chơi ${seatIndex + 1}`)
      ),
      token: chosenToken,
      isHost: false,
      isReady: true,
      isAI: false,
      connected: true,
      disconnectedAt: null,
      reconnectDeadlineAt: null,
      cosmetics: params.cosmetics ? sanitizePlayerCosmetics(params.cosmetics) : undefined,
    };

    room.seats.push(newSeat);
    room.seats.sort((a, b) => a.seatIndex - b.seatIndex);
    // Re-normalize playerIds in lobby to match sorted seatIndex
    this.renormalizeLobbyPlayerIds(room);

    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);

    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        assignedPlayerId: newSeat.playerId,
        reconnectToken,
        gameState: sanitizeStateForClient(room.gameState),
      },
    };
  }

  private renormalizeLobbyPlayerIds(room: ManagedRoom): void {
    if (room.status === 'IN_GAME' || room.status === 'FINISHED') return;
    room.seats.sort((a, b) => a.seatIndex - b.seatIndex);
    const updatedHashes: Record<string, string> = {};
    room.seats.forEach((seat, idx) => {
      const oldPlayerId = seat.playerId;
      const newPlayerId = `player-${idx + 1}`;
      seat.seatIndex = idx;
      seat.playerId = newPlayerId;
      if (room.reconnectTokenHashes[oldPlayerId]) {
        updatedHashes[newPlayerId] = room.reconnectTokenHashes[oldPlayerId];
      }
      if (seat.isHost) {
        room.hostPlayerId = newPlayerId;
      }
    });
    room.reconnectTokenHashes = updatedHashes;
  }

  public reconnectPlayer(params: {
    roomCode: string;
    playerId: PlayerId;
    reconnectToken: string;
    newSessionPlayerId: string;
  }): RoomOperationResult<{
    room: RoomPublicSummary;
    assignedPlayerId: PlayerId;
    reconnectToken: string;
    gameState: GameState | null;
  }> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return {
        ok: false,
        code: 'ROOM_NOT_FOUND',
        messageVi: 'Không tìm thấy phòng cần kết nối lại.',
      };
    }

    if (room.status === 'EXPIRED' || Date.now() > room.expiresAt) {
      return {
        ok: false,
        code: 'ROOM_EXPIRED',
        messageVi: 'Phòng chơi đã hết hạn.',
      };
    }

    const expectedHash = room.reconnectTokenHashes[params.playerId];
    if (!verifySecretTokenHash(params.reconnectToken, expectedHash)) {
      return {
        ok: false,
        code: 'INVALID_RECONNECT_TOKEN',
        messageVi: 'Mã xác thực kết nối lại (Reconnect Token) không hợp lệ hoặc bị giả mạo.',
      };
    }

    const seat = room.seats.find(s => s.playerId === params.playerId);
    if (!seat) {
      return {
        ok: false,
        code: 'NOT_ROOM_MEMBER',
        messageVi: 'Không tìm thấy vị trí người chơi trong phòng.',
      };
    }

    // Cancel pending disconnect grace timer
    const existingTimer = room.disconnectTimers.get(params.playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      room.disconnectTimers.delete(params.playerId);
    }

    // Cancel pending AI decision timer so the reconnected human player immediately regains authoritative turn control
    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }

    seat.connected = true;
    seat.disconnectedAt = null;
    seat.reconnectDeadlineAt = null;
    seat.sessionPlayerId = params.newSessionPlayerId;

    // If AI temporarily took over during disconnect, restore human control on reconnect
    if (seat.takenOverByAI && room.gameState) {
      seat.isAI = false;
      seat.takenOverByAI = false;
      room.gameState = {
        ...room.gameState,
        players: room.gameState.players.map(p =>
          p.id === seat.playerId ? { ...p, isAI: false } : p
        ),
      };
    }

    this.syncTurnDeadline(room);
    this.persistRoom(room);
    this.scheduleAITurnIfNeeded(room);

    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        assignedPlayerId: seat.playerId,
        reconnectToken: params.reconnectToken,
        gameState: sanitizeStateForClient(room.gameState),
      },
    };
  }

  public setReady(params: {
    roomCode: string;
    sessionPlayerId: string;
    isReady: boolean;
  }): RoomOperationResult<RoomPublicSummary> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    const seat = room.seats.find(s => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: 'NOT_ROOM_MEMBER', messageVi: 'Bạn không phải là thành viên của phòng này.' };
    }
    seat.isReady = params.isReady;
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }

  public selectToken(params: {
    roomCode: string;
    sessionPlayerId: string;
    token: PlayerToken;
    playerName?: string;
    cosmetics?: PlayerCosmetics;
  }): RoomOperationResult<RoomPublicSummary> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    if (room.status === 'IN_GAME' || room.status === 'FINISHED') {
      return { ok: false, code: 'ROOM_ALREADY_STARTED', messageVi: 'Không thể đổi nhân vật khi trận đấu đã bắt đầu.' };
    }
    const seat = room.seats.find(s => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: 'NOT_ROOM_MEMBER', messageVi: 'Bạn không phải là thành viên của phòng này.' };
    }
    seat.token = params.token;
    if (params.playerName) {
      seat.name = uniqueSeatName(
        room.seats.filter((s) => s !== seat),
        sanitizeDisplayText(params.playerName, 24, seat.name)
      );
    }
    if (params.cosmetics) {
      seat.cosmetics = sanitizePlayerCosmetics(params.cosmetics);
    }
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }

  public broadcastEmote(params: {
    roomCode: string;
    sessionPlayerId: string;
    emoteId: string;
  }): RoomOperationResult<{
    playerId: PlayerId;
    playerName: string;
    emoteId: string;
    serverTimestamp: number;
  }> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    const seat = room.seats.find(s => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return { ok: false, code: 'NOT_ROOM_MEMBER', messageVi: 'Bạn không phải là thành viên của phòng này.' };
    }
    return {
      ok: true,
      data: {
        playerId: seat.playerId,
        playerName: seat.name,
        emoteId: params.emoteId,
        serverTimestamp: Date.now(),
      },
    };
  }

  public configureRoom(params: {
    roomCode: string;
    sessionPlayerId: string;
    capacity?: number;
    config?: Partial<GameConfig>;
    disconnectPolicy?: DisconnectPolicy;
  }): RoomOperationResult<RoomPublicSummary> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    if (room.status === 'IN_GAME' || room.status === 'FINISHED') {
      return {
        ok: false,
        code: 'ROOM_ALREADY_STARTED',
        messageVi: 'Chủ phòng không thể thay đổi cấu hình sau khi trận đấu đã bắt đầu.',
      };
    }
    const hostSeat = room.seats.find(s => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return {
        ok: false,
        code: 'NOT_ROOM_HOST',
        messageVi: 'Chỉ chủ phòng mới có quyền thay đổi cấu hình trận đấu.',
      };
    }

    if (params.capacity !== undefined) {
      const nextCap = Math.min(4, Math.max(2, params.capacity));
      if (nextCap >= room.seats.filter(s => !s.isAI).length) {
        room.capacity = nextCap;
        // Trim extra AI seats if capacity shrunk
        while (room.seats.length > room.capacity) {
          const aiIdx = room.seats.findIndex(s => s.isAI);
          if (aiIdx >= 0) room.seats.splice(aiIdx, 1);
          else break;
        }
        this.renormalizeLobbyPlayerIds(room);
      }
    }

    if (params.config) {
      if (params.config.worldId !== undefined) {
        if (!isWorldSelectable(params.config.worldId)) {
          return {
            ok: false,
            code: 'INVALID_WORLD',
            messageVi: 'Thế giới được chọn không tồn tại hoặc chưa mở.',
          };
        }
        room.config.worldId = params.config.worldId;
        room.config.worldVersion = getCatalogEntry(params.config.worldId)?.version;
      }
      if (typeof params.config.startingCash === 'number') {
        room.config.startingCash = Math.min(5000, Math.max(500, Math.floor(params.config.startingCash)));
      }
      if (typeof params.config.maxRounds === 'number') {
        room.config.maxRounds = Math.max(0, Math.floor(params.config.maxRounds));
      }
      if (params.config.gameMode === 'CLASSIC' || params.config.gameMode === 'CHAOS') {
        room.config.gameMode = params.config.gameMode;
      }
    }

    if (params.disconnectPolicy) {
      room.disconnectPolicy = params.disconnectPolicy;
    }

    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }

  public configureSeatAI(params: {
    roomCode: string;
    sessionPlayerId: string;
    seatIndex: number;
    isAI: boolean;
    aiPersonality?: AIPersonalityId;
    aiDifficulty?: AIDifficulty;
    name?: string;
  }): RoomOperationResult<RoomPublicSummary> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    if (room.status === 'IN_GAME' || room.status === 'FINISHED') {
      return { ok: false, code: 'ROOM_ALREADY_STARTED', messageVi: 'Trận đấu đã bắt đầu.' };
    }
    const hostSeat = room.seats.find(s => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return { ok: false, code: 'NOT_ROOM_HOST', messageVi: 'Chỉ chủ phòng mới được cấu hình AI.' };
    }

    if (params.isAI) {
      const existing = room.seats.find(s => s.seatIndex === params.seatIndex);
      if (existing && !existing.isAI) {
        return {
          ok: false,
          code: 'UNAUTHORIZED_ACTION',
          messageVi: 'Không thể ghi đè vị trí của người chơi thật bằng AI.',
        };
      }
      if (!existing && room.seats.length >= room.capacity) {
        return { ok: false, code: 'ROOM_FULL', messageVi: 'Phòng đã đủ số lượng vị trí tối đa.' };
      }

      const personality = params.aiPersonality || 'STRATEGIST';
      const difficulty = params.aiDifficulty || 'NORMAL';
      const defaultName = params.name || `AI ${personality} #${params.seatIndex + 1}`;

      if (existing) {
        existing.aiPersonality = personality;
        existing.aiDifficulty = difficulty;
        existing.name = defaultName;
      } else {
        room.seats.push({
          seatIndex: params.seatIndex,
          playerId: `player-${room.seats.length + 1}`,
          sessionPlayerId: `AI-seat-${params.seatIndex}`,
          name: defaultName,
          token: DEFAULT_PLAYER_TOKENS[params.seatIndex % DEFAULT_PLAYER_TOKENS.length],
          isHost: false,
          isReady: true,
          isAI: true,
          aiPersonality: personality,
          aiDifficulty: difficulty,
          connected: true,
          disconnectedAt: null,
          reconnectDeadlineAt: null,
        });
      }
    } else {
      // Remove AI seat
      const idx = room.seats.findIndex(s => s.seatIndex === params.seatIndex && s.isAI);
      if (idx >= 0) {
        room.seats.splice(idx, 1);
      }
    }

    this.renormalizeLobbyPlayerIds(room);
    this.updateLobbyStatus(room);
    room.stateVersion += 1;
    this.persistRoom(room);
    return { ok: true, data: this.toPublicSummary(room) };
  }

  public startMatch(params: {
    roomCode: string;
    sessionPlayerId: string;
  }): RoomOperationResult<{
    room: RoomPublicSummary;
    gameState: GameState;
    stateVersion: number;
  }> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }
    if (room.status === 'IN_GAME' || room.status === 'FINISHED') {
      return { ok: false, code: 'ROOM_ALREADY_STARTED', messageVi: 'Trận đấu đã bắt đầu.' };
    }

    const hostSeat = room.seats.find(s => s.playerId === room.hostPlayerId);
    if (!hostSeat || hostSeat.sessionPlayerId !== params.sessionPlayerId) {
      return { ok: false, code: 'NOT_ROOM_HOST', messageVi: 'Chỉ chủ phòng mới có quyền bắt đầu trận đấu.' };
    }

    if (room.seats.length < 2) {
      return {
        ok: false,
        code: 'INVALID_GAME_ACTION',
        messageVi: 'Cần tối thiểu 2 người chơi (hoặc Người + AI) để bắt đầu trận đấu.',
      };
    }

    if (!room.seats.every(s => s.isAI || s.isReady)) {
      return {
        ok: false,
        code: 'INVALID_GAME_ACTION',
        messageVi: 'Tất cả người chơi trong phòng phải nhấn Sẵn Sàng trước khi bắt đầu.',
      };
    }

    this.renormalizeLobbyPlayerIds(room);
    room.status = 'STARTING';

    const startAction: GameAction = {
      type: 'START_GAME',
      actionId: `start-${room.roomCode}-${Date.now()}`,
      players: room.seats.map(s => ({
        name: s.name,
        token: s.token,
        isAI: s.isAI,
        aiPersonality: s.aiPersonality,
        aiDifficulty: s.aiDifficulty,
      })),
      config: {
        ...room.config,
        seed: room.secretSeed,
      },
    };

    const initialState = gameReducer(INITIAL_GAME_STATE, startAction);
    if (initialState.status !== 'PLAYING') {
      room.status = 'READY';
      return {
        ok: false,
        code: 'INVALID_WORLD',
        messageVi: 'Không thể khởi tạo trận đấu với cấu hình hiện tại.',
      };
    }
    room.gameState = initialState;
    room.status = 'IN_GAME';
    room.stateVersion += 1;
    room.aiStepCount = 0;
    room.lastActivePlayerId = initialState.players[initialState.activePlayerIndex]?.id || null;
    this.syncTurnDeadline(room);

    this.options.repository.saveRoomAndActionAudit(
      {
        roomId: room.roomId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        status: room.status,
        capacity: room.capacity,
        hostPlayerId: room.hostPlayerId,
        seats: room.seats,
        reconnectTokenHashes: room.reconnectTokenHashes,
        config: room.config,
        disconnectPolicy: room.disconnectPolicy,
        reconnectGraceMs: room.reconnectGraceMs,
        stateVersion: room.stateVersion,
        prngState: room.prng.getState(),
        secretSeed: room.secretSeed,
        gameState: room.gameState,
        createdAt: room.createdAt,
        updatedAt: Date.now(),
        expiresAt: room.expiresAt,
      },
      {
        roomCode: room.roomCode,
        stateVersion: room.stateVersion,
        actionId: startAction.actionId!,
        actorPlayerId: room.hostPlayerId,
        actionType: 'START_GAME',
        payloadJson: JSON.stringify({ playersCount: room.seats.length }),
        timestamp: Date.now(),
      }
    );

    this.scheduleAITurnIfNeeded(room);

    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        gameState: sanitizeStateForClient(room.gameState)!,
        stateVersion: room.stateVersion,
      },
    };
  }

  /**
   * Authoritative execution of a client-submitted intent.
   */
  public submitClientAction(params: {
    roomCode: string;
    sessionPlayerId: string;
    actionId: string;
    expectedStateVersion?: number;
    intent: ClientIntentPayload;
  }): RoomOperationResult<{
    room: RoomPublicSummary;
    gameState: GameState;
    stateVersion: number;
    actorPlayerId: PlayerId;
    actionType: string;
  }> {
    const room = this.rooms.get(params.roomCode);
    if (!room) {
      return { ok: false, code: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' };
    }

    if (room.status !== 'IN_GAME' || !room.gameState) {
      return {
        ok: false,
        code: 'MATCH_NOT_ACTIVE',
        messageVi: 'Trận đấu chưa bắt đầu hoặc đã kết thúc.',
      };
    }

    const seat = room.seats.find(s => s.sessionPlayerId === params.sessionPlayerId);
    if (!seat) {
      return {
        ok: false,
        code: 'NOT_ROOM_MEMBER',
        messageVi: 'Từ chối bảo mật: Bạn không phải là thành viên hợp lệ của phòng này.',
      };
    }

    const actorPlayerId = seat.playerId;

    // Duplicate actionId check before executing
    if (
      room.gameState.processedActionIds &&
      room.gameState.processedActionIds.includes(params.actionId)
    ) {
      return {
        ok: false,
        code: 'DUPLICATE_ACTION',
        messageVi: 'Hành động trùng lặp (Duplicate Action ID) đã bị chặn.',
      };
    }

    // Optional strict stateVersion check if provided by client
    if (
      params.expectedStateVersion !== undefined &&
      params.expectedStateVersion !== room.stateVersion
    ) {
      return {
        ok: false,
        code: 'STALE_STATE_VERSION',
        messageVi: `Phiên bản trạng thái đã cũ (Client: v${params.expectedStateVersion}, Server: v${room.stateVersion}).`,
      };
    }

    return this.executeAuthoritativeIntent(room, actorPlayerId, params.actionId, params.intent);
  }

  private executeAuthoritativeIntent(
    room: ManagedRoom,
    actorPlayerId: PlayerId,
    actionId: string,
    intent: ClientIntentPayload
  ): RoomOperationResult<{
    room: RoomPublicSummary;
    gameState: GameState;
    stateVersion: number;
    actorPlayerId: PlayerId;
    actionType: string;
  }> {
    const currentState = room.gameState!;
    const activePlayer = currentState.players[currentState.activePlayerIndex];

    // Special handling for server-authoritative dice roll:
    // Client sends { type: 'ROLL_DICE' } -> Server validates turn & phase, rolls 2d6 via room.prng,
    // and executes ROLL_DICE_START + ROLL_DICE_RESULT atomically!
    if (intent.type === 'ROLL_DICE') {
      if (!activePlayer || activePlayer.id !== actorPlayerId) {
        return {
          ok: false,
          code: 'UNAUTHORIZED_ACTION',
          messageVi: 'Không phải lượt của bạn để lắc xúc xắc.',
        };
      }
      if (currentState.turnPhase !== 'WAITING_FOR_ROLL' && currentState.turnPhase !== 'ROLLING') {
        return {
          ok: false,
          code: 'INVALID_GAME_ACTION',
          messageVi: `Không thể lắc xúc xắc ở pha hiện tại (${currentState.turnPhase}).`,
        };
      }

      const d1 = room.prng.nextInt(1, 6);
      const d2 = room.prng.nextInt(1, 6);

      let nextState = currentState;
      if (nextState.turnPhase === 'WAITING_FOR_ROLL') {
        nextState = gameReducer(nextState, {
          type: 'ROLL_DICE_START',
          senderPlayerId: actorPlayerId,
        });
      }

      nextState = gameReducer(nextState, {
        type: 'ROLL_DICE_RESULT',
        dice: [d1, d2],
        senderPlayerId: actorPlayerId,
        actionId,
      });

      if (nextState === currentState) {
        return {
          ok: false,
          code: 'INVALID_GAME_ACTION',
          messageVi: 'Không thể thực hiện lắc xúc xắc.',
        };
      }

      return this.commitNewGameState(room, nextState, actorPlayerId, actionId, 'ROLL_DICE', {
        dice: [d1, d2],
      });
    }

    // Translate ClientIntentPayload into canonical GameAction with server-enforced senderPlayerId
    let canonicalAction: GameAction;
    switch (intent.type) {
      case 'PLACE_AUCTION_BID':
        canonicalAction = {
          type: 'PLACE_AUCTION_BID',
          playerId: actorPlayerId, // Server binds playerId from verified session
          bidAmount: intent.bidAmount,
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;

      case 'PASS_AUCTION_BID':
        canonicalAction = {
          type: 'PASS_AUCTION_BID',
          playerId: actorPlayerId, // Server binds playerId from verified session
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;

      case 'PROPOSE_TRADE': {
        if (intent.proposal.senderPlayerId !== actorPlayerId) {
          return {
            ok: false,
            code: 'UNAUTHORIZED_ACTION',
            messageVi: 'Từ chối bảo mật: Không thể mạo danh người chơi khác để gửi đề nghị giao dịch.',
          };
        }
        canonicalAction = {
          type: 'PROPOSE_TRADE',
          proposal: {
            ...intent.proposal,
            senderPlayerId: actorPlayerId,
          },
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;
      }

      case 'COUNTER_TRADE': {
        if (
          !currentState.activeTrade ||
          currentState.activeTrade.countered ||
          currentState.activeTrade.targetPlayerId !== actorPlayerId
        ) {
          return {
            ok: false,
            code: 'UNAUTHORIZED_ACTION',
            messageVi: 'Chỉ người nhận đề nghị được điều chỉnh tiền, và chỉ một lần.',
          };
        }
        canonicalAction = {
          type: 'COUNTER_TRADE',
          proposal: {
            ...intent.proposal,
            senderPlayerId: actorPlayerId,
          },
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;
      }

      case 'ACCEPT_TRADE':
      case 'REJECT_TRADE': {
        if (!currentState.activeTrade || getTradeResponderId(currentState.activeTrade) !== actorPlayerId) {
          return {
            ok: false,
            code: 'UNAUTHORIZED_ACTION',
            messageVi: 'Chỉ bên đang được yêu cầu phản hồi mới có quyền chấp nhận hoặc từ chối.',
          };
        }
        canonicalAction = {
          type: intent.type,
          tradeId: intent.tradeId,
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;
      }

      case 'CANCEL_TRADE': {
        if (!currentState.activeTrade || currentState.activeTrade.senderPlayerId !== actorPlayerId) {
          return {
            ok: false,
            code: 'UNAUTHORIZED_ACTION',
            messageVi: 'Chỉ người tạo đề nghị giao dịch mới có quyền hủy.',
          };
        }
        canonicalAction = {
          type: 'CANCEL_TRADE',
          tradeId: intent.tradeId,
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;
      }

      case 'DECLARE_BANKRUPTCY':
        canonicalAction = {
          type: 'DECLARE_BANKRUPTCY',
          playerId: actorPlayerId,
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;

      case 'CHOOSE_PATH':
      case 'CHOOSE_BRANCH_PATH':
        canonicalAction = {
          type: 'CHOOSE_BRANCH_PATH',
          targetNodeId: intent.targetNodeId,
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;

      default:
        canonicalAction = {
          ...(intent as any),
          senderPlayerId: actorPlayerId,
          actionId,
        };
        break;
    }

    const nextState = gameReducer(currentState, canonicalAction);
    if (nextState === currentState) {
      return {
        ok: false,
        code: 'INVALID_GAME_ACTION',
        messageVi: `Nước đi [${intent.type}] không hợp lệ trong bối cảnh hiện tại.`,
      };
    }

    return this.commitNewGameState(room, nextState, actorPlayerId, actionId, intent.type, intent);
  }

  private commitNewGameState(
    room: ManagedRoom,
    nextState: GameState,
    actorPlayerId: PlayerId,
    actionId: string,
    actionType: string,
    auditPayload: unknown
  ): RoomOperationResult<{
    room: RoomPublicSummary;
    gameState: GameState;
    stateVersion: number;
    actorPlayerId: PlayerId;
    actionType: string;
  }> {
    room.gameState = nextState;
    room.stateVersion += 1;

    if (nextState.status === 'ENDED' || nextState.turnPhase === 'GAME_OVER') {
      room.status = 'FINISHED';
      if (room.aiTimer) {
        clearTimeout(room.aiTimer);
        room.aiTimer = null;
      }
    }

    const activePlayer = nextState.players[nextState.activePlayerIndex];
    if (activePlayer?.id !== room.lastActivePlayerId) {
      room.lastActivePlayerId = activePlayer?.id || null;
      room.aiStepCount = 0;
    }

    this.options.repository.saveRoomAndActionAudit(
      {
        roomId: room.roomId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        status: room.status,
        capacity: room.capacity,
        hostPlayerId: room.hostPlayerId,
        seats: room.seats,
        reconnectTokenHashes: room.reconnectTokenHashes,
        config: room.config,
        disconnectPolicy: room.disconnectPolicy,
        reconnectGraceMs: room.reconnectGraceMs,
        stateVersion: room.stateVersion,
        prngState: room.prng.getState(),
        secretSeed: room.secretSeed,
        gameState: room.gameState,
        createdAt: room.createdAt,
        updatedAt: Date.now(),
        expiresAt: room.expiresAt,
      },
      {
        roomCode: room.roomCode,
        stateVersion: room.stateVersion,
        actionId,
        actorPlayerId,
        actionType,
        payloadJson: JSON.stringify(auditPayload),
        timestamp: Date.now(),
      }
    );

    this.syncTurnDeadline(room);

    if (room.status === 'IN_GAME') {
      this.scheduleAITurnIfNeeded(room);
    }

    return {
      ok: true,
      data: {
        room: this.toPublicSummary(room),
        gameState: sanitizeStateForClient(room.gameState)!,
        stateVersion: room.stateVersion,
        actorPlayerId,
        actionType,
      },
    };
  }

  /**
   * Server-Authoritative AI Execution Pipeline.
   * AI decisions run on the server and pass through the exact same validation & reducer pipeline.
   */
  private scheduleAITurnIfNeeded(room: ManagedRoom): void {
    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }

    if (room.status !== 'IN_GAME' || !room.gameState || room.gameState.status !== 'PLAYING') {
      return;
    }

    const aiActor = getActiveAIActor(room.gameState);
    if (!aiActor) {
      return;
    }

    room.aiTimer = setTimeout(() => {
      room.aiTimer = null;
      if (room.status !== 'IN_GAME' || !room.gameState || room.gameState.status !== 'PLAYING') {
        return;
      }

      const currentAIActor = getActiveAIActor(room.gameState);
      if (!currentAIActor) return;

      const decision = computeNextAIDecision(room.gameState, room.aiStepCount);
      if (!decision) return;

      // Record AI decision summary on state
      room.gameState = gameReducer(room.gameState, {
        type: 'RECORD_AI_DECISION',
        decision: decision.reason,
      });

      const aiActionId = `ai-${room.roomCode}-v${room.stateVersion}-${Date.now()}`;
      let mappedIntent: ClientIntentPayload;

      if (decision.action.type === 'ROLL_DICE_START') {
        mappedIntent = { type: 'ROLL_DICE' };
        room.aiStepCount = 0;
      } else {
        if (
          decision.action.type !== 'PLACE_AUCTION_BID' &&
          decision.action.type !== 'PASS_AUCTION_BID' &&
          decision.action.type !== 'ACCEPT_TRADE' &&
          decision.action.type !== 'REJECT_TRADE'
        ) {
          room.aiStepCount += 1;
        }
        mappedIntent = this.mapGameActionToClientIntent(decision.action);
      }

      const result = this.executeAuthoritativeIntent(
        room,
        currentAIActor.id,
        aiActionId,
        mappedIntent
      );

      if (result.ok && result.data) {
        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'STATE_SYNC',
          roomCode: room.roomCode,
          stateVersion: result.data.stateVersion,
          lastActionType: result.data.actionType,
          lastActorPlayerId: result.data.actorPlayerId,
          actionId: aiActionId,
          gameState: result.data.gameState,
          room: result.data.room,
          serverTimestamp: Date.now(),
        });

        if (result.data.room.status === 'FINISHED') {
          this.options.onBroadcastToRoom(room.roomCode, {
            version: PROTOCOL_VERSION,
            type: 'MATCH_FINISHED',
            roomCode: room.roomCode,
            winner: result.data.gameState.winner,
            gameState: result.data.gameState,
            room: result.data.room,
            stateVersion: result.data.stateVersion,
            serverTimestamp: Date.now(),
          });
        }
      }
    }, this.aiActionDelayMs);
  }

  private mapGameActionToClientIntent(action: GameAction): ClientIntentPayload {
    switch (action.type) {
      case 'ROLL_DICE_START':
        return { type: 'ROLL_DICE' };
      case 'PLACE_AUCTION_BID':
        return { type: 'PLACE_AUCTION_BID', bidAmount: action.bidAmount };
      case 'PASS_AUCTION_BID':
        return { type: 'PASS_AUCTION_BID' };
      case 'DECLARE_BANKRUPTCY':
        return { type: 'DECLARE_BANKRUPTCY' };
      default:
        return action as unknown as ClientIntentPayload;
    }
  }

  /**
   * Handles player disconnect or voluntary room leave, including host migration and grace timer.
   */
  public handleSessionDisconnected(
    roomCode: string,
    sessionPlayerId: string,
    voluntaryLeave: boolean = false
  ): {
    room: RoomPublicSummary;
    disconnectedPlayerId: PlayerId;
    disconnectedPlayerName: string;
    reconnectDeadlineAt: number;
    migratedHost?: { newHostPlayerId: PlayerId; newHostName: string };
  } | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const seatIdx = room.seats.findIndex(s => s.sessionPlayerId === sessionPlayerId);
    if (seatIdx < 0) return null;
    const seat = room.seats[seatIdx];

    const now = Date.now();
    let migratedHost: { newHostPlayerId: PlayerId; newHostName: string } | undefined;

    // Lobby disconnect or voluntary leave before match start -> remove seat & migrate host
    if (room.status === 'WAITING' || room.status === 'READY' || voluntaryLeave) {
      if (room.status === 'WAITING' || room.status === 'READY') {
        const wasHost = seat.isHost;
        room.seats.splice(seatIdx, 1);
        delete room.reconnectTokenHashes[seat.playerId];

        const remainingHumans = room.seats.filter(s => !s.isAI);
        if (remainingHumans.length === 0) {
          room.status = 'EXPIRED';
          this.persistRoom(room);
          return null;
        }

        if (wasHost) {
          room.seats.forEach(s => (s.isHost = false));
          remainingHumans[0].isHost = true;
          room.hostPlayerId = remainingHumans[0].playerId;
        }

        this.renormalizeLobbyPlayerIds(room);
        if (wasHost) {
          const newHost = room.seats.find(s => s.isHost);
          if (newHost) {
            migratedHost = {
              newHostPlayerId: newHost.playerId,
              newHostName: newHost.name,
            };
          }
        }
        this.updateLobbyStatus(room);
        room.stateVersion += 1;
        this.persistRoom(room);

        return {
          room: this.toPublicSummary(room),
          disconnectedPlayerId: seat.playerId,
          disconnectedPlayerName: seat.name,
          reconnectDeadlineAt: now,
          migratedHost,
        };
      }
    }

    // In-game disconnect -> preserve seat, start reconnect grace timer, and migrate host if needed
    seat.connected = false;
    seat.disconnectedAt = now;
    seat.reconnectDeadlineAt = now + room.reconnectGraceMs;

    if (seat.isHost) {
      const nextHumanHost = room.seats.find(s => !s.isAI && s.connected && s.playerId !== seat.playerId);
      if (nextHumanHost) {
        seat.isHost = false;
        nextHumanHost.isHost = true;
        room.hostPlayerId = nextHumanHost.playerId;
        migratedHost = {
          newHostPlayerId: nextHumanHost.playerId,
          newHostName: nextHumanHost.name,
        };
      }
    }

    room.stateVersion += 1;
    this.syncTurnDeadline(room);
    this.persistRoom(room);

    if (room.status === 'IN_GAME') {
      this.scheduleDisconnectGraceTimer(
        room,
        seat.playerId,
        voluntaryLeave ? 50 : room.reconnectGraceMs
      );
    }

    return {
      room: this.toPublicSummary(room),
      disconnectedPlayerId: seat.playerId,
      disconnectedPlayerName: seat.name,
      reconnectDeadlineAt: seat.reconnectDeadlineAt,
      migratedHost,
    };
  }

  private scheduleDisconnectGraceTimer(
    room: ManagedRoom,
    playerId: PlayerId,
    graceMs: number
  ): void {
    const existing = room.disconnectTimers.get(playerId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      room.disconnectTimers.delete(playerId);
      const seat = room.seats.find(s => s.playerId === playerId);
      if (!seat || seat.connected || room.status !== 'IN_GAME' || !room.gameState) {
        return;
      }

      if (room.disconnectPolicy === 'FORFEIT') {
        const res = this.executeAuthoritativeIntent(
          room,
          playerId,
          `forfeit-${playerId}-${Date.now()}`,
          { type: 'DECLARE_BANKRUPTCY' }
        );
        if (res.ok && res.data) {
          this.options.onBroadcastToRoom(room.roomCode, {
            version: PROTOCOL_VERSION,
            type: 'STATE_SYNC',
            roomCode: room.roomCode,
            stateVersion: res.data.stateVersion,
            lastActionType: 'DECLARE_BANKRUPTCY',
            lastActorPlayerId: playerId,
            actionId: `forfeit-${playerId}`,
            gameState: res.data.gameState,
            room: res.data.room,
            serverTimestamp: Date.now(),
          });
        }
      } else {
        // Default safe policy: AI_TAKEOVER (Temporary AI takeover until human reconnects)
        seat.isAI = true;
        seat.takenOverByAI = true;
        seat.aiPersonality = seat.aiPersonality || 'STRATEGIST';
        seat.aiDifficulty = seat.aiDifficulty || 'NORMAL';

        room.gameState = {
          ...room.gameState,
          players: room.gameState.players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  isAI: true,
                  aiPersonality: seat.aiPersonality,
                  aiDifficulty: seat.aiDifficulty,
                }
              : p
          ),
          logs: [
            {
              id: `ai-takeover-${Date.now()}`,
              timestamp: Date.now(),
              playerId,
              playerName: seat.name,
              message: `[TỰ ĐỘNG TIẾP QUẢN] ${seat.name} mất kết nối quá thời gian chờ. AI Chiến Lược tạm thời điều khiển cho đến khi kết nối lại.`,
              type: 'WARNING',
            },
            ...room.gameState.logs,
          ],
        };
        room.stateVersion += 1;
        this.syncTurnDeadline(room);
        this.persistRoom(room);

        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_UPDATED',
          room: this.toPublicSummary(room),
          reason: `AI tạm thời tiếp quản vị trí của ${seat.name}.`,
          serverTimestamp: Date.now(),
        });

        this.scheduleAITurnIfNeeded(room);
      }
    }, graceMs);

    room.disconnectTimers.set(playerId, timer);
  }

  /**
   * Synchronizes an external or newly persisted room from the SQLite repository into memory
   * (or refreshes an in-memory room if the database has a newer stateVersion).
   * Used by HTTP / Serverless polling transport and multi-worker deployments.
   */
  public syncRoomFromRepository(roomCode: string): ManagedRoom | null {
    const rec = this.options.repository.getRoom(roomCode);
    const existing = this.rooms.get(roomCode);
    if (!rec) {
      return existing || null;
    }
    if (existing && existing.stateVersion >= rec.stateVersion) {
      return existing;
    }
    const prng = new SeededPRNG(rec.secretSeed);
    (prng as any).state = rec.prngState;
    const managed: ManagedRoom = {
      ...rec,
      prng,
      aiStepCount: existing?.aiStepCount ?? 0,
      lastActivePlayerId: existing?.lastActivePlayerId ?? null,
      aiTimer: existing?.aiTimer ?? null,
      disconnectTimers: existing?.disconnectTimers ?? new Map(),
      turnDeadlineAt: existing?.turnDeadlineAt ?? null,
    };
    this.rooms.set(roomCode, managed);
    this.syncTurnDeadline(managed);
    if (managed.status === 'IN_GAME') {
      this.scheduleAITurnIfNeeded(managed);
    }
    return managed;
  }

  /**
   * Synchronously advances one pending AI decision step if an AI actor is currently active.
   * Useful in serverless / HTTP request-response environments where background timers may not persist across invocations.
   */
  public stepAITurnSync(roomCode: string): boolean {
    const room = this.syncRoomFromRepository(roomCode);
    if (!room || room.status !== 'IN_GAME' || !room.gameState || room.gameState.status !== 'PLAYING') {
      return false;
    }
    const currentAIActor = getActiveAIActor(room.gameState);
    if (!currentAIActor) return false;

    if (room.aiTimer) {
      clearTimeout(room.aiTimer);
      room.aiTimer = null;
    }

    const decision = computeNextAIDecision(room.gameState, room.aiStepCount);
    if (!decision) return false;

    room.gameState = gameReducer(room.gameState, {
      type: 'RECORD_AI_DECISION',
      decision: decision.reason,
    });

    const aiActionId = `ai-${room.roomCode}-v${room.stateVersion}-${Date.now()}`;
    let mappedIntent: ClientIntentPayload;

    if (decision.action.type === 'ROLL_DICE_START') {
      mappedIntent = { type: 'ROLL_DICE' };
      room.aiStepCount = 0;
    } else {
      if (
        decision.action.type !== 'PLACE_AUCTION_BID' &&
        decision.action.type !== 'PASS_AUCTION_BID' &&
        decision.action.type !== 'ACCEPT_TRADE' &&
        decision.action.type !== 'REJECT_TRADE'
      ) {
        room.aiStepCount += 1;
      }
      mappedIntent = this.mapGameActionToClientIntent(decision.action);
    }

    const result = this.executeAuthoritativeIntent(
      room,
      currentAIActor.id,
      aiActionId,
      mappedIntent
    );

    if (result.ok && result.data) {
      this.options.onBroadcastToRoom(room.roomCode, {
        version: PROTOCOL_VERSION,
        type: 'STATE_SYNC',
        roomCode: room.roomCode,
        stateVersion: result.data.stateVersion,
        lastActionType: result.data.actionType,
        lastActorPlayerId: result.data.actorPlayerId,
        actionId: aiActionId,
        gameState: result.data.gameState,
        room: result.data.room,
        serverTimestamp: Date.now(),
      });

      if (result.data.room.status === 'FINISHED') {
        this.options.onBroadcastToRoom(room.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'MATCH_FINISHED',
          roomCode: room.roomCode,
          winner: result.data.gameState.winner,
          gameState: result.data.gameState,
          room: result.data.room,
          stateVersion: result.data.stateVersion,
          serverTimestamp: Date.now(),
        });
      }
      return true;
    }
    return false;
  }

  public getRoomStateAndSummary(roomCode: string, viewingPlayerId?: string): {
    room: RoomPublicSummary;
    gameState: GameState | null;
    stateVersion: number;
  } | null {
    const room = this.syncRoomFromRepository(roomCode);
    if (!room) return null;
    return {
      room: this.toPublicSummary(room),
      gameState: sanitizeStateForClient(room.gameState, viewingPlayerId),
      stateVersion: room.stateVersion,
    };
  }

  public getRoomSummary(roomCode: string): RoomPublicSummary | null {
    const room = this.syncRoomFromRepository(roomCode);
    return room ? this.toPublicSummary(room) : null;
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  public shutdown(): void {
    if (this.turnTicker) {
      clearInterval(this.turnTicker);
      this.turnTicker = null;
    }
    for (const room of this.rooms.values()) {
      if (room.aiTimer) clearTimeout(room.aiTimer);
      for (const t of room.disconnectTimers.values()) {
        clearTimeout(t);
      }
    }
    this.rooms.clear();
  }
}
