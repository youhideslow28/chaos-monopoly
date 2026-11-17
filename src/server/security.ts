import crypto from 'node:crypto';
import {
  ClientIntentPayload,
  ClientToServerMessage,
  DisconnectPolicy,
  PROTOCOL_VERSION,
  ServerErrorCode,
} from '../multiplayer/protocol';
import { AIDifficulty, AIPersonalityId } from '../game/types';
import { sanitizePlayerCosmetics, isValidCosmeticId, getCosmeticItem } from '../cosmetics/catalog';
import { isQuickChatId } from '../game/social/quickChat';

export const MAX_WS_MESSAGE_BYTES = 16 * 1024; // 16 KB hard limit

const VALID_PERSONALITIES: Set<AIPersonalityId> = new Set([
  'TYCOON',
  'STRATEGIST',
  'SHARK',
  'SURVIVOR',
  'CHAOTIC',
  'DIPLOMAT',
]);

const VALID_DIFFICULTIES: Set<AIDifficulty> = new Set(['EASY', 'NORMAL', 'HARD']);

const VALID_DISCONNECT_POLICIES: Set<DisconnectPolicy> = new Set([
  'AI_TAKEOVER',
  'FORFEIT',
  'HOST_CONTINUE',
]);

/**
 * Forbidden client action types that attempt to dictate server-authoritative outcomes.
 */
const FORBIDDEN_CLIENT_INTENT_TYPES = new Set([
  'ROLL_DICE_RESULT',
  'APPLY_CHAOS_EFFECT',
  'LOAD_SAVED_MATCH',
  'START_GAME',
  'RESTART_GAME',
  'RECORD_AI_DECISION',
  'SET_CASH',
  'SET_POSITION',
  'SET_OWNER',
]);

/**
 * Forbidden keys inside client action payloads that attempt to forge dice, cash, ownership, or seeds.
 */
const FORBIDDEN_INTENT_KEYS = new Set([
  'dice',
  'cash',
  'position',
  'ownerId',
  'seed',
  'isBankrupt',
  'winner',
  'activePlayerIndex',
  'roundNumber',
  'savedState',
]);

export function sanitizeDisplayText(raw: unknown, maxLength: number = 32, fallback: string = ''): string {
  if (typeof raw !== 'string') return fallback;
  const stripped = raw
    .replace(/[<>'"`\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
  if (!stripped) return fallback;
  return stripped.slice(0, maxLength);
}

export function sanitizeRoomConfig(raw: unknown): { startingCash?: number; maxRounds?: number; worldId?: string; gameMode?: 'CLASSIC' | 'CHAOS' } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: { startingCash?: number; maxRounds?: number; worldId?: string; gameMode?: 'CLASSIC' | 'CHAOS' } = {};
  if (typeof r.startingCash === 'number' && Number.isFinite(r.startingCash)) out.startingCash = r.startingCash;
  if (typeof r.maxRounds === 'number' && Number.isFinite(r.maxRounds)) out.maxRounds = r.maxRounds;
  // worldId is passed through as a bounded string only; availability is validated authoritatively by RoomManager.
  if (typeof r.worldId === 'string') out.worldId = r.worldId.slice(0, 48);
  if (r.gameMode === 'CLASSIC' || r.gameMode === 'CHAOS') out.gameMode = r.gameMode;
  return out;
}

export function normalizeRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
}

