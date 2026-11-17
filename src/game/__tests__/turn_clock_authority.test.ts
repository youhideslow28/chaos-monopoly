import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomManager } from '../../server/roomManager';
import { RoomRepository } from '../../server/roomRepository';
import { ClientIntentPayload, ServerToClientMessage } from '../../multiplayer/protocol';
import { GameState } from '../types';

const TURN_MS = 45_000;
const POSTPONE_MS = 30_000;
const HOST_SESSION = 'sess-host';
const GUEST_SESSION = 'sess-guest';

describe('Turn clock — server-confirmed deadlines (roadmap A)', () => {
  let manager: RoomManager;
  let sent: ServerToClientMessage[];
  let now: number;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    now = Date.UTC(2026, 10, 4, 12, 0, 0);
    vi.setSystemTime(now);
    sent = [];
    manager = new RoomManager({
      repository: new RoomRepository(':memory:'),
      onBroadcastToRoom: (_roomCode, message) => {
        sent.push(message);
      },
      aiActionDelayMs: 1_000_000,
      deterministicTestSeed: 424242,
      turnTimeoutMs: TURN_MS,
      turnPostponeMs: POSTPONE_MS,
    });
  });

  afterEach(() => {
    manager.shutdown();
    vi.useRealTimers();
  });

  function advance(ms: number): void {
    now += ms;
    vi.setSystemTime(now);
    manager.tickTurnTimers(now);
  }

  function stateSyncs() {
    return sent.filter(
      (m): m is Extract<ServerToClientMessage, { type: 'STATE_SYNC' }> => m.type === 'STATE_SYNC'
    );
  }

  function deadlineOf(roomCode: string): number | null | undefined {
    return manager.getRoomSummary(roomCode)?.turnDeadlineAt;
  }

  function startTwoHumans() {
    const created = manager.createRoom({ sessionPlayerId: HOST_SESSION, playerName: 'Host' });
    if (!created.ok || !created.data) throw new Error('createRoom failed');
    const roomCode = created.data.room.roomCode;
    const joined = manager.joinRoom({ roomCode, sessionPlayerId: GUEST_SESSION, playerName: 'Guest' });
    if (!joined.ok) throw new Error('joinRoom failed');
    const started = manager.startMatch({ roomCode, sessionPlayerId: HOST_SESSION });
    if (!started.ok || !started.data) throw new Error('startMatch failed');
    return { roomCode, reconnectToken: created.data.reconnectToken, state: started.data.gameState };
  }

  it('starts no clock in a lobby', () => {
    const created = manager.createRoom({ sessionPlayerId: HOST_SESSION, playerName: 'Host' });
    if (!created.ok || !created.data) throw new Error('createRoom failed');
    expect(deadlineOf(created.data.room.roomCode)).toBeNull();
  });

  it('gives the active human a 45 second clock when the match starts', () => {
    const { roomCode } = startTwoHumans();
    expect(deadlineOf(roomCode)).toBe(now + TURN_MS);
  });

  it('auto-rolls for the active human when the roll window expires', () => {
    const { roomCode } = startTwoHumans();

    advance(TURN_MS - 1);
    expect(stateSyncs()).toHaveLength(0);

    advance(1);
    const sync = stateSyncs()[0];
    expect(sync).toBeDefined();
    expect(sync.lastActionType).toBe('ROLL_DICE');
    expect(sync.lastActorPlayerId).toBe('player-1');
    expect(sync.gameState.turnPhase).not.toBe('WAITING_FOR_ROLL');
    expect(sync.room.roomCode).toBe(roomCode);
  });

  it('is deterministic: the same seed yields the same server-rolled result', () => {
    startTwoHumans();
    advance(TURN_MS);
    const first = stateSyncs()[0].gameState.dice;

    sent = [];
    manager.shutdown();
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
    now = Date.UTC(2026, 10, 4, 12, 0, 0);
    vi.setSystemTime(now);
    manager = new RoomManager({
      repository: new RoomRepository(':memory:'),
      onBroadcastToRoom: (_roomCode, message) => {
        sent.push(message);
      },
      aiActionDelayMs: 1_000_000,
      deterministicTestSeed: 424242,
      turnTimeoutMs: TURN_MS,
      turnPostponeMs: POSTPONE_MS,
    });
    startTwoHumans();
    advance(TURN_MS);
    expect(stateSyncs()[0].gameState.dice).toEqual(first);
  });

  /**
   * Plays both humans by hand (roll, then end turn) until the game needs a decision
   * that a timer must not make on the player's behalf.
   */
  function playUntilPendingDecision(
    roomCode: string,
    initial: GameState
  ): { gameState: GameState; stateVersion: number } {
    let gameState = initial;
    for (let step = 0; step < 300; step++) {
      const active = gameState.players[gameState.activePlayerIndex];
      const session = active.id === 'player-1' ? HOST_SESSION : GUEST_SESSION;
      let intent: ClientIntentPayload;
      if (gameState.turnPhase === 'WAITING_FOR_ROLL') intent = { type: 'ROLL_DICE' };
      else if (gameState.turnPhase === 'ACTION_MENU') {
        const auction = manager.submitClientAction({
          roomCode,
          sessionPlayerId: session,
          actionId: `drive-${step}-auction`,
          intent: { type: 'START_AUCTION' },
        });
        if (auction.ok && auction.data) {
          gameState = auction.data.gameState;
          return { gameState, stateVersion: auction.data.stateVersion };
        }
        intent = { type: 'END_TURN' };
      } else break;
      const res = manager.submitClientAction({
        roomCode,
        sessionPlayerId: session,
        actionId: `drive-${step}`,
        intent,
      });
      if (!res.ok || !res.data) throw new Error(`drive step failed: ${res.messageVi}`);
      gameState = res.data.gameState;
      if (gameState.turnPhase !== 'WAITING_FOR_ROLL' && gameState.turnPhase !== 'ACTION_MENU') {
        return { gameState, stateVersion: res.data.stateVersion };
      }
    }
    throw new Error('never reached a pending decision');
  }

  it('postpones, without deciding, when the active human must answer a pending decision', () => {
    const { roomCode, state } = startTwoHumans();
    const pending = playUntilPendingDecision(roomCode, state);
    const pendingPhase = pending.gameState.turnPhase;
    expect(['WAITING_FOR_ROLL', 'ACTION_MENU']).not.toContain(pendingPhase);

    const syncsBefore = stateSyncs().length;
    advance(TURN_MS);

    expect(manager.getRoomSummary(roomCode)!.stateVersion).toBe(pending.stateVersion);
    expect(stateSyncs()).toHaveLength(syncsBefore);
    expect(deadlineOf(roomCode)).toBe(now + POSTPONE_MS);
    const update = sent.find(m => m.type === 'ROOM_UPDATED' && m.reason.includes('gia hạn'));
    expect(update).toBeDefined();
  });

  it('ends the turn for the active human when the action menu window expires', () => {
    const { roomCode } = startTwoHumans();
    let turnChanged = false;

    for (let step = 0; step < 6 && !turnChanged; step++) {
      const d = deadlineOf(roomCode);
      if (d === null || d === undefined) break;
      advance(d - now);
      const last = stateSyncs().at(-1);
      if (last && last.lastActionType === 'END_TURN') {
        turnChanged = true;
        expect(last.lastActorPlayerId).toBe('player-1');
        expect(last.gameState.players[last.gameState.activePlayerIndex].id).toBe('player-2');
      }
    }

    expect(turnChanged).toBe(true);
    expect(deadlineOf(roomCode)).toBe(now + TURN_MS);
  });

  it('runs no clock while an AI seat has the turn', () => {
    const created = manager.createRoom({ sessionPlayerId: HOST_SESSION, playerName: 'Host' });
    if (!created.ok || !created.data) throw new Error('createRoom failed');
    const roomCode = created.data.room.roomCode;
    const ai = manager.configureSeatAI({
      roomCode,
      sessionPlayerId: HOST_SESSION,
      seatIndex: 1,
      isAI: true,
    });
    expect(ai.ok).toBe(true);
    const started = manager.startMatch({ roomCode, sessionPlayerId: HOST_SESSION });
    expect(started.ok).toBe(true);

    let reachedAI = false;
    for (let step = 0; step < 8 && !reachedAI; step++) {
      const d = deadlineOf(roomCode);
      if (d === null || d === undefined) break;
      advance(d - now);
      const last = stateSyncs().at(-1);
      if (last && last.lastActionType === 'END_TURN') {
        reachedAI = last.gameState.players[last.gameState.activePlayerIndex].id === 'player-2';
      }
    }

    expect(reachedAI).toBe(true);
    expect(deadlineOf(roomCode)).toBeNull();
    const syncCount = stateSyncs().length;
    advance(TURN_MS * 3);
    expect(stateSyncs()).toHaveLength(syncCount);
  });

  it('pauses while the active human is disconnected and restarts after reconnecting in time', () => {
    const { roomCode, reconnectToken } = startTwoHumans();
    expect(deadlineOf(roomCode)).toBe(now + TURN_MS);

    manager.handleSessionDisconnected(roomCode, HOST_SESSION);
    expect(deadlineOf(roomCode)).toBeNull();

    advance(TURN_MS);
    expect(stateSyncs()).toHaveLength(0);

    advance(5_000);
    const reconnected = manager.reconnectPlayer({
      roomCode,
      playerId: 'player-1',
      reconnectToken,
      newSessionPlayerId: 'sess-host-2',
    });
    expect(reconnected.ok).toBe(true);
    expect(deadlineOf(roomCode)).toBe(now + TURN_MS);

    advance(TURN_MS - 1);
    expect(stateSyncs()).toHaveLength(0);

    advance(1);
    expect(stateSyncs()[0]?.lastActionType).toBe('ROLL_DICE');
  });
});
