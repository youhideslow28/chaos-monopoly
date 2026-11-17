import { GameState, SeasonPhase, TileId, WorldState } from '../types';

/**
 * World-native mechanics (roadmap B).
 *
 * This module is the only place where world data reaches the rules. It reads a small
 * `worldState` slice and returns multipliers / flags. Every other world passes
 * `null` and gets neutral values, so base gameplay is unchanged.
 */

export const SEASON_CYCLE = 6;
export const MARKET_CYCLE = 5;
export const LANDSLIDE_COOLDOWN = 6;

export const DRY_RENT_MULTIPLIER = 1.35;
export const DRY_BUILD_MULTIPLIER = 1.15;
/**
 * Average seasonal multiplier across Dry (1.35) and Wet (0.85) is 1.10, keeping
 * long-run Quảng Trị income inside the ±10% balance band vs Modern Metropolis.
 */
export const WET_RENT_MULTIPLIER = 0.85;
export const WET_BUILD_MULTIPLIER = 0.85;

export const MARKET_SELL_RATE_OPEN = 1;
export const MARKET_SELL_RATE_CLOSED = 0.75;

export interface WorldEconomicProfile {
  inflationRatePerRound: number;
  maxRoundMultiplier: number;
  salaryMultiplier: number;
  baseLandMultiplier: number;
  baseBuildMultiplier: number;
  baseRentMultiplier: number;
  sellRate: number;
  mortgageRate: number;
  highTierRentThreshold?: number;
  highTierRentMultiplier?: number;
  transportRentMultiplier?: number;
}

const DEFAULT_WORLD_ECONOMIC_PROFILE: WorldEconomicProfile = {
  inflationRatePerRound: 0.025,
  maxRoundMultiplier: 2.4,
  salaryMultiplier: 1.0,
  baseLandMultiplier: 1.0,
  baseBuildMultiplier: 1.0,
  baseRentMultiplier: 1.0,
  sellRate: 0.75,
  mortgageRate: 0.60,
};

export const WORLD_ECONOMIC_PROFILES: Record<string, WorldEconomicProfile> = {
  'modern-metropolis': {
    ...DEFAULT_WORLD_ECONOMIC_PROFILE,
  },
  'cyberpunk-city': {
    inflationRatePerRound: 0.035,
    maxRoundMultiplier: 2.5,
    salaryMultiplier: 1.0,
    baseLandMultiplier: 1.0,
    baseBuildMultiplier: 1.0,
    baseRentMultiplier: 1.0,
    sellRate: 0.80,
    mortgageRate: 0.60,
    highTierRentThreshold: 3,
    highTierRentMultiplier: 1.15,
  },
  'mekong-delta': {
    inflationRatePerRound: 0.015,
    maxRoundMultiplier: 2.1,
    salaryMultiplier: 1.15,
    baseLandMultiplier: 0.90,
    baseBuildMultiplier: 0.95,
    baseRentMultiplier: 0.95,
    sellRate: 0.75,
    mortgageRate: 0.60,
  },
  'quang-tri-highlands': {
    inflationRatePerRound: 0.025,
    maxRoundMultiplier: 2.4,
    salaryMultiplier: 1.0,
    baseLandMultiplier: 1.0,
    baseBuildMultiplier: 1.0,
    baseRentMultiplier: 1.0,
    sellRate: 0.75,
    mortgageRate: 0.60,
  },
  'northwest-vietnam': {
    inflationRatePerRound: 0.02,
    maxRoundMultiplier: 2.2,
    salaryMultiplier: 1.05,
    baseLandMultiplier: 1.0,
    baseBuildMultiplier: 1.0,
    baseRentMultiplier: 1.0,
    sellRate: MARKET_SELL_RATE_CLOSED,
    mortgageRate: 0.60,
  },
  'space-colony': {
    inflationRatePerRound: 0.015,
    maxRoundMultiplier: 2.2,
    salaryMultiplier: 1.0,
    baseLandMultiplier: 1.0,
    baseBuildMultiplier: 1.15,
    baseRentMultiplier: 1.0,
    sellRate: 0.80,
    mortgageRate: 0.60,
    highTierRentThreshold: 4,
    highTierRentMultiplier: 1.20,
    transportRentMultiplier: 1.20,
  },
};

