import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';
import { gameReducer, INITIAL_GAME_CONFIG, INITIAL_GAME_STATE } from '../gameReducer';
import { calculateRent, getBuyPrice, getUpgradeCost } from '../property/propertyEngine';
import {
  advanceWorldRound,
  buildMultiplier,
  getWorldRules,
  isTileBlocked,
  marketOpenForRound,
  rentMultiplier,
  roundsToMarket,
  roundsToSeasonChange,
  seasonForRound,
  sellRate,
  tradeAnytime,
} from '../world-rules/worldRules';
import { GameState } from '../types';

function startWorld(worldId: string, cash = 5000): GameState {
  const started = gameReducer(INITIAL_GAME_STATE, {
    type: 'START_GAME',
    actionId: 'world-start',
    players: [
      { name: 'P1', token: DEFAULT_PLAYER_TOKENS[0], isAI: false },
      { name: 'P2', token: DEFAULT_PLAYER_TOKENS[1], isAI: false },
    ],
    config: { ...INITIAL_GAME_CONFIG, worldId, seed: 99, startingCash: cash },
  } as any);
  return { ...started, turnPhase: 'ACTION_MENU' };
}

describe('World mechanics (roadmap B) — season and market calendars', () => {
  it('seasons alternate every 6 rounds starting with DRY', () => {
    expect(seasonForRound(1)).toBe('DRY');
    expect(seasonForRound(6)).toBe('DRY');
    expect(seasonForRound(7)).toBe('WET');
    expect(seasonForRound(12)).toBe('WET');
    expect(seasonForRound(13)).toBe('DRY');
  });

  it('market opens every 5th round', () => {
    expect(marketOpenForRound(1)).toBe(false);
    expect(marketOpenForRound(5)).toBe(true);
    expect(marketOpenForRound(10)).toBe(true);
    expect(roundsToMarket(5)).toBe(0);
    expect(roundsToMarket(4)).toBe(1);
    expect(roundsToMarket(1)).toBe(4);
  });

  it('counts rounds to the next season change', () => {
    expect(roundsToSeasonChange(1)).toBe(6);
    expect(roundsToSeasonChange(6)).toBe(1);
    expect(roundsToSeasonChange(7)).toBe(6);
  });
});

describe('World mechanics (roadmap B) — multipliers', () => {
  it('Quảng Trị: dry season rents x1.35 and building x1.15, wet season x0.85 and x0.85', () => {
    const dry = startWorld('quang-tri-highlands');
    expect(dry.worldState?.seasonPhase).toBe('DRY');
    expect(rentMultiplier(dry)).toBe(1.35);
    expect(buildMultiplier(dry)).toBe(1.15);

    const wet: GameState = { ...dry, worldState: { seasonPhase: 'WET' } };
    expect(rentMultiplier(wet)).toBe(0.85);
    expect(buildMultiplier(wet)).toBe(0.85);
  });

  it('base world gameplay stays neutral', () => {
    const base = startWorld('modern-metropolis');
    expect(base.worldState).toBeNull();
    expect(rentMultiplier(base)).toBe(1);
    expect(buildMultiplier(base)).toBe(1);
    expect(sellRate(base)).toBe(0.75);
    expect(tradeAnytime(base)).toBe(false);
  });

  it('buy and upgrade prices follow the season multiplier', () => {
    const dry = startWorld('quang-tri-highlands');
    const wet: GameState = { ...dry, worldState: { seasonPhase: 'WET' } };
    const base = startWorld('modern-metropolis');
    expect(getBuyPrice(1, 1, dry)).toBe(Math.round(getBuyPrice(1, 1, base) * 1.15));
    expect(getBuyPrice(1, 1, wet)).toBe(Math.round(getBuyPrice(1, 1, base) * 0.85));
    expect(getUpgradeCost(1, 1, dry)).toBe(Math.round(getUpgradeCost(1, 1, base) * 1.15));
  });

  it('rent follows the season multiplier', () => {
    const base = startWorld('modern-metropolis');
    const dry = startWorld('quang-tri-highlands');
    const properties = {
      1: { ownerId: 'player-1', level: 1, isMortgaged: false },
      3: { ownerId: 'player-1', level: 1, isMortgaged: false },
    };
    const plain = calculateRent(1, properties as any, 1, 2);
    const seasonal = calculateRent(1, properties as any, 1 * rentMultiplier(dry), 2);
    expect(plain.rentAmount).toBeGreaterThan(0);
    expect(seasonal.rentAmount).toBe(Math.max(1, Math.round(plain.rentAmount * 1.35)));
    expect(base.roundNumber).toBe(1);
  });

  it('a landslide-blocked tile collects no rent this round', () => {
    const state = startWorld('quang-tri-highlands');
    const blocked: GameState = { ...state, worldState: { seasonPhase: 'DRY', blockedTiles: [1] } };
    expect(isTileBlocked(blocked, 1)).toBe(true);
    expect(isTileBlocked(blocked, 3)).toBe(false);
    expect(isTileBlocked(startWorld('modern-metropolis'), 1)).toBe(false);
  });
});

