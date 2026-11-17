import {
  AIDifficulty,
  AIPersonalityId,
  GameActionPayload,
  GameConfig,
  GameState,
  PlayerId,
  PlayerToken,
} from '../game/types';
import { PlayerCosmetics } from '../cosmetics/types';

export const PROTOCOL_VERSION = '1.0' as const;

export type RoomStatus =
  | 'WAITING'
  | 'READY'
  | 'STARTING'
  | 'IN_GAME'
  | 'FINISHED'
  | 'EXPIRED';

export type DisconnectPolicy = 'AI_TAKEOVER' | 'FORFEIT' | 'HOST_CONTINUE';

export interface RoomSeatMember {
  seatIndex: number; // 0..3
  playerId: PlayerId; // 'player-1' .. 'player-4'
  sessionPlayerId: string; // Unique server guest/session player ID (or 'AI-seat-X')
  name: string;
  token: PlayerToken;
  isHost: boolean;
  isReady: boolean;
  isAI: boolean;
  aiPersonality?: AIPersonalityId;
  aiDifficulty?: AIDifficulty;
  connected: boolean;
  disconnectedAt: number | null;
  reconnectDeadlineAt: number | null;
  takenOverByAI?: boolean;
  cosmetics?: PlayerCosmetics;
}

export interface RoomPublicSummary {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: RoomStatus;
  capacity: number; // 2..4
  hostPlayerId: PlayerId;
  seats: RoomSeatMember[];
  config: GameConfig;
  disconnectPolicy: DisconnectPolicy;
  reconnectGraceMs: number;
  stateVersion: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  /** Server clock (ms) when the active human's turn times out; null when no clock runs. */
  turnDeadlineAt?: number | null;
}

/**
 * Client -> Server Intended Action Payload.
 * Intentionally excludes server-only or privileged payloads (`ROLL_DICE_RESULT`, `APPLY_CHAOS_EFFECT`, `LOAD_SAVED_MATCH`, `START_GAME`, `RECORD_AI_DECISION`).
 */
export type ClientIntentPayload =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY'; tileId: number }
  | { type: 'START_AUCTION'; tileId?: number }
  | { type: 'DECLINE_PROPERTY_PURCHASE'; tileId?: number }
  | { type: 'PLACE_AUCTION_BID'; bidAmount: number }
  | { type: 'PASS_AUCTION_BID' }
  | { type: 'UPGRADE_PROPERTY'; tileId: number }
  | { type: 'DOWNGRADE_PROPERTY'; tileId: number }
  | { type: 'SELL_PROPERTY'; tileId: number }
  | { type: 'MORTGAGE_PROPERTY'; tileId: number }
  | { type: 'UNMORTGAGE_PROPERTY'; tileId: number }
  | { type: 'PROPOSE_TRADE'; proposal: Extract<GameActionPayload, { type: 'PROPOSE_TRADE' }>['proposal'] }
  | { type: 'ACCEPT_TRADE'; tradeId?: string }
  | { type: 'REJECT_TRADE'; tradeId?: string }
  | { type: 'CANCEL_TRADE'; tradeId?: string }
  | { type: 'COUNTER_TRADE'; proposal: Extract<GameActionPayload, { type: 'COUNTER_TRADE' }>['proposal'] }
  | { type: 'PAY_DETENTION_BAIL' }
  | { type: 'USE_DETENTION_CARD' }
  | { type: 'RESOLVE_CHAOS' }
  | { type: 'RESOLVE_DEBT' }
  | { type: 'SETTLE_PARTIAL_DEBT'; amount?: number }
  | { type: 'END_TURN' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'CHOOSE_BRANCH_PATH'; targetNodeId: string }
  | { type: 'CHOOSE_PATH'; targetNodeId: string }
  | { type: 'PLACE_TRAP'; nodeId: string; trapType: import('../game/types').TrapType }
  | { type: 'SELECT_BUSINESS_TYPE'; tileId?: number; nodeId?: string; businessId: string }
  ;