export function getWorldEconomicProfile(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): WorldEconomicProfile {
  const worldId = state?.config?.worldId ?? '';
  return WORLD_ECONOMIC_PROFILES[worldId] ?? DEFAULT_WORLD_ECONOMIC_PROFILE;
}

export interface WorldRulesState {
  worldId: string;
  seasonPhase?: SeasonPhase;
  marketOpen?: boolean;
  blockedTiles?: TileId[];
}

export const NEUTRAL_RULES: WorldRulesState = { worldId: '' };

export function getWorldRules(state: Pick<GameState, 'config' | 'worldState'> | null | undefined): WorldRulesState {
  const worldId = state?.config?.worldId ?? '';
  const ws: WorldState | undefined = state?.worldState ?? undefined;
  return {
    worldId,
    seasonPhase: ws?.seasonPhase,
    marketOpen: ws?.marketOpen,
    blockedTiles: ws?.blockedTiles,
  };
}

/** Quảng Trị season for a round number (round 1 = DRY). */
export function seasonForRound(roundNumber: number): SeasonPhase {
  const r = Math.max(1, Math.floor(roundNumber || 1));
  return Math.floor((r - 1) / SEASON_CYCLE) % 2 === 0 ? 'DRY' : 'WET';
}

/** Tây Bắc market is open every 5th round. */
export function marketOpenForRound(roundNumber: number): boolean {
  return Math.max(1, Math.floor(roundNumber || 1)) % MARKET_CYCLE === 0;
}

/** Distance to the next season change (rounds), for the HUD. */
export function roundsToSeasonChange(roundNumber: number): number {
  const r = Math.max(1, Math.floor(roundNumber || 1));
  return SEASON_CYCLE - ((r - 1) % SEASON_CYCLE);
}

/** Distance to the next market day (rounds), for the HUD. */
export function roundsToMarket(roundNumber: number): number {
  const r = Math.max(1, Math.floor(roundNumber || 1));
  const mod = r % MARKET_CYCLE;
  return mod === 0 ? 0 : MARKET_CYCLE - mod;
}

export function inflationRatePerRound(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  return getWorldEconomicProfile(state).inflationRatePerRound;
}

export function maxRoundMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  return getWorldEconomicProfile(state).maxRoundMultiplier;
}

export function salaryMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  return getWorldEconomicProfile(state).salaryMultiplier;
}

/** Permanent land price multiplier (unaffected by temporary seasonal dips). */
export function landMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  return getWorldEconomicProfile(state).baseLandMultiplier;
}

export function mortgageRate(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  return getWorldEconomicProfile(state).mortgageRate;
}

export function rentMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined,
  tileLevel: number = 0,
  tileType?: string
): number {
  const rules = getWorldRules(state);
  const profile = getWorldEconomicProfile(state);
  let mult = profile.baseRentMultiplier;

  if (rules.worldId === 'quang-tri-highlands' && rules.seasonPhase) {
    mult *= rules.seasonPhase === 'DRY' ? DRY_RENT_MULTIPLIER : WET_RENT_MULTIPLIER;
  }

  if (
    profile.highTierRentThreshold !== undefined &&
    profile.highTierRentMultiplier !== undefined &&
    tileLevel >= profile.highTierRentThreshold
  ) {
    mult *= profile.highTierRentMultiplier;
  } else if (profile.transportRentMultiplier !== undefined && tileType === 'TRANSPORT') {
    mult *= profile.transportRentMultiplier;
  }

  return Number(mult.toFixed(4));
}

export function buyMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  const rules = getWorldRules(state);
  let mult = getWorldEconomicProfile(state).baseLandMultiplier;
  if (rules.worldId === 'quang-tri-highlands' && rules.seasonPhase) {
    mult *= rules.seasonPhase === 'DRY' ? DRY_BUILD_MULTIPLIER : WET_BUILD_MULTIPLIER;
  }
  return Number(mult.toFixed(4));
}