export function generateSecureRoomCode(existingCodes: Set<string>): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 100; attempt++) {
    const bytes = crypto.randomBytes(4);
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    const code = `CHAOS-${suffix}`;
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  return `CHAOS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function generateSecureToken(bytes: number = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashSecretToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifySecretTokenHash(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false;
  const candidateHash = hashSecretToken(token);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateSecureSeed32(): number {
  return crypto.randomInt(100000, 2147483640);
}

export interface ValidationOutcome<T> {
  ok: boolean;
  value?: T;
  code?: ServerErrorCode;
  messageVi?: string;
}

export function parseAndValidateClientMessage(rawBuffer: Buffer | string): ValidationOutcome<ClientToServerMessage> {
  const byteLength = typeof rawBuffer === 'string' ? Buffer.byteLength(rawBuffer, 'utf8') : rawBuffer.byteLength;
  if (byteLength > MAX_WS_MESSAGE_BYTES) {
    return {
      ok: false,
      code: 'MESSAGE_TOO_LARGE',
      messageVi: `Gói tin vượt quá giới hạn cho phép (${MAX_WS_MESSAGE_BYTES} bytes).`,
    };
  }

  let parsed: any;
  try {
    const text = typeof rawBuffer === 'string' ? rawBuffer : rawBuffer.toString('utf8');
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: 'INVALID_SCHEMA',
      messageVi: 'Gói tin JSON không hợp lệ.',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      code: 'INVALID_SCHEMA',
      messageVi: 'Cấu trúc gói tin không hợp lệ.',
    };
  }

  if (parsed.version !== PROTOCOL_VERSION) {
    return {
      ok: false,
      code: 'INVALID_PROTOCOL',
      messageVi: `Phiên bản giao thức không tương thích (yêu cầu ${PROTOCOL_VERSION}).`,
    };
  }

  if (typeof parsed.type !== 'string') {
    return {
      ok: false,
      code: 'INVALID_SCHEMA',
      messageVi: 'Thiếu loại thông điệp (type).',
    };
  }

  switch (parsed.type) {
    case 'PING':
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'PING',
          requestId: typeof parsed.requestId === 'string' ? parsed.requestId.slice(0, 64) : undefined,
          clientTimestamp: typeof parsed.clientTimestamp === 'number' ? parsed.clientTimestamp : undefined,
        },
      };

    case 'CREATE_ROOM': {
      const requestId = sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`);
      const playerName = sanitizeDisplayText(parsed.playerName, 24, '');
      const roomName = sanitizeDisplayText(parsed.roomName, 36, `Phòng của ${playerName || 'Chủ phòng'}`);
      const capacity = typeof parsed.capacity === 'number'
        ? Math.min(4, Math.max(2, Math.floor(parsed.capacity)))
        : 4;
      const disconnectPolicy: DisconnectPolicy =
        VALID_DISCONNECT_POLICIES.has(parsed.disconnectPolicy)
          ? parsed.disconnectPolicy
          : 'AI_TAKEOVER';

      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'CREATE_ROOM',
          requestId,
          playerName,
          roomName,
          capacity,
          token: parsed.token && typeof parsed.token === 'object' ? parsed.token : undefined,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === 'object' ? sanitizePlayerCosmetics(parsed.cosmetics) : undefined,
          config: sanitizeRoomConfig(parsed.config),
          disconnectPolicy,
          reconnectGraceMs:
            typeof parsed.reconnectGraceMs === 'number'
              ? Math.min(300_000, Math.max(500, Math.floor(parsed.reconnectGraceMs)))
              : undefined,
        },
      };
    }

    case 'JOIN_ROOM': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return {
          ok: false,
          code: 'INVALID_SCHEMA',
          messageVi: 'Mã phòng không hợp lệ.',
        };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'JOIN_ROOM',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          playerName: sanitizeDisplayText(parsed.playerName, 24, ''),
          token: parsed.token && typeof parsed.token === 'object' ? parsed.token : undefined,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === 'object' ? sanitizePlayerCosmetics(parsed.cosmetics) : undefined,
        },
      };
    }

    case 'RECONNECT_ROOM': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const playerId = sanitizeDisplayText(parsed.playerId, 24, '');
      const reconnectToken = typeof parsed.reconnectToken === 'string' ? parsed.reconnectToken.trim() : '';
      if (!roomCode || !playerId || !reconnectToken) {
        return {
          ok: false,
          code: 'INVALID_SCHEMA',
          messageVi: 'Thiếu thông tin xác thực kết nối lại (roomCode, playerId, reconnectToken).',
        };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'RECONNECT_ROOM',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          playerId,
          reconnectToken,
        },
      };
    }

    case 'LEAVE_ROOM':
    case 'START_MATCH': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thiếu mã phòng.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: parsed.type,
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
        },
      };
    }

    case 'SET_READY': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode || typeof parsed.isReady !== 'boolean') {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Trạng thái sẵn sàng không hợp lệ.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'SET_READY',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          isReady: parsed.isReady,
        },
      };
    }

    case 'SELECT_TOKEN': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode || !parsed.token || typeof parsed.token.id !== 'string') {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Lựa chọn nhân vật/quân cờ không hợp lệ.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'SELECT_TOKEN',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          token: {
            id: sanitizeDisplayText(parsed.token.id, 32, 'token-vinfast'),
            name: sanitizeDisplayText(parsed.token.name, 36, 'Quân cờ'),
            symbol: sanitizeDisplayText(parsed.token.symbol, 8, '🚗'),
            colorHex: sanitizeDisplayText(parsed.token.colorHex, 16, '#06b6d4'),
            accentHex: sanitizeDisplayText(parsed.token.accentHex, 16, '#22d3ee'),
          },
          playerName: parsed.playerName ? sanitizeDisplayText(parsed.playerName, 24) : undefined,
          cosmetics: parsed.cosmetics && typeof parsed.cosmetics === 'object' ? sanitizePlayerCosmetics(parsed.cosmetics) : undefined,
        },
      };
    }

    case 'SEND_EMOTE': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const emoteId = sanitizeDisplayText(parsed.emoteId, 32, '');
      const isQuickChat = isQuickChatId(emoteId);
      if (
        !roomCode ||
        !emoteId ||
        (!isQuickChat && (!isValidCosmeticId(emoteId) || getCosmeticItem(emoteId)?.category !== 'EMOTE'))
      ) {
        return { ok: false, code: 'INVALID_COSMETIC', messageVi: 'Biểu cảm không hợp lệ.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'SEND_EMOTE',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          emoteId,
        },
      };
    }

    case 'CONFIGURE_ROOM': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (!roomCode) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thiếu mã phòng.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'CONFIGURE_ROOM',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          capacity:
            typeof parsed.capacity === 'number'
              ? Math.min(4, Math.max(2, Math.floor(parsed.capacity)))
              : undefined,
          config: sanitizeRoomConfig(parsed.config),
          disconnectPolicy: VALID_DISCONNECT_POLICIES.has(parsed.disconnectPolicy)
            ? parsed.disconnectPolicy
            : undefined,
        },
      };
    }

    case 'CONFIGURE_SEAT_AI': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      if (
        !roomCode ||
        typeof parsed.seatIndex !== 'number' ||
        parsed.seatIndex < 0 ||
        parsed.seatIndex > 3 ||
        typeof parsed.isAI !== 'boolean'
      ) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thông tin cấu hình vị trí AI không hợp lệ.' };
      }
      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'CONFIGURE_SEAT_AI',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          seatIndex: Math.floor(parsed.seatIndex),
          isAI: parsed.isAI,
          aiPersonality: VALID_PERSONALITIES.has(parsed.aiPersonality)
            ? parsed.aiPersonality
            : 'STRATEGIST',
          aiDifficulty: VALID_DIFFICULTIES.has(parsed.aiDifficulty)
            ? parsed.aiDifficulty
            : 'NORMAL',
          name: parsed.name ? sanitizeDisplayText(parsed.name, 24) : undefined,
        },
      };
    }

    case 'SUBMIT_ACTION': {
      const roomCode = normalizeRoomCode(parsed.roomCode);
      const actionId = sanitizeDisplayText(parsed.actionId, 64, '');
      if (!roomCode || !actionId || !parsed.intent || typeof parsed.intent !== 'object') {
        return {
          ok: false,
          code: 'INVALID_SCHEMA',
          messageVi: 'Thiếu thông tin hành động (roomCode, actionId, intent).',
        };
      }

      const intentValidation = validateClientIntentPayload(parsed.intent);
      if (!intentValidation.ok || !intentValidation.value) {
        return {
          ok: false,
          code: intentValidation.code || 'INVALID_SCHEMA',
          messageVi: intentValidation.messageVi || 'Hành động không hợp lệ.',
        };
      }

      return {
        ok: true,
        value: {
          version: PROTOCOL_VERSION,
          type: 'SUBMIT_ACTION',
          requestId: sanitizeDisplayText(parsed.requestId, 64, `req-${Date.now()}`),
          roomCode,
          actionId,
          expectedStateVersion:
            typeof parsed.expectedStateVersion === 'number'
              ? Math.floor(parsed.expectedStateVersion)
              : undefined,
          intent: intentValidation.value,
        },
      };
    }

    default:
      return {
        ok: false,
        code: 'INVALID_SCHEMA',
        messageVi: `Không hỗ trợ loại thông điệp: ${String(parsed.type).slice(0, 32)}`,
      };
  }
}