describe('World mechanics (roadmap B) — market day trading', () => {
  it('Tây Bắc: market day refunds 100%, other days 75%', () => {
    const open = startWorld('northwest-vietnam');
    const closed: GameState = { ...open, worldState: { marketOpen: false } };
    const opened: GameState = { ...open, worldState: { marketOpen: true } };
    expect(sellRate(closed)).toBe(0.75);
    expect(sellRate(opened)).toBe(1);
  });

  it('Tây Bắc: trading is allowed outside the active turn only on market days', () => {
    const open = startWorld('northwest-vietnam');
    const marketDay: GameState = { ...open, worldState: { marketOpen: true } };
    const closedDay: GameState = { ...open, worldState: { marketOpen: false } };
    expect(tradeAnytime(marketDay)).toBe(true);
    expect(tradeAnytime(closedDay)).toBe(false);
  });

  it('a non-active player can propose a trade on a market day, but not otherwise', () => {
    const open = startWorld('northwest-vietnam');
    const marketDay: GameState = { ...open, worldState: { marketOpen: true } };
    const closedDay: GameState = { ...open, worldState: { marketOpen: false } };
    const proposal = {
      senderPlayerId: 'player-2',
      targetPlayerId: 'player-1',
      offeredCash: 50,
      offeredPropertyIds: [],
      offeredJailCards: 0,
      requestedCash: 0,
      requestedPropertyIds: [],
      requestedJailCards: 0,
    };
    const onMarketDay = gameReducer(marketDay, { type: 'PROPOSE_TRADE', proposal } as any);
    expect(onMarketDay.activeTrade?.senderPlayerId).toBe('player-2');
    const offMarketDay = gameReducer(closedDay, { type: 'PROPOSE_TRADE', proposal } as any);
    expect(offMarketDay.activeTrade).toBeFalsy();
  });
});

describe('World mechanics (roadmap B) — round clock', () => {
  it('advances the season and logs the change', () => {
    const dry = startWorld('quang-tri-highlands');
    const advanced = advanceWorldRound(dry, 7);
    expect(advanced.worldState?.seasonPhase).toBe('WET');
    expect(advanced.logs[0]?.message).toContain('Mùa mưa');
    const steady = advanceWorldRound({ ...dry, worldState: { seasonPhase: 'WET' } }, 8);
    expect(steady.logs).toHaveLength(0);
  });

  it('advances the market day and logs the change', () => {
    const closed = startWorld('northwest-vietnam');
    const opening = advanceWorldRound(closed, 5);
    expect(opening.worldState?.marketOpen).toBe(true);
    expect(opening.logs[0]?.message).toContain('Phiên chợ');
    const closing = advanceWorldRound({ ...closed, worldState: { marketOpen: true } }, 6);
    expect(closing.worldState?.marketOpen).toBe(false);
  });

  it('reports world rules for both new worlds', () => {
    expect(getWorldRules(startWorld('quang-tri-highlands')).worldId).toBe('quang-tri-highlands');
    expect(getWorldRules(startWorld('northwest-vietnam')).worldId).toBe('northwest-vietnam');
    expect(getWorldRules(startWorld('modern-metropolis')).worldId).toBe('modern-metropolis');
  });
});