export function buildMultiplier(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined
): number {
  const rules = getWorldRules(state);
  let mult = getWorldEconomicProfile(state).baseBuildMultiplier;
  if (rules.worldId === 'quang-tri-highlands' && rules.seasonPhase) {
    mult *= rules.seasonPhase === 'DRY' ? DRY_BUILD_MULTIPLIER : WET_BUILD_MULTIPLIER;
  }
  return Number(mult.toFixed(4));
}

/**
 * Resale/demolition refund rate:
 * - Standard / Quảng Trị / Mekong: 75%
 * - Cyberpunk City / Space Colony: 80%
 * - Tây Bắc: 100% on Market Day (every 5th round), 75% otherwise
 */
export function sellRate(state: Pick<GameState, 'config' | 'worldState'> | null | undefined): number {
  const rules = getWorldRules(state);
  if (rules.worldId === 'northwest-vietnam') {
    return rules.marketOpen ? MARKET_SELL_RATE_OPEN : MARKET_SELL_RATE_CLOSED;
  }
  return getWorldEconomicProfile(state).sellRate;
}

/** Bank vacant-land buyback rate (synchronized with world sellRate). */
export function landSellRate(state: Pick<GameState, 'config' | 'worldState'> | null | undefined): number {
  return sellRate(state);
}

/** Tây Bắc: trading is allowed outside the active player's turn on market days. */
export function tradeAnytime(state: Pick<GameState, 'config' | 'worldState'> | null | undefined): boolean {
  const rules = getWorldRules(state);
  return rules.worldId === 'northwest-vietnam' && rules.marketOpen === true;
}

/** Quảng Trị: tiles closed by a landslide collect no rent this round. */
export function isTileBlocked(
  state: Pick<GameState, 'config' | 'worldState'> | null | undefined,
  tileId: number
): boolean {
  const rules = getWorldRules(state);
  if (rules.worldId !== 'quang-tri-highlands') return false;
  return (rules.blockedTiles ?? []).includes(tileId);
}

export interface RoundWorldAdvance {
  worldState: WorldState | null;
  logs: Array<{ message: string; type: 'INFO' | 'WARNING' }>;
}

/**
 * Advances the world clock whenever a round completes. Pure: callers splice the
 * returned logs into the state log list.
 */
export function advanceWorldRound(previous: GameState | null, nextRound: number): RoundWorldAdvance {
  const worldId = previous?.config?.worldId ?? '';
  if (worldId === 'quang-tri-highlands') {
    const season = seasonForRound(nextRound);
    const changed = (previous?.worldState?.seasonPhase ?? null) !== season;
    const logs: RoundWorldAdvance['logs'] = [];
    if (changed) {
      logs.push({
        message:
          season === 'DRY'
            ? 'Mùa khô bắt đầu tại Cao Nguyên Quảng Trị: tiền thuê x1,35, chi phí mua & xây x1,15.'
            : 'Mùa mưa bắt đầu tại Cao Nguyên Quảng Trị: tiền thuê x0,85, chi phí mua & xây x0,85 (giá thế chấp giữ nguyên).',
        type: 'INFO',
      });
    }
    return { worldState: { seasonPhase: season, blockedTiles: previous?.worldState?.blockedTiles ?? [] }, logs };
  }
  if (worldId === 'northwest-vietnam') {
    const open = marketOpenForRound(nextRound);
    const changed = (previous?.worldState?.marketOpen ?? null) !== open;
    const logs: RoundWorldAdvance['logs'] = [];
    if (changed) {
      logs.push({
        message: open
          ? 'Phiên chợ vùng cao mở: giao dịch tự do mọi lượt, hoàn tiền bán đất/công trình 100% giá thị trường!'
          : 'Phiên chợ vùng cao kết thúc: giao dịch theo lượt như thường, hoàn tiền bán đất/công trình 75%.',
        type: 'INFO',
      });
    }
    return { worldState: { marketOpen: open }, logs };
  }
  return { worldState: null, logs: [] };
}