export function validateClientIntentPayload(rawIntent: any): ValidationOutcome<ClientIntentPayload> {
  if (!rawIntent || typeof rawIntent !== 'object' || typeof rawIntent.type !== 'string') {
    return {
      ok: false,
      code: 'INVALID_SCHEMA',
      messageVi: 'Payload hành động không hợp lệ.',
    };
  }

  // Reject any attempt to send server-privileged action types
  if (FORBIDDEN_CLIENT_INTENT_TYPES.has(rawIntent.type)) {
    return {
      ok: false,
      code: 'FORBIDDEN_CLIENT_ACTION',
      messageVi: `Từ chối bảo mật: Client không được phép tự quyết định [${rawIntent.type}].`,
    };
  }

  // Reject any payload containing forged state or outcome fields (dice, cash, ownerId, position, seed)
  for (const key of Object.keys(rawIntent)) {
    if (FORBIDDEN_INTENT_KEYS.has(key)) {
      return {
        ok: false,
        code: 'FORBIDDEN_CLIENT_ACTION',
        messageVi: `Từ chối bảo mật: Phát hiện trường dữ liệu giả mạo [${key}] từ client.`,
      };
    }
  }

  switch (rawIntent.type) {
    case 'ROLL_DICE':
    case 'PASS_AUCTION_BID':
    case 'PAY_DETENTION_BAIL':
    case 'USE_DETENTION_CARD':
    case 'RESOLVE_CHAOS':
    case 'RESOLVE_DEBT':
    case 'END_TURN':
    case 'DECLARE_BANKRUPTCY':
      return { ok: true, value: { type: rawIntent.type } };

    case 'BUY_PROPERTY':
    case 'UPGRADE_PROPERTY':
    case 'DOWNGRADE_PROPERTY':
    case 'MORTGAGE_PROPERTY':
    case 'UNMORTGAGE_PROPERTY':
    case 'SELL_PROPERTY': {
      if (typeof rawIntent.tileId !== 'number' || !Number.isInteger(rawIntent.tileId) || rawIntent.tileId < 0 || rawIntent.tileId >= 40) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Mã ô đất (tileId) không hợp lệ.' };
      }
      return { ok: true, value: { type: rawIntent.type, tileId: rawIntent.tileId } };
    }

    case 'START_AUCTION':
    case 'DECLINE_PROPERTY_PURCHASE': {
      const tileId =
        typeof rawIntent.tileId === 'number' && Number.isInteger(rawIntent.tileId)
          ? rawIntent.tileId
          : undefined;
      return { ok: true, value: { type: rawIntent.type, tileId } };
    }

    case 'PLACE_AUCTION_BID': {
      if (
        typeof rawIntent.bidAmount !== 'number' ||
        !Number.isFinite(rawIntent.bidAmount) ||
        rawIntent.bidAmount <= 0 ||
        rawIntent.bidAmount > 1_000_000
      ) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Mức giá đấu không hợp lệ.' };
      }
      return {
        ok: true,
        value: { type: 'PLACE_AUCTION_BID', bidAmount: Math.floor(rawIntent.bidAmount) },
      };
    }

    case 'SETTLE_PARTIAL_DEBT': {
      const amount =
        typeof rawIntent.amount === 'number' && Number.isFinite(rawIntent.amount) && rawIntent.amount > 0
          ? Math.floor(rawIntent.amount)
          : undefined;
      return { ok: true, value: { type: 'SETTLE_PARTIAL_DEBT', amount } };
    }

    case 'PROPOSE_TRADE':
    case 'COUNTER_TRADE': {
      const p = rawIntent.proposal;
      if (
        !p ||
        typeof p !== 'object' ||
        typeof p.senderPlayerId !== 'string' ||
        typeof p.targetPlayerId !== 'string' ||
        typeof p.offeredCash !== 'number' ||
        typeof p.requestedCash !== 'number' ||
        !Array.isArray(p.offeredPropertyIds) ||
        !Array.isArray(p.requestedPropertyIds) ||
        p.offeredCash < 0 ||
        p.requestedCash < 0
      ) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Hợp đồng đề nghị giao dịch không hợp lệ.' };
      }
      return {
        ok: true,
        value: {
          type: rawIntent.type,
          proposal: {
            senderPlayerId: sanitizeDisplayText(p.senderPlayerId, 24, ''),
            targetPlayerId: sanitizeDisplayText(p.targetPlayerId, 24, ''),
            offeredCash: Math.floor(p.offeredCash),
            requestedCash: Math.floor(p.requestedCash),
            offeredPropertyIds: p.offeredPropertyIds
              .filter((id: unknown) => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < 40)
              .slice(0, 28),
            requestedPropertyIds: p.requestedPropertyIds
              .filter((id: unknown) => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < 40)
              .slice(0, 28),
            offeredJailCards: typeof p.offeredJailCards === 'number' ? Math.max(0, Math.floor(p.offeredJailCards)) : 0,
            requestedJailCards: typeof p.requestedJailCards === 'number' ? Math.max(0, Math.floor(p.requestedJailCards)) : 0,
          },
        },
      };
    }

    case 'ACCEPT_TRADE':
    case 'REJECT_TRADE':
    case 'CANCEL_TRADE': {
      return {
        ok: true,
        value: {
          type: rawIntent.type,
          tradeId: typeof rawIntent.tradeId === 'string' ? rawIntent.tradeId.slice(0, 64) : undefined,
        },
      };
    }

    case 'CHOOSE_BRANCH_PATH':
    case 'CHOOSE_PATH': {
      const targetNodeId = sanitizeDisplayText(rawIntent.targetNodeId, 64, '');
      if (!targetNodeId) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thiếu mã nhánh đích (targetNodeId).' };
      }
      return {
        ok: true,
        value: { type: rawIntent.type, targetNodeId },
      };
    }

    case 'PLACE_TRAP': {
      const nodeId = sanitizeDisplayText(rawIntent.nodeId, 64, '');
      const trapType = sanitizeDisplayText(rawIntent.trapType, 32, '') as import('../game/types').TrapType;
      if (!nodeId || !trapType) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thông tin đặt bẫy không hợp lệ.' };
      }
      return {
        ok: true,
        value: { type: 'PLACE_TRAP', nodeId, trapType },
      };
    }

    case 'SELECT_BUSINESS_TYPE': {
      const businessId = sanitizeDisplayText(rawIntent.businessId, 64, '');
      if (!businessId) {
        return { ok: false, code: 'INVALID_SCHEMA', messageVi: 'Thiếu mã loại hình kinh doanh (businessId).' };
      }
      const tileId =
        typeof rawIntent.tileId === 'number' && Number.isInteger(rawIntent.tileId)
          ? rawIntent.tileId
          : undefined;
      const nodeId = typeof rawIntent.nodeId === 'string' ? sanitizeDisplayText(rawIntent.nodeId, 64) : undefined;
      return {
        ok: true,
        value: { type: 'SELECT_BUSINESS_TYPE', tileId, nodeId, businessId },
      };
    }

    case 'SELECT_TILE_DETAIL':
      // Tile detail is a per-viewer UI concern now: it is never synced to other players.
      return {
        ok: false,
        code: 'FORBIDDEN_CLIENT_ACTION',
        messageVi: 'Chi tiết ô đất là thao tác xem riêng, không gửi lên máy chủ.',
      };

    default:
      return {
        ok: false,
        code: 'FORBIDDEN_CLIENT_ACTION',
        messageVi: `Loại hành động không được phép: ${String(rawIntent.type).slice(0, 32)}`,
      };
  }
}

export class SlidingWindowRateLimiter {
  private buckets: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(
    private readonly maxRequests: number = 30,
    private readonly windowMs: number = 5000
  ) {}

  allow(key: string, now: number = Date.now()): boolean {
    const existing = this.buckets.get(key);
    if (!existing || now - existing.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (existing.count >= this.maxRequests) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  cleanup(now: number = Date.now()): void {
    for (const [k, v] of this.buckets.entries()) {
      if (now - v.windowStart >= this.windowMs * 2) {
        this.buckets.delete(k);
      }
    }
  }
}
