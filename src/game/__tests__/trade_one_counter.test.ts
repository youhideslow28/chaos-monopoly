import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { getTradeResponderId } from '../trade/tradeEngine';
import { GameState } from '../types';

function createMatch(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    players: [{ name: 'An' }, { name: 'Bình' }],
    config: { startingCash: 1500, maxRounds: 0 },
  });
}

function proposeCashTrade(state: GameState): GameState {
  return gameReducer(state, {
    type: 'PROPOSE_TRADE',
    proposal: {
      senderPlayerId: 'player-1',
      targetPlayerId: 'player-2',
      offeredCash: 100,
      offeredPropertyIds: [],
      offeredJailCards: 0,
      requestedCash: 0,
      requestedPropertyIds: [],
      requestedJailCards: 0,
    },
  });
}

describe('Trade: one cash adjustment, then the proposer answers', () => {
  it('the target is the first responder', () => {
    const state = proposeCashTrade(createMatch());
    expect(state.activeTrade?.status).toBe('PENDING');
    expect(getTradeResponderId(state.activeTrade!)).toBe('player-2');
  });

  it('the target can adjust the cash amounts exactly once', () => {
    let state = proposeCashTrade(createMatch());
    state = gameReducer(state, {
      type: 'COUNTER_TRADE',
      proposal: { ...state.activeTrade!, offeredCash: 150, requestedCash: 50 },
    });

    expect(state.activeTrade?.countered).toBe(true);
    expect(state.activeTrade?.offeredCash).toBe(150);
    expect(state.activeTrade?.requestedCash).toBe(50);
    expect(getTradeResponderId(state.activeTrade!)).toBe('player-1');

    const again = gameReducer(state, {
      type: 'COUNTER_TRADE',
      proposal: { ...state.activeTrade!, offeredCash: 300, requestedCash: 0 },
    });
    expect(again).toBe(state);
  });

  it('an adjustment changes only cash, never properties or jail cards', () => {
    let state = proposeCashTrade(createMatch());
    state = gameReducer(state, {
      type: 'COUNTER_TRADE',
      proposal: {
        ...state.activeTrade!,
        offeredCash: 120,
        requestedCash: 20,
        offeredPropertyIds: [1],
        requestedJailCards: 1,
      },
    });

    expect(state.activeTrade?.offeredPropertyIds).toEqual([]);
    expect(state.activeTrade?.requestedJailCards).toBe(0);
  });

  it('a no-op or unaffordable adjustment is ignored and the target keeps the right to adjust', () => {
    const base = proposeCashTrade(createMatch());
    const unchanged = gameReducer(base, {
      type: 'COUNTER_TRADE',
      proposal: { ...base.activeTrade! },
    });
    expect(unchanged).toBe(base);

    const unaffordable = gameReducer(base, {
      type: 'COUNTER_TRADE',
      proposal: { ...base.activeTrade!, offeredCash: 999999, requestedCash: 0 },
    });
    expect(unaffordable).toBe(base);
    expect(unaffordable.activeTrade?.countered).toBeUndefined();
  });

  it('accepting after the adjustment settles the adjusted cash', () => {
    let state = proposeCashTrade(createMatch());
    state = gameReducer(state, {
      type: 'COUNTER_TRADE',
      proposal: { ...state.activeTrade!, offeredCash: 150, requestedCash: 50 },
    });
    state = gameReducer(state, { type: 'ACCEPT_TRADE', tradeId: state.activeTrade?.id });

    expect(state.activeTrade).toBeNull();
    const an = state.players.find(p => p.id === 'player-1')!;
    const binh = state.players.find(p => p.id === 'player-2')!;
    expect(an.cash).toBe(1500 - 150 + 50);
    expect(binh.cash).toBe(1500 + 150 - 50);
  });
});