export type ClientToServerMessage =
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'PING';
      requestId?: string;
      clientTimestamp?: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'CREATE_ROOM';
      requestId: string;
      playerName: string;
      roomName?: string;
      capacity?: number;
      token?: PlayerToken;
      cosmetics?: PlayerCosmetics;
      config?: Partial<GameConfig>;
      disconnectPolicy?: DisconnectPolicy;
      reconnectGraceMs?: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'JOIN_ROOM';
      requestId: string;
      roomCode: string;
      playerName: string;
      token?: PlayerToken;
      cosmetics?: PlayerCosmetics;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'RECONNECT_ROOM';
      requestId: string;
      roomCode: string;
      playerId: PlayerId;
      reconnectToken: string;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'LEAVE_ROOM';
      requestId: string;
      roomCode: string;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'SET_READY';
      requestId: string;
      roomCode: string;
      isReady: boolean;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'SELECT_TOKEN';
      requestId: string;
      roomCode: string;
      token: PlayerToken;
      playerName?: string;
      cosmetics?: PlayerCosmetics;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'SEND_EMOTE';
      requestId?: string;
      roomCode: string;
      emoteId: string;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'CONFIGURE_ROOM';
      requestId: string;
      roomCode: string;
      capacity?: number;
      config?: Partial<GameConfig>;
      disconnectPolicy?: DisconnectPolicy;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'CONFIGURE_SEAT_AI';
      requestId: string;
      roomCode: string;
      seatIndex: number;
      isAI: boolean;
      aiPersonality?: AIPersonalityId;
      aiDifficulty?: AIDifficulty;
      name?: string;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'START_MATCH';
      requestId: string;
      roomCode: string;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'SUBMIT_ACTION';
      requestId: string;
      roomCode: string;
      actionId: string;
      expectedStateVersion?: number;
      intent: ClientIntentPayload;
    };

export type ServerErrorCode =
  | 'INVALID_PROTOCOL'
  | 'INVALID_SCHEMA'
  | 'MESSAGE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_EXPIRED'
  | 'ROOM_FULL'
  | 'ROOM_ALREADY_STARTED'
  | 'NOT_ROOM_MEMBER'
  | 'NOT_ROOM_HOST'
  | 'DUPLICATE_JOIN'
  | 'INVALID_RECONNECT_TOKEN'
  | 'RECONNECT_EXPIRED'
  | 'UNAUTHORIZED_ACTION'
  | 'FORBIDDEN_CLIENT_ACTION'
  | 'INVALID_GAME_ACTION'
  | 'INVALID_WORLD'
  | 'INVALID_COSMETIC'
  | 'DUPLICATE_ACTION'
  | 'STALE_STATE_VERSION'
  | 'MATCH_NOT_ACTIVE'
  | 'INTERNAL_ERROR';

export type ServerToClientMessage =
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'PONG';
      requestId?: string;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'WELCOME';
      sessionId: string;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'ROOM_JOINED';
      requestId: string;
      room: RoomPublicSummary;
      assignedPlayerId: PlayerId;
      sessionPlayerId: string;
      reconnectToken: string;
      gameState: GameState | null;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'ROOM_UPDATED';
      room: RoomPublicSummary;
      reason: string;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'MATCH_STARTED';
      room: RoomPublicSummary;
      gameState: GameState;
      stateVersion: number;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'STATE_SYNC';
      roomCode: string;
      stateVersion: number;
      lastActionType: string;
      lastActorPlayerId: PlayerId;
      actionId: string;
      gameState: GameState;
      room: RoomPublicSummary;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'PLAYER_DISCONNECTED';
      roomCode: string;
      playerId: PlayerId;
      playerName: string;
      reconnectDeadlineAt: number;
      room: RoomPublicSummary;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'PLAYER_RECONNECTED';
      roomCode: string;
      playerId: PlayerId;
      playerName: string;
      room: RoomPublicSummary;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'HOST_MIGRATED';
      roomCode: string;
      newHostPlayerId: PlayerId;
      newHostName: string;
      room: RoomPublicSummary;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'MATCH_FINISHED';
      roomCode: string;
      winner: GameState['winner'];
      gameState: GameState;
      room: RoomPublicSummary;
      stateVersion: number;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'EMOTE_BROADCAST';
      roomCode: string;
      playerId: PlayerId;
      playerName: string;
      emoteId: string;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'ACTION_REJECTED';
      requestId?: string;
      actionId?: string;
      code: ServerErrorCode;
      messageVi: string;
      stateVersion: number;
      serverTimestamp: number;
    }
  | {
      version: typeof PROTOCOL_VERSION;
      type: 'ERROR';
      requestId?: string;
      code: ServerErrorCode;
      messageVi: string;
      serverTimestamp: number;
    };
