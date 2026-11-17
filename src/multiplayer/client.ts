import {
  ClientIntentPayload,
  ClientToServerMessage,
  DisconnectPolicy,
  PROTOCOL_VERSION,
  RoomPublicSummary,
  ServerToClientMessage,
} from './protocol';
import { PlayerCosmetics } from '../cosmetics/types';
import { AIDifficulty, AIPersonalityId, GameConfig, GameState, PlayerId, PlayerToken } from '../game/types';

export const ONLINE_SESSION_STORAGE_KEY = 'chaos_monopoly_online_session_v1';

export interface StoredOnlineCredentials {
  roomCode: string;
  playerId: PlayerId;
  reconnectToken: string;
  playerName: string;
  savedAt: number;
}

export function loadStoredOnlineCredentials(): StoredOnlineCredentials | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(ONLINE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOnlineCredentials;
    if (!parsed.roomCode || !parsed.playerId || !parsed.reconnectToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredOnlineCredentials(creds: StoredOnlineCredentials): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(ONLINE_SESSION_STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredOnlineCredentials(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(ONLINE_SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface OnlineClientCallbacks {
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onRoomUpdated?: (room: RoomPublicSummary, assignedPlayerId: PlayerId | null) => void;
  onGameStateSync?: (gameState: GameState, stateVersion: number, room: RoomPublicSummary) => void;
  onError?: (code: string, messageVi: string) => void;
  onNotification?: (messageVi: string, level: 'INFO' | 'WARNING' | 'SUCCESS') => void;
  onEmoteReceived?: (playerId: PlayerId, playerName: string, emoteId: string) => void;
}

export class ChaosMultiplayerClient {
  private ws: WebSocket | null = null;
  public status: ConnectionStatus = 'DISCONNECTED';
  private room: RoomPublicSummary | null = null;
  private assignedPlayerId: PlayerId | null = null;
  private reconnectToken: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private manualClose: boolean = false;
  private wsUrl: string;
  private httpApiUrl: string;
  private httpPollingMode: boolean = false;
  private httpPollTimer: ReturnType<typeof setInterval> | null = null;
  private httpSessionId: string;
  private lastSyncedStateVersion: number = 0;

  constructor(
    private readonly callbacks: OnlineClientCallbacks = {},
    customWsUrl?: string
  ) {
    this.httpSessionId = `http-sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    if (customWsUrl) {
      this.wsUrl = customWsUrl;
      this.httpApiUrl = customWsUrl
        .replace(/^wss:/, 'https:')
        .replace(/^ws:/, 'http:')
        .replace(/\/ws$/, '/api/multiplayer');
    } else if (typeof window !== 'undefined') {
      const envUrl = (import.meta as any).env?.VITE_WS_URL;
      const envApiUrl = (import.meta as any).env?.VITE_API_URL;
      if (envUrl) {
        this.wsUrl = envUrl;
        this.httpApiUrl =
          envApiUrl ||
          envUrl
            .replace(/^wss:/, 'https:')
            .replace(/^ws:/, 'http:')
            .replace(/\/ws$/, '/api/multiplayer');
      } else if ((import.meta as any).env?.PROD) {
        // Production build is served by the game server or Vercel edge/serverless
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsUrl = `${protocol}//${window.location.host}/ws`;
        this.httpApiUrl = envApiUrl || `${window.location.origin}/api/multiplayer`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const httpProto = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.hostname || 'localhost';
        const port = (import.meta as any).env?.VITE_MULTIPLAYER_PORT || '3001';
        this.wsUrl = `${protocol}//${host}:${port}/ws`;
        this.httpApiUrl = envApiUrl || `${httpProto}//${host}:${port}/api/multiplayer`;
      }
    } else {
      this.wsUrl = 'ws://127.0.0.1:3001/ws';
      this.httpApiUrl = 'http://127.0.0.1:3001/api/multiplayer';
    }
  }

  public connect(onConnected?: () => void): void {
    if (this.httpPollingMode && this.status === 'CONNECTED') {
      if (onConnected) onConnected();
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN && onConnected) {
        onConnected();
      }
      return;
    }

    this.manualClose = false;
    this.setStatus(this.reconnectToken ? 'RECONNECTING' : 'CONNECTING');

    let opened = false;
    try {
      const socket = new WebSocket(this.wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        opened = true;
        this.httpPollingMode = false;
        this.stopHttpPolling();
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        this.startHeartbeat();
        if (onConnected) {
          onConnected();
        } else if (this.room && this.assignedPlayerId && this.reconnectToken) {
          this.sendReconnect(this.room.roomCode, this.assignedPlayerId, this.reconnectToken);
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(String(event.data)) as ServerToClientMessage;
          this.handleServerMessage(msg);
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        if (!opened && !this.manualClose) {
          // WebSocket handshake rejected (e.g. serverless platform like Vercel) -> try HTTP fallback!
          this.tryHttpFallback(onConnected);
          return;
        }
        if (!this.manualClose && this.room && this.reconnectToken) {
          this.scheduleAutoReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };

      socket.onerror = () => {
        // Socket error is immediately followed by 'close' event in browser and Node environments.
      };
    } catch {
      this.ws = null;
      this.tryHttpFallback(onConnected);
    }
  }

  private async tryHttpFallback(onConnected?: () => void): Promise<void> {
    if (this.manualClose || typeof fetch === 'undefined') {
      this.setStatus('DISCONNECTED');
      return;
    }
    try {
      const res = await fetch(this.httpApiUrl, {
        method: 'GET',
        headers: { 'X-Session-Id': this.httpSessionId },
      });
      if (!res.ok) throw new Error('HTTP Fallback unreachable');
      const data = (await res.json()) as ServerToClientMessage;
      if (data && data.type === 'WELCOME' && data.sessionId) {
        this.httpSessionId = data.sessionId;
      }
      this.httpPollingMode = true;
      this.reconnectAttempts = 0;
      this.setStatus('CONNECTED');
      this.startHttpPolling();
      if (onConnected) {
        onConnected();
      } else if (this.room && this.assignedPlayerId && this.reconnectToken) {
        this.sendReconnect(this.room.roomCode, this.assignedPlayerId, this.reconnectToken);
      }
    } catch {
      if (!this.manualClose && this.room && this.reconnectToken) {
        this.scheduleAutoReconnect();
      } else {
        this.setStatus('DISCONNECTED');
        this.callbacks.onError?.('CONNECTION_FAILED', 'Không thể kết nối tới máy chủ Multiplayer.');
      }
    }
  }

  private startHttpPolling(): void {
    this.stopHttpPolling();
    this.httpPollTimer = setInterval(async () => {
      if (!this.httpPollingMode || !this.room || this.manualClose) return;
      try {
        const q = new URLSearchParams({
          roomCode: this.room.roomCode,
          ...(this.assignedPlayerId ? { playerId: this.assignedPlayerId } : {}),
        });
        const res = await fetch(`${this.httpApiUrl}?${q.toString()}`, {
          method: 'GET',
          headers: { 'X-Session-Id': this.httpSessionId },
        });
        if (!res.ok) return;
        const msg = (await res.json()) as ServerToClientMessage;
        if (msg.type === 'STATE_SYNC') {
          if (msg.stateVersion !== this.lastSyncedStateVersion || this.room.status !== msg.room.status) {
            this.lastSyncedStateVersion = msg.stateVersion;
            this.handleServerMessage(msg);
          }
        } else if (msg.type === 'ROOM_UPDATED') {
          if (msg.room.stateVersion !== this.lastSyncedStateVersion || this.room.seats.length !== msg.room.seats.length) {
            this.lastSyncedStateVersion = msg.room.stateVersion;
            this.handleServerMessage(msg);
          }
        }
      } catch {
        // Ignore transient poll error
      }
    }, 900);
  }

  private stopHttpPolling(): void {
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
  }

  private scheduleAutoReconnect(): void {
    if (this.autoReconnectTimer) {
      clearTimeout(this.autoReconnectTimer);
      this.autoReconnectTimer = null;
    }

    if (this.manualClose || !this.room || !this.assignedPlayerId || !this.reconnectToken) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.status !== 'DISCONNECTED') {
        this.setStatus('DISCONNECTED');
        this.callbacks.onError?.(
          'RECONNECT_FAILED',
          `Không thể kết nối lại sau ${this.maxReconnectAttempts} lần thử. Vui lòng kiểm tra lại mạng.`
        );
        this.callbacks.onNotification?.(
          'Tự động kết nối lại thất bại. Vui lòng thử lại thủ công.',
          'WARNING'
        );
      }
      return;
    }

    // Exponential backoff with jitter: 1s -> 2s -> 4s up to 10s max
    const baseDelay = Math.min(10_000, 1000 * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.floor(Math.random() * 400);
    const delay = Math.min(10_000, baseDelay + jitter);

    this.reconnectAttempts += 1;
    this.setStatus('RECONNECTING');

    this.autoReconnectTimer = setTimeout(() => {
      this.autoReconnectTimer = null;
      if (!this.manualClose && this.room && this.assignedPlayerId && this.reconnectToken) {
        this.connect(() => {
          if (this.room && this.assignedPlayerId && this.reconnectToken) {
            this.sendReconnect(this.room.roomCode, this.assignedPlayerId, this.reconnectToken);
          }
        });
      }
    }, delay);
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.callbacks.onConnectionStatusChange?.(next);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendRaw({
        version: PROTOCOL_VERSION,
        type: 'PING',
        requestId: `ping-${Date.now()}`,
        clientTimestamp: Date.now(),
      });
    }, 15_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleServerMessage(msg: ServerToClientMessage): void {
    switch (msg.type) {
      case 'ROOM_JOINED': {
        this.reconnectAttempts = 0;
        this.room = msg.room;
        this.assignedPlayerId = msg.assignedPlayerId;
        this.reconnectToken = msg.reconnectToken;
        const mySeat = msg.room.seats.find(s => s.playerId === msg.assignedPlayerId);
        saveStoredOnlineCredentials({
          roomCode: msg.room.roomCode,
          playerId: msg.assignedPlayerId,
          reconnectToken: msg.reconnectToken,
          playerName: mySeat?.name || msg.assignedPlayerId,
          savedAt: Date.now(),
        });
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        if (msg.gameState) {
          this.callbacks.onGameStateSync?.(msg.gameState, msg.room.stateVersion, msg.room);
        }
        break;
      }

      case 'ROOM_UPDATED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        if (msg.reason) {
          this.callbacks.onNotification?.(msg.reason, 'INFO');
        }
        break;
      }

      case 'MATCH_STARTED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onGameStateSync?.(msg.gameState, msg.stateVersion, msg.room);
        this.callbacks.onNotification?.('Trận đấu trực tuyến đã bắt đầu!', 'SUCCESS');
        break;
      }

      case 'STATE_SYNC': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onGameStateSync?.(msg.gameState, msg.stateVersion, msg.room);
        break;
      }

      case 'PLAYER_DISCONNECTED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onNotification?.(
          `${msg.playerName} bị mất kết nối. Đang giữ chỗ trong ${Math.round(msg.room.reconnectGraceMs / 1000)}s...`,
          'WARNING'
        );
        break;
      }

      case 'PLAYER_RECONNECTED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onNotification?.(`${msg.playerName} đã kết nối lại trận đấu!`, 'SUCCESS');
        break;
      }

      case 'HOST_MIGRATED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onNotification?.(
          `Quyền Chủ Phòng đã được chuyển cho ${msg.newHostName}.`,
          'INFO'
        );
        break;
      }

      case 'MATCH_FINISHED': {
        this.room = msg.room;
        this.callbacks.onRoomUpdated?.(msg.room, this.assignedPlayerId);
        this.callbacks.onGameStateSync?.(msg.gameState, msg.stateVersion, msg.room);
        clearStoredOnlineCredentials();
        break;
      }

      case 'EMOTE_BROADCAST': {
        this.callbacks.onEmoteReceived?.(msg.playerId, msg.playerName, msg.emoteId);
        break;
      }

      case 'ACTION_REJECTED':
      case 'ERROR': {
        if (
          msg.code === 'INVALID_RECONNECT_TOKEN' ||
          msg.code === 'ROOM_EXPIRED' ||
          msg.code === 'ROOM_NOT_FOUND' ||
          msg.code === 'NOT_ROOM_MEMBER'
        ) {
          clearStoredOnlineCredentials();
          this.reconnectToken = null;
        }
        this.callbacks.onError?.(msg.code, msg.messageVi);
        break;
      }

      default:
        break;
    }
  }

  private sendRaw(payload: ClientToServerMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return;
    }
    if (this.httpPollingMode && typeof fetch !== 'undefined') {
      fetch(this.httpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.httpSessionId,
        },
        body: JSON.stringify(payload),
      })
        .then(res => res.json())
        .then((msg: ServerToClientMessage) => {
          if (msg && msg.type) {
            if ('stateVersion' in msg && typeof msg.stateVersion === 'number') {
              this.lastSyncedStateVersion = msg.stateVersion;
            } else if ('room' in msg && msg.room?.stateVersion) {
              this.lastSyncedStateVersion = msg.room.stateVersion;
            }
            this.handleServerMessage(msg);
          }
        })
        .catch(() => {
          // Ignore transient fetch error
        });
    }
  }

  public createRoom(params: {
    playerName: string;
    roomName?: string;
    capacity?: number;
    token?: PlayerToken;
    cosmetics?: PlayerCosmetics;
    config?: Partial<GameConfig>;
    disconnectPolicy?: DisconnectPolicy;
  }): void {
    this.connect(() => {
      this.sendRaw({
        version: PROTOCOL_VERSION,
        type: 'CREATE_ROOM',
        requestId: `create-${Date.now()}`,
        ...params,
      });
    });
  }

  public joinRoom(params: {
    roomCode: string;
    playerName: string;
    token?: PlayerToken;
    cosmetics?: PlayerCosmetics;
  }): void {
    this.connect(() => {
      this.sendRaw({
        version: PROTOCOL_VERSION,
        type: 'JOIN_ROOM',
        requestId: `join-${Date.now()}`,
        ...params,
      });
    });
  }

  public sendReconnect(roomCode: string, playerId: PlayerId, reconnectToken: string): void {
    this.reconnectAttempts = 0;
    this.reconnectToken = reconnectToken;
    this.assignedPlayerId = playerId;
    this.connect(() => {
      this.sendRaw({
        version: PROTOCOL_VERSION,
        type: 'RECONNECT_ROOM',
        requestId: `reconn-${Date.now()}`,
        roomCode,
        playerId,
        reconnectToken,
      });
    });
  }

  public setReady(isReady: boolean): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'SET_READY',
      requestId: `ready-${Date.now()}`,
      roomCode: this.room.roomCode,
      isReady,
    });
  }

  public selectToken(token: PlayerToken, playerName?: string, cosmetics?: PlayerCosmetics): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'SELECT_TOKEN',
      requestId: `token-${Date.now()}`,
      roomCode: this.room.roomCode,
      token,
      playerName,
      cosmetics,
    });
  }

  public sendEmote(emoteId: string): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'SEND_EMOTE',
      requestId: `emote-${Date.now()}`,
      roomCode: this.room.roomCode,
      emoteId,
    });
  }

  public configureRoom(params: {
    capacity?: number;
    config?: Partial<GameConfig>;
    disconnectPolicy?: DisconnectPolicy;
  }): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'CONFIGURE_ROOM',
      requestId: `cfg-${Date.now()}`,
      roomCode: this.room.roomCode,
      ...params,
    });
  }

  public configureSeatAI(params: {
    seatIndex: number;
    isAI: boolean;
    aiPersonality?: AIPersonalityId;
    aiDifficulty?: AIDifficulty;
    name?: string;
  }): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'CONFIGURE_SEAT_AI',
      requestId: `ai-${Date.now()}`,
      roomCode: this.room.roomCode,
      ...params,
    });
  }

  public startMatch(): void {
    if (!this.room) return;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'START_MATCH',
      requestId: `start-${Date.now()}`,
      roomCode: this.room.roomCode,
    });
  }

  public submitAction(intent: ClientIntentPayload): boolean {
    if (!this.room) {
      this.callbacks.onNotification?.('Chưa tham gia phòng chơi online.', 'WARNING');
      return false;
    }

    const isConnected =
      (this.ws && this.ws.readyState === WebSocket.OPEN) ||
      (this.httpPollingMode && this.status === 'CONNECTED');

    if (!isConnected) {
      const isReconnecting = this.status === 'RECONNECTING';
      const msg = isReconnecting
        ? 'Đang kết nối lại máy chủ, vui lòng chờ giây lát trước khi gửi hành động...'
        : 'Mất kết nối tới máy chủ. Vui lòng kết nối lại để tiếp tục chơi.';
      this.callbacks.onNotification?.(msg, 'WARNING');
      this.callbacks.onError?.('NOT_CONNECTED', msg);
      return false;
    }

    const actionId = `act-${this.assignedPlayerId || 'p'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.sendRaw({
      version: PROTOCOL_VERSION,
      type: 'SUBMIT_ACTION',
      requestId: actionId,
      roomCode: this.room.roomCode,
      actionId,
      intent,
    });
    return true;
  }

  public leaveRoom(): void {
    if (this.room) {
      this.sendRaw({
        version: PROTOCOL_VERSION,
        type: 'LEAVE_ROOM',
        requestId: `leave-${Date.now()}`,
        roomCode: this.room.roomCode,
      });
    }
    clearStoredOnlineCredentials();
    this.room = null;
    this.assignedPlayerId = null;
    this.reconnectToken = null;
    this.disconnect();
  }

  public disconnect(): void {
    this.manualClose = true;
    this.reconnectAttempts = 0;
    this.httpPollingMode = false;
    this.stopHeartbeat();
    this.stopHttpPolling();
    if (this.autoReconnectTimer) {
      clearTimeout(this.autoReconnectTimer);
      this.autoReconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }
}
