import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  ServerErrorCode,
  ServerToClientMessage,
} from '../multiplayer/protocol';
import { RoomManager } from './roomManager';
import { RoomRepository } from './roomRepository';
import {
  MAX_WS_MESSAGE_BYTES,
  parseAndValidateClientMessage,
  SlidingWindowRateLimiter,
} from './security';

export interface MultiplayerServerConfig {
  port?: number;
  host?: string;
  dbFilePath?: string;
  defaultReconnectGraceMs?: number;
  roomExpirationMs?: number;
  aiActionDelayMs?: number;
  maxMessagesPerWindow?: number;
  rateLimitWindowMs?: number;
  deterministicTestSeed?: number;
  silentLogs?: boolean;
  allowedOrigins?: string[];
}

interface ClientConnectionContext {
  sessionId: string;
  ws: WebSocket;
  joinedRoomCode: string | null;
  lastHeartbeatAt: number;
  ip: string;
}

export class ChaosMultiplayerServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  public readonly repository: RoomRepository;
  public readonly roomManager: RoomManager;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly joinRateLimiter: SlidingWindowRateLimiter;
  private readonly connections: Map<string, ClientConnectionContext> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly silentLogs: boolean;
  private readonly allowedOrigins: string[] | undefined;

  constructor(private readonly config: MultiplayerServerConfig = {}) {
    this.silentLogs = config.silentLogs ?? false;
    this.allowedOrigins =
      config.allowedOrigins ??
      (process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
        : undefined);
    this.repository = new RoomRepository(config.dbFilePath || ':memory:');
    this.rateLimiter = new SlidingWindowRateLimiter(
      config.maxMessagesPerWindow ?? 35,
      config.rateLimitWindowMs ?? 5000
    );
    this.joinRateLimiter = new SlidingWindowRateLimiter(12, 10_000);

    this.roomManager = new RoomManager({
      repository: this.repository,
      onBroadcastToRoom: (roomCode, message) => this.broadcastToRoom(roomCode, message),
      defaultReconnectGraceMs: config.defaultReconnectGraceMs,
      roomExpirationMs: config.roomExpirationMs,
      aiActionDelayMs: config.aiActionDelayMs,
      deterministicTestSeed: config.deterministicTestSeed,
    });

    this.httpServer = http.createServer((req, res) => this.handleHttpRequest(req, res));
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: '/ws',
      maxPayload: MAX_WS_MESSAGE_BYTES * 2,
      verifyClient: (info, callback) => {
        if (!this.isOriginAllowed(info.origin)) {
          this.logInfo('WS_ORIGIN_REJECTED', { origin: info.origin });
          callback(false, 403, 'Forbidden Origin');
          return;
        }
        callback(true);
      },
    });

    this.setupWebSocketHandlers();
  }

  public isOriginAllowed(originHeader: string | undefined): boolean {
    if (!this.allowedOrigins || this.allowedOrigins.length === 0 || this.allowedOrigins.includes('*')) {
      return true;
    }
    if (!originHeader) {
      return true;
    }
    try {
      const parsed = new URL(originHeader).origin;
      return this.allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        try {
          return new URL(allowed).origin === parsed;
        } catch {
          return allowed === originHeader || allowed === parsed;
        }
      });
    } catch {
      return false;
    }
  }

  private logInfo(event: string, meta: Record<string, unknown> = {}): void {
    if (this.silentLogs) return;
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        event,
        ...meta,
      })
    );
  }

  public handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      const integrity = this.repository.checkIntegrity();
      const stats = this.repository.getStats();
      res.writeHead(integrity.ok ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: integrity.ok ? 'ok' : 'degraded',
          service: 'chaos-monopoly-multiplayer',
          version: PROTOCOL_VERSION,
          activeRooms: this.roomManager.getActiveRoomCount(),
          connectedClients: this.connections.size,
          database: {
            integrity: integrity.status,
            roomCount: stats.roomCount,
            auditCount: stats.auditCount,
            journalMode: stats.journalMode,
          },
          timestamp: Date.now(),
        })
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/ready') {
      const integrity = this.repository.checkIntegrity();
      res.writeHead(integrity.ok ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ready: integrity.ok,
          storage: 'sqlite-wal',
          databaseIntegrity: integrity.status,
          timestamp: Date.now(),
        })
      );
      return;
    }

    if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/cron/maintenance') {
      const now = Date.now();
      const pruned = this.repository.pruneExpiredRooms(now);
      const integrity = this.repository.checkIntegrity();
      const stats = this.repository.getStats();
      res.writeHead(integrity.ok ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: integrity.ok,
          service: 'chaos-monopoly-maintenance',
          expiredRoomsDeleted: pruned.expiredRoomsDeleted,
          walCheckpointed: pruned.walCheckpointed,
          activeRoomsInMemory: this.roomManager.getActiveRoomCount(),
          database: {
            integrity: integrity.status,
            roomCount: stats.roomCount,
            auditCount: stats.auditCount,
            journalMode: stats.journalMode,
          },
          timestamp: now,
        })
      );
      return;
    }

    if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/multiplayer') {
      this.handleHttpMultiplayerEndpoint(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/rooms/')) {
      const code = url.pathname.replace('/api/rooms/', '').trim().toUpperCase();
      const viewingPlayerId = url.searchParams.get('playerId') || undefined;
      if (url.searchParams.get('stepAI') === '1') {
        this.roomManager.stepAITurnSync(code);
      }
      const stateAndSummary = this.roomManager.getRoomStateAndSummary(code, viewingPlayerId);
      if (!stateAndSummary) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ROOM_NOT_FOUND', messageVi: 'Không tìm thấy phòng.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          room: stateAndSummary.room,
          gameState: stateAndSummary.gameState,
          stateVersion: stateAndSummary.stateVersion,
          serverTimestamp: Date.now(),
        })
      );
      return;
    }

    // Static asset serving if dist directory exists (for single-container production)
    const distDir = path.resolve(process.cwd(), 'dist');
    if (req.method === 'GET' && fs.existsSync(distDir)) {
      const mimeMap: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
      };

      let reqPath = url.pathname;
      if (reqPath === '/' || !path.extname(reqPath)) {
        reqPath = '/index.html';
      }
      const safePath = path.normalize(path.join(distDir, reqPath));
      if (safePath.startsWith(distDir) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        const ext = path.extname(safePath).toLowerCase();
        const contentType = mimeMap[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
        });
        fs.createReadStream(safePath).pipe(res);
        return;
      }
      // SPA Fallback for client-side routing
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'NOT_FOUND' }));
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const sessionId = `sess-${crypto.randomUUID()}`;
      const ip = (req.socket.remoteAddress || '127.0.0.1').slice(0, 64);

      const ctx: ClientConnectionContext = {
        sessionId,
        ws,
        joinedRoomCode: null,
        lastHeartbeatAt: Date.now(),
        ip,
      };
      this.connections.set(sessionId, ctx);

      this.sendToClient(ws, {
        version: PROTOCOL_VERSION,
        type: 'WELCOME',
        sessionId,
        serverTimestamp: Date.now(),
      });

      ws.on('message', (data: Buffer | string) => {
        ctx.lastHeartbeatAt = Date.now();
        this.handleIncomingClientMessage(ctx, data);
      });

      ws.on('pong', () => {
        ctx.lastHeartbeatAt = Date.now();
      });

      ws.on('close', () => {
        this.handleClientClosed(ctx);
      });

      ws.on('error', () => {
        // Ignore raw socket errors; close handler cleans up
      });
    });

    this.heartbeatInterval = setInterval(() => {
      this.rateLimiter.cleanup();
      this.joinRateLimiter.cleanup();

      const now = Date.now();
      for (const [sessionId, ctx] of Array.from(this.connections.entries())) {
        if (now - ctx.lastHeartbeatAt > 35_000) {
          this.logInfo('SOCKET_PING_TIMEOUT', { sessionId, roomCode: ctx.joinedRoomCode });
          this.connections.delete(sessionId);
          if (ctx.joinedRoomCode) {
            this.processDisconnection(ctx, false, 'PING_TIMEOUT');
          }
          try {
            ctx.ws.terminate();
          } catch {
            // Ignore
          }
        } else {
          try {
            if (ctx.ws.readyState === WebSocket.OPEN) {
              ctx.ws.ping();
            }
          } catch {
            // Ignore
          }
        }
      }
    }, 30_000);
    this.heartbeatInterval.unref?.();
  }

  private handleIncomingClientMessage(ctx: ClientConnectionContext, rawData: Buffer | string): void {
    if (!this.rateLimiter.allow(ctx.sessionId)) {
      this.sendError(
        ctx.ws,
        'RATE_LIMITED',
        'Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ giây lát.'
      );
      return;
    }

    const parsedOutcome = parseAndValidateClientMessage(rawData);
    if (!parsedOutcome.ok || !parsedOutcome.value) {
      this.sendError(
        ctx.ws,
        parsedOutcome.code || 'INVALID_SCHEMA',
        parsedOutcome.messageVi || 'Dữ liệu không hợp lệ.'
      );
      return;
    }

    const msg = parsedOutcome.value;

    switch (msg.type) {
      case 'PING': {
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: 'PONG',
          requestId: msg.requestId,
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'CREATE_ROOM': {
        if (!this.joinRateLimiter.allow(ctx.ip)) {
          this.sendError(ctx.ws, 'RATE_LIMITED', 'Tạo phòng quá nhanh. Vui lòng thử lại sau.', msg.requestId);
          return;
        }
        const res = this.roomManager.createRoom({
          sessionPlayerId: ctx.sessionId,
          playerName: msg.playerName,
          roomName: msg.roomName,
          capacity: msg.capacity,
          token: msg.token,
          cosmetics: msg.cosmetics,
          config: msg.config,
          disconnectPolicy: msg.disconnectPolicy,
          reconnectGraceMs: msg.reconnectGraceMs,
        });

        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'INTERNAL_ERROR', res.messageVi || 'Lỗi tạo phòng.', msg.requestId);
          return;
        }

        ctx.joinedRoomCode = res.data.room.roomCode;
        this.logInfo('ROOM_CREATED', {
          roomCode: res.data.room.roomCode,
          hostPlayerId: res.data.assignedPlayerId,
        });

        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_JOINED',
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'JOIN_ROOM': {
        if (!this.joinRateLimiter.allow(`${ctx.ip}:${msg.roomCode}`)) {
          this.sendError(ctx.ws, 'RATE_LIMITED', 'Thử tham gia phòng quá nhiều lần.', msg.requestId);
          return;
        }

        const res = this.roomManager.joinRoom({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          playerName: msg.playerName,
          token: msg.token,
          cosmetics: msg.cosmetics,
        });

        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'ROOM_NOT_FOUND', res.messageVi || 'Không thể vào phòng.', msg.requestId);
          return;
        }

        ctx.joinedRoomCode = res.data.room.roomCode;
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_JOINED',
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now(),
        });

        this.broadcastToRoom(
          res.data.room.roomCode,
          {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: res.data.room,
            reason: `${msg.playerName} đã tham gia phòng.`,
            serverTimestamp: Date.now(),
          },
          ctx.sessionId
        );
        return;
      }

      case 'RECONNECT_ROOM': {
        const res = this.roomManager.reconnectPlayer({
          roomCode: msg.roomCode,
          playerId: msg.playerId,
          reconnectToken: msg.reconnectToken,
          newSessionPlayerId: ctx.sessionId,
        });

        if (!res.ok || !res.data) {
          this.sendError(
            ctx.ws,
            res.code || 'INVALID_RECONNECT_TOKEN',
            res.messageVi || 'Không thể kết nối lại.',
            msg.requestId
          );
          return;
        }

        ctx.joinedRoomCode = res.data.room.roomCode;
        this.sendToClient(ctx.ws, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_JOINED',
          requestId: msg.requestId,
          room: res.data.room,
          assignedPlayerId: res.data.assignedPlayerId,
          sessionPlayerId: ctx.sessionId,
          reconnectToken: res.data.reconnectToken,
          gameState: res.data.gameState,
          serverTimestamp: Date.now(),
        });

        const reconnectedSeat = res.data.room.seats.find(s => s.playerId === res.data!.assignedPlayerId);
        this.broadcastToRoom(
          res.data.room.roomCode,
          {
            version: PROTOCOL_VERSION,
            type: 'PLAYER_RECONNECTED',
            roomCode: res.data.room.roomCode,
            playerId: res.data.assignedPlayerId,
            playerName: reconnectedSeat?.name || res.data.assignedPlayerId,
            room: res.data.room,
            serverTimestamp: Date.now(),
          },
          ctx.sessionId
        );
        return;
      }

      case 'LEAVE_ROOM': {
        const roomCode = msg.roomCode;
        if (ctx.joinedRoomCode !== roomCode) {
          this.sendError(ctx.ws, 'NOT_ROOM_MEMBER', 'Bạn không ở trong phòng này.', msg.requestId);
          return;
        }
        this.processDisconnection(ctx, true);
        ctx.joinedRoomCode = null;
        return;
      }

      case 'SET_READY': {
        const res = this.roomManager.setReady({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          isReady: msg.isReady,
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'NOT_ROOM_MEMBER', res.messageVi || 'Lỗi cập nhật sẵn sàng.', msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_UPDATED',
          room: res.data,
          reason: 'Cập nhật trạng thái sẵn sàng.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'SELECT_TOKEN': {
        const res = this.roomManager.selectToken({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          token: msg.token,
          playerName: msg.playerName,
          cosmetics: msg.cosmetics,
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'NOT_ROOM_MEMBER', res.messageVi || 'Không thể đổi nhân vật.', msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_UPDATED',
          room: res.data,
          reason: 'Cập nhật nhân vật đại diện.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'SEND_EMOTE': {
        const res = this.roomManager.broadcastEmote({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          emoteId: msg.emoteId,
        });
        if (res.ok && res.data) {
          this.broadcastToRoom(msg.roomCode, {
            version: PROTOCOL_VERSION,
            type: 'EMOTE_BROADCAST',
            roomCode: msg.roomCode,
            playerId: res.data.playerId,
            playerName: res.data.playerName,
            emoteId: res.data.emoteId,
            serverTimestamp: res.data.serverTimestamp,
          });
        }
        return;
      }

      case 'CONFIGURE_ROOM': {
        const res = this.roomManager.configureRoom({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          capacity: msg.capacity,
          config: msg.config,
          disconnectPolicy: msg.disconnectPolicy,
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'NOT_ROOM_HOST', res.messageVi || 'Không thể cấu hình phòng.', msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_UPDATED',
          room: res.data,
          reason: 'Chủ phòng đã cập nhật cấu hình trận đấu.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'CONFIGURE_SEAT_AI': {
        const res = this.roomManager.configureSeatAI({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          seatIndex: msg.seatIndex,
          isAI: msg.isAI,
          aiPersonality: msg.aiPersonality,
          aiDifficulty: msg.aiDifficulty,
          name: msg.name,
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'NOT_ROOM_HOST', res.messageVi || 'Không thể cấu hình AI.', msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'ROOM_UPDATED',
          room: res.data,
          reason: 'Chủ phòng đã cập nhật vị trí AI.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'START_MATCH': {
        const res = this.roomManager.startMatch({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
        });
        if (!res.ok || !res.data) {
          this.sendError(ctx.ws, res.code || 'NOT_ROOM_HOST', res.messageVi || 'Không thể bắt đầu trận đấu.', msg.requestId);
          return;
        }
        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'MATCH_STARTED',
          room: res.data.room,
          gameState: res.data.gameState,
          stateVersion: res.data.stateVersion,
          serverTimestamp: Date.now(),
        });
        return;
      }

      case 'SUBMIT_ACTION': {
        const res = this.roomManager.submitClientAction({
          roomCode: msg.roomCode,
          sessionPlayerId: ctx.sessionId,
          actionId: msg.actionId,
          expectedStateVersion: msg.expectedStateVersion,
          intent: msg.intent,
        });

        if (!res.ok || !res.data) {
          const currentSummary = this.roomManager.getRoomSummary(msg.roomCode);
          this.sendToClient(ctx.ws, {
            version: PROTOCOL_VERSION,
            type: 'ACTION_REJECTED',
            requestId: msg.requestId,
            actionId: msg.actionId,
            code: res.code || 'INVALID_GAME_ACTION',
            messageVi: res.messageVi || 'Nước đi không hợp lệ.',
            stateVersion: currentSummary?.stateVersion || 0,
            serverTimestamp: Date.now(),
          });
          return;
        }

        this.broadcastToRoom(msg.roomCode, {
          version: PROTOCOL_VERSION,
          type: 'STATE_SYNC',
          roomCode: msg.roomCode,
          stateVersion: res.data.stateVersion,
          lastActionType: res.data.actionType,
          lastActorPlayerId: res.data.actorPlayerId,
          actionId: msg.actionId,
          gameState: res.data.gameState,
          room: res.data.room,
          serverTimestamp: Date.now(),
        });

        if (res.data.room.status === 'FINISHED') {
          this.broadcastToRoom(msg.roomCode, {
            version: PROTOCOL_VERSION,
            type: 'MATCH_FINISHED',
            roomCode: msg.roomCode,
            winner: res.data.gameState.winner,
            gameState: res.data.gameState,
            room: res.data.room,
            stateVersion: res.data.stateVersion,
            serverTimestamp: Date.now(),
          });
        }
        return;
      }
    }
  }

  private handleClientClosed(ctx: ClientConnectionContext): void {
    this.connections.delete(ctx.sessionId);
    if (ctx.joinedRoomCode) {
      this.processDisconnection(ctx, false);
    }
  }

  private processDisconnection(ctx: ClientConnectionContext, voluntaryLeave: boolean, reason?: string): void {
    if (!ctx.joinedRoomCode) return;
    const roomCode = ctx.joinedRoomCode;
    ctx.joinedRoomCode = null;
    this.logInfo('SESSION_DISCONNECTED', {
      sessionId: ctx.sessionId,
      roomCode,
      reason: reason || (voluntaryLeave ? 'VOLUNTARY' : 'CLOSE_EVENT'),
    });
    const outcome = this.roomManager.handleSessionDisconnected(
      roomCode,
      ctx.sessionId,
      voluntaryLeave
    );
    if (!outcome) return;

    this.broadcastToRoom(roomCode, {
      version: PROTOCOL_VERSION,
      type: 'PLAYER_DISCONNECTED',
      roomCode,
      playerId: outcome.disconnectedPlayerId,
      playerName: outcome.disconnectedPlayerName,
      reconnectDeadlineAt: outcome.reconnectDeadlineAt,
      room: outcome.room,
      serverTimestamp: Date.now(),
    });

    if (outcome.migratedHost) {
      this.broadcastToRoom(roomCode, {
        version: PROTOCOL_VERSION,
        type: 'HOST_MIGRATED',
        roomCode,
        newHostPlayerId: outcome.migratedHost.newHostPlayerId,
        newHostName: outcome.migratedHost.newHostName,
        room: outcome.room,
        serverTimestamp: Date.now(),
      });
    }
  }

  public broadcastToRoom(
    roomCode: string,
    message: ServerToClientMessage,
    excludeSessionId?: string
  ): void {
    const summary = this.roomManager.getRoomSummary(roomCode);
    if (!summary) return;

    const memberSessionIds = new Set(
      summary.seats.filter(s => !s.isAI && s.connected).map(s => s.sessionPlayerId)
    );

    const serialized = JSON.stringify(message);
    for (const [sessionId, ctx] of this.connections.entries()) {
      if (excludeSessionId && sessionId === excludeSessionId) continue;
      if (ctx.joinedRoomCode === roomCode || memberSessionIds.has(sessionId)) {
        if (ctx.ws.readyState === WebSocket.OPEN) {
          ctx.ws.send(serialized);
        }
      }
    }
  }

  private sendToClient(ws: WebSocket, message: ServerToClientMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(
    ws: WebSocket,
    code: ServerErrorCode,
    messageVi: string,
    requestId?: string
  ): void {
    this.sendToClient(ws, {
      version: PROTOCOL_VERSION,
      type: 'ERROR',
      requestId,
      code,
      messageVi,
      serverTimestamp: Date.now(),
    });
  }

  /**
   * HTTP / Serverless Multiplayer Transport Endpoint (`/api/multiplayer`).
   * Allows full online room creation, joining, reconnection, actions, and polling over HTTP
   * on platforms where persistent WebSocket connections are proxied or serverless (e.g., Vercel).
   */
  public handleHttpMultiplayerEndpoint(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: URL
  ): void {
    const sendJson = (status: number, payload: ServerToClientMessage | Record<string, unknown>) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'GET') {
      const roomCode = (url.searchParams.get('roomCode') || '').trim().toUpperCase();
      const playerId = url.searchParams.get('playerId') || undefined;
      if (!roomCode) {
        sendJson(200, {
          version: PROTOCOL_VERSION,
          type: 'WELCOME',
          sessionId: `http-${crypto.randomUUID()}`,
          serverTimestamp: Date.now(),
        });
        return;
      }
      this.roomManager.stepAITurnSync(roomCode);
      const stateAndSummary = this.roomManager.getRoomStateAndSummary(roomCode, playerId);
      if (!stateAndSummary) {
        sendJson(404, {
          version: PROTOCOL_VERSION,
          type: 'ERROR',
          code: 'ROOM_NOT_FOUND',
          messageVi: 'Không tìm thấy phòng.',
          serverTimestamp: Date.now(),
        });
        return;
      }
      sendJson(200, {
        version: PROTOCOL_VERSION,
        type: stateAndSummary.gameState ? 'STATE_SYNC' : 'ROOM_UPDATED',
        roomCode,
        stateVersion: stateAndSummary.stateVersion,
        lastActionType: 'POLL_SYNC',
        lastActorPlayerId: stateAndSummary.room.hostPlayerId,
        actionId: `poll-${stateAndSummary.stateVersion}`,
        gameState: stateAndSummary.gameState as any,
        room: stateAndSummary.room,
        reason: '',
        serverTimestamp: Date.now(),
      });
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes <= MAX_WS_MESSAGE_BYTES * 2) {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let rawJson: any = {};
      try {
        rawJson = JSON.parse(rawBody || '{}');
      } catch {
        sendJson(400, {
          version: PROTOCOL_VERSION,
          type: 'ERROR',
          code: 'INVALID_SCHEMA',
          messageVi: 'Gói tin JSON không hợp lệ.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      const sessionHeader = req.headers['x-session-id'];
      const sessionId =
        (typeof sessionHeader === 'string' && sessionHeader.trim()) ||
        (typeof rawJson.sessionId === 'string' && rawJson.sessionId.trim()) ||
        `http-${crypto.randomUUID()}`;

      const parsedOutcome = parseAndValidateClientMessage(rawBody);
      if (!parsedOutcome.ok || !parsedOutcome.value) {
        sendJson(400, {
          version: PROTOCOL_VERSION,
          type: 'ERROR',
          code: parsedOutcome.code || 'INVALID_SCHEMA',
          messageVi: parsedOutcome.messageVi || 'Dữ liệu không hợp lệ.',
          serverTimestamp: Date.now(),
        });
        return;
      }

      const msg = parsedOutcome.value;
      if ('roomCode' in msg && msg.roomCode) {
        this.roomManager.syncRoomFromRepository(msg.roomCode);
      }

      switch (msg.type) {
        case 'PING':
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: 'PONG',
            requestId: msg.requestId,
            serverTimestamp: Date.now(),
          });
          return;

        case 'CREATE_ROOM': {
          const r = this.roomManager.createRoom({
            sessionPlayerId: sessionId,
            playerName: msg.playerName,
            roomName: msg.roomName,
            capacity: msg.capacity,
            token: msg.token,
            cosmetics: msg.cosmetics,
            config: msg.config,
            disconnectPolicy: msg.disconnectPolicy,
            reconnectGraceMs: msg.reconnectGraceMs,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'INTERNAL_ERROR',
              messageVi: r.messageVi || 'Lỗi tạo phòng.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: 'ROOM_JOINED',
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now(),
          });
          return;
        }

        case 'JOIN_ROOM': {
          const r = this.roomManager.joinRoom({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            playerName: msg.playerName,
            token: msg.token,
            cosmetics: msg.cosmetics,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'ROOM_NOT_FOUND',
              messageVi: r.messageVi || 'Không thể vào phòng.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          this.broadcastToRoom(r.data.room.roomCode, {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: r.data.room,
            reason: `${msg.playerName} đã tham gia phòng.`,
            serverTimestamp: Date.now(),
          });
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: 'ROOM_JOINED',
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now(),
          });
          return;
        }

        case 'RECONNECT_ROOM': {
          const r = this.roomManager.reconnectPlayer({
            roomCode: msg.roomCode,
            playerId: msg.playerId,
            reconnectToken: msg.reconnectToken,
            newSessionPlayerId: sessionId,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'INVALID_RECONNECT_TOKEN',
              messageVi: r.messageVi || 'Không thể kết nối lại.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: 'ROOM_JOINED',
            requestId: msg.requestId,
            room: r.data.room,
            assignedPlayerId: r.data.assignedPlayerId,
            sessionPlayerId: sessionId,
            reconnectToken: r.data.reconnectToken,
            gameState: r.data.gameState,
            serverTimestamp: Date.now(),
          });
          return;
        }

        case 'LEAVE_ROOM': {
          this.roomManager.handleSessionDisconnected(msg.roomCode, sessionId, true);
          sendJson(200, {
            version: PROTOCOL_VERSION,
            type: 'PONG',
            requestId: msg.requestId,
            serverTimestamp: Date.now(),
          });
          return;
        }

        case 'SET_READY': {
          const r = this.roomManager.setReady({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            isReady: msg.isReady,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'NOT_ROOM_MEMBER',
              messageVi: r.messageVi || 'Lỗi cập nhật sẵn sàng.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          const updateMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: r.data,
            reason: 'Cập nhật trạng thái sẵn sàng.',
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }

        case 'SELECT_TOKEN': {
          const r = this.roomManager.selectToken({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            token: msg.token,
            playerName: msg.playerName,
            cosmetics: msg.cosmetics,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'NOT_ROOM_MEMBER',
              messageVi: r.messageVi || 'Không thể đổi nhân vật.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          const updateMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: r.data,
            reason: 'Cập nhật nhân vật đại diện.',
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }

        case 'SEND_EMOTE': {
          const r = this.roomManager.broadcastEmote({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            emoteId: msg.emoteId,
          });
          if (r.ok && r.data) {
            const emoteMsg: ServerToClientMessage = {
              version: PROTOCOL_VERSION,
              type: 'EMOTE_BROADCAST',
              roomCode: msg.roomCode,
              playerId: r.data.playerId,
              playerName: r.data.playerName,
              emoteId: r.data.emoteId,
              serverTimestamp: r.data.serverTimestamp,
            };
            this.broadcastToRoom(msg.roomCode, emoteMsg);
            sendJson(200, emoteMsg);
            return;
          }
          sendJson(400, {
            version: PROTOCOL_VERSION,
            type: 'ERROR',
            code: r.code || 'NOT_ROOM_MEMBER',
            messageVi: r.messageVi || 'Lỗi gửi biểu cảm.',
            serverTimestamp: Date.now(),
          });
          return;
        }

        case 'CONFIGURE_ROOM': {
          const r = this.roomManager.configureRoom({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            capacity: msg.capacity,
            config: msg.config,
            disconnectPolicy: msg.disconnectPolicy,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'NOT_ROOM_HOST',
              messageVi: r.messageVi || 'Không thể cấu hình phòng.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          const updateMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: r.data,
            reason: 'Chủ phòng đã cập nhật cấu hình trận đấu.',
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }

        case 'CONFIGURE_SEAT_AI': {
          const r = this.roomManager.configureSeatAI({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            seatIndex: msg.seatIndex,
            isAI: msg.isAI,
            aiPersonality: msg.aiPersonality,
            aiDifficulty: msg.aiDifficulty,
            name: msg.name,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'NOT_ROOM_HOST',
              messageVi: r.messageVi || 'Không thể cấu hình AI.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          const updateMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'ROOM_UPDATED',
            room: r.data,
            reason: 'Chủ phòng đã cập nhật vị trí AI.',
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, updateMsg);
          sendJson(200, updateMsg);
          return;
        }

        case 'START_MATCH': {
          const r = this.roomManager.startMatch({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
          });
          if (!r.ok || !r.data) {
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ERROR',
              requestId: msg.requestId,
              code: r.code || 'NOT_ROOM_HOST',
              messageVi: r.messageVi || 'Không thể bắt đầu trận đấu.',
              serverTimestamp: Date.now(),
            });
            return;
          }
          const startMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'MATCH_STARTED',
            room: r.data.room,
            gameState: r.data.gameState,
            stateVersion: r.data.stateVersion,
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, startMsg);
          sendJson(200, startMsg);
          return;
        }

        case 'SUBMIT_ACTION': {
          const r = this.roomManager.submitClientAction({
            roomCode: msg.roomCode,
            sessionPlayerId: sessionId,
            actionId: msg.actionId,
            expectedStateVersion: msg.expectedStateVersion,
            intent: msg.intent,
          });
          if (!r.ok || !r.data) {
            const currentSummary = this.roomManager.getRoomSummary(msg.roomCode);
            sendJson(400, {
              version: PROTOCOL_VERSION,
              type: 'ACTION_REJECTED',
              requestId: msg.requestId,
              actionId: msg.actionId,
              code: r.code || 'INVALID_GAME_ACTION',
              messageVi: r.messageVi || 'Nước đi không hợp lệ.',
              stateVersion: currentSummary?.stateVersion || 0,
              serverTimestamp: Date.now(),
            });
            return;
          }
          const syncMsg: ServerToClientMessage = {
            version: PROTOCOL_VERSION,
            type: 'STATE_SYNC',
            roomCode: msg.roomCode,
            stateVersion: r.data.stateVersion,
            lastActionType: r.data.actionType,
            lastActorPlayerId: r.data.actorPlayerId,
            actionId: msg.actionId,
            gameState: r.data.gameState,
            room: r.data.room,
            serverTimestamp: Date.now(),
          };
          this.broadcastToRoom(msg.roomCode, syncMsg);
          sendJson(200, syncMsg);
          return;
        }
      }
    });
  }

  public async listen(port: number = this.config.port ?? 3001, host: string = this.config.host ?? '127.0.0.1'): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(port, host, () => {
        const addr = this.httpServer.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        this.logInfo('MULTIPLAYER_SERVER_LISTENING', { host, port: actualPort });
        resolve(actualPort);
      });
    });
  }

  public async stop(): Promise<void> {
    return this.close();
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.roomManager.shutdown();
    for (const ctx of this.connections.values()) {
      try {
        ctx.ws.close();
      } catch {
        // Ignore
      }
    }
    this.connections.clear();

    await new Promise<void>(resolve => {
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.repository.close();
          resolve();
        });
      });
    });
  }
}
