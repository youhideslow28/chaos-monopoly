/**
 * src/game/economy/economicModifiers.ts
 *
 * Centralized pure calculation pipeline for CHAOS MONOPOLY economic modifiers.
 * Connects all 10 Chaos Modifiers into rent, mortgage, salary, movement, and market actions.
 */

import {
  BoardTile,
  ChaosModifiers,
  GameState,
  TileId,
} from '../types';
import { BOARD_SIZE, BOARD_TILES } from '../board/boardData';
import {
  mortgageRate as getWorldMortgageRate,
  salaryMultiplier as getWorldSalaryMultiplier,
} from '../world-rules/worldRules';

export const START_SALARY_GROWTH_PER_ROUND = 0.015;
export const START_SALARY_GROWTH_MAX = 1.6;
export const DEFAULT_MORTGAGE_RATIO = 0.60;

export const DEFAULT_CHAOS_MODIFIERS: Readonly<ChaosModifiers> = {
  reverseDirectionTurns: 0,
  marketFrozenTurns: 0,
  goldenHourTurns: 0,
  curfewTurns: 0,
  transportBoomTurns: 0,
  utilityBoomTurns: 0,
  districtBoomTurns: 0,
  alienMothershipTurns: 0,
  interestHikeTurns: 0,
  subsidizedMortgageTurns: 0,
};

export interface EffectiveMovementResult {
  effectiveSteps: number;
  newPosition: number;
  passedStart: boolean;
  isCapped: boolean;
  isReverse: boolean;
}

export interface EffectiveEconomicReport {
  rent: {
    effectiveRent: number;
    baseRent: number;
    multipliers: {
      monopolyMultiplier: number;
      transportBoomMultiplier: number;
      utilityBoomMultiplier: number;
      districtBoomMultiplier: number;
      alienMothershipBlocked: boolean;
      globalRentModifier: number;
    };
  };
  mortgage: {
    mortgageRatio: number;
    effectiveMortgageValue: number;
    interestRate: number;
    effectiveUnmortgageCost: number;
  };
  salary: {
    baseSalary: number;
    salaryMultiplier: number;
    effectiveSalary: number;
  };
  movement: {
    isCapped: boolean;
    maxStepCap: number;
    isReverse: boolean;
  };
  market: {
    isFrozen: boolean;
  };
}

// ---------------------------------------------------------------------------
// 1. Rent Modifiers Pipeline (Modifiers 1, 2, 3, 4)
// ---------------------------------------------------------------------------

/**
 * Calculates modified rent according to active Chaos Modifiers:
 * - Alien Mothership: 0 rent on Landmark 81 (Tile 39)
 * - Transport Boom: 2x rent on transport hubs
 * - Utility Boom: 2x rent on utilities
 * - District Boom: 1.5x rent on Hanoi (district-green) and HCMC (district-darkblue)
 * - Global turn rent modifier: scaled by rentModifier
 */
export function calculateModifiedRent(
  tileId: TileId,
  rawRent: number,
  tile: BoardTile | undefined,
  modifiers?: ChaosModifiers,
  globalRentModifier: number = 1
): number {
  if (rawRent <= 0) return 0;
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;

  // 1. Alien Mothership (Modifier 4): Landmark 81 (Tile 39) blocked completely
  if (tileId === 39 && mods.alienMothershipTurns > 0) {
    return 0;
  }

  let rent = rawRent;

  // 2. Transport Boom (Modifier 1): 2x on 4 transport hubs
  if (
    (tile?.type === 'TRANSPORT' || tile?.property?.districtColor === 'district-transport') &&
    mods.transportBoomTurns > 0
  ) {
    rent *= 2;
  }

  // 3. Utility Boom (Modifier 2): 2x on EVN & SAWACO
  if (
    (tile?.type === 'UTILITY' || tile?.property?.districtColor === 'district-utility') &&
    mods.utilityBoomTurns > 0
  ) {
    rent *= 2;
  }

  // 4. District Boom (Modifier 3): 1.5x on Hanoi & HCMC
  const districtColor = tile?.property?.districtColor;
  if (
    mods.districtBoomTurns > 0 &&
    (districtColor === 'district-green' || districtColor === 'district-darkblue')
  ) {
    rent = Math.round(rent * 1.5);
  }

  // 5. Global turn rent modifier
  const finalRent = Math.round(rent * globalRentModifier);
  return Math.max(1, finalRent);
}

// ---------------------------------------------------------------------------
// 2. Start Tile Salary Pipeline (Modifier 5)
// ---------------------------------------------------------------------------

/**
 * Calculates effective salary on Start tile (passing or landing):
 * - Scales gently with round number (+1.5%/round, capped at 1.6x) to track bounded market prices.
 * - Applies world-specific subsidy (e.g., Mekong Delta +15%, Northwest +5%).
 * - Golden Hour doubles the reward (2x) when goldenHourTurns > 0.
 */
export function getRoundSalaryMultiplier(roundNumber: number = 1): number {
  const r = Number.isFinite(roundNumber) && roundNumber > 1 ? Math.floor(roundNumber) : 1;
  return Math.min(START_SALARY_GROWTH_MAX, Number((1 + START_SALARY_GROWTH_PER_ROUND * (r - 1)).toFixed(4)));
}

export function calculateSalary(
  baseSalary: number,
  modifiers?: ChaosModifiers,
  roundNumber: number = 1,
  world?: Pick<GameState, 'config' | 'worldState'> | null
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const roundMult = getRoundSalaryMultiplier(roundNumber);
  const worldMult = getWorldSalaryMultiplier(world);
  const goldenMult = mods.goldenHourTurns > 0 ? 2 : 1;
  return Math.round(baseSalary * roundMult * worldMult * goldenMult);
}

// ---------------------------------------------------------------------------
// 3. Movement Pipeline (Modifiers 6 & 7)
// ---------------------------------------------------------------------------

/**
 * Calculates effective player movement considering:
 * - Curfew (Modifier 6): caps steps to at most 4 when curfewTurns > 0
 * - Reverse Direction (Modifier 7): moves counter-clockwise when reverseDirectionTurns > 0
 * - Passed Start: true only on forward movement wrapping boardSize
 */
export function calculateEffectiveMovement(
  currentPosition: number,
  diceRollSum: number,
  modifiers?: ChaosModifiers,
  boardSize: number = BOARD_SIZE
): EffectiveMovementResult {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;

  // Curfew cap: max 4 steps
  const isCapped = mods.curfewTurns > 0 && diceRollSum > 4;
  const steps = mods.curfewTurns > 0 ? Math.min(diceRollSum, 4) : diceRollSum;

  const isReverse = mods.reverseDirectionTurns > 0;

  if (isReverse) {
    // Moving counter-clockwise: (currentPos - steps) % boardSize with positive wrapping
    const newPosition = ((currentPosition - steps) % boardSize + boardSize) % boardSize;
    // Moving backwards does NOT grant passing start salary
    const passedStart = false;
    return {
      effectiveSteps: steps,
      newPosition,
      passedStart,
      isCapped,
      isReverse: true,
    };
  }

  // Standard forward movement
  const rawTarget = currentPosition + steps;
  const passedStart = rawTarget >= boardSize;
  const newPosition = rawTarget % boardSize;

  return {
    effectiveSteps: steps,
    newPosition,
    passedStart,
    isCapped,
    isReverse: false,
  };
}

// ---------------------------------------------------------------------------
// 4. Mortgage & Unmortgage Pipeline (Modifiers 8 & 9)
// ---------------------------------------------------------------------------

/**
 * Calculates effective mortgage payout (Modifier 9):
 * - Standard: 60% of current market land price
 * - Subsidized Mortgage: 75% of current market land price when subsidizedMortgageTurns > 0
 */
export function calculateEffectiveMortgageValue(
  marketOrBasePrice: number,
  modifiers?: ChaosModifiers,
  standardRate: number = DEFAULT_MORTGAGE_RATIO
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const ratio = mods.subsidizedMortgageTurns > 0 ? Math.max(0.75, standardRate) : standardRate;
  return Math.floor(marketOrBasePrice * ratio);
}

/**
 * Calculates unmortgage cost to lift the mortgage (Modifier 8):
 * - Standard fee: +10% interest (mortgageValue * 1.10)
 * - Interest Hike: +20% interest (mortgageValue * 1.20) when interestHikeTurns > 0
 */
export function calculateEffectiveUnmortgageCost(
  marketOrBasePrice: number,
  modifiers?: ChaosModifiers,
  customMortgageValue?: number,
  standardRate: number = DEFAULT_MORTGAGE_RATIO
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const mortgageVal = customMortgageValue ?? Math.floor(marketOrBasePrice * standardRate);
  const interestRatio = mods.interestHikeTurns > 0 ? 1.20 : 1.10;
  return Math.floor(mortgageVal * interestRatio);
}

// ---------------------------------------------------------------------------
// 5. Market Freeze Pipeline (Modifier 10)
// ---------------------------------------------------------------------------

/**
 * Checks whether property buying and building upgrades are blocked (Modifier 10):
 * Market is frozen when marketFrozenTurns > 0.
 */
export function isMarketFrozen(modifiers?: ChaosModifiers): boolean {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  return mods.marketFrozenTurns > 0;
}

// ---------------------------------------------------------------------------
// 6. Comprehensive Diagnostic Reporter (UI & Modals)
// ---------------------------------------------------------------------------

export function getEffectiveEconomicReport(
  tileId: TileId,
  state: GameState,
  diceSum: number = 7
): EffectiveEconomicReport {
  const tile = BOARD_TILES.find(t => t.id === tileId);
  const mods = state.chaosModifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const basePrice = tile?.property?.basePrice ?? 0;
  const rawRent = tile?.property?.baseRent ?? 0;

  const effectiveRent = calculateModifiedRent(tileId, rawRent, tile, mods, state.rentModifier);
  const baseMortgageRate = getWorldMortgageRate(state);
  const effectiveMortgageValue = calculateEffectiveMortgageValue(basePrice, mods, baseMortgageRate);
  const effectiveUnmortgageCost = calculateEffectiveUnmortgageCost(basePrice, mods, undefined, baseMortgageRate);
  const effectiveSalary = calculateSalary(state.config.salaryOnStart, mods, state.roundNumber, state);

  return {
    rent: {
      effectiveRent,
      baseRent: rawRent,
      multipliers: {
        monopolyMultiplier: 1,
        transportBoomMultiplier: mods.transportBoomTurns > 0 ? 2 : 1,
        utilityBoomMultiplier: mods.utilityBoomTurns > 0 ? 2 : 1,
        districtBoomMultiplier: mods.districtBoomTurns > 0 ? 1.5 : 1,
        alienMothershipBlocked: tileId === 39 && mods.alienMothershipTurns > 0,
        globalRentModifier: state.rentModifier || 1,
      },
    },
    mortgage: {
      mortgageRatio: mods.subsidizedMortgageTurns > 0 ? Math.max(0.75, baseMortgageRate) : baseMortgageRate,
      effectiveMortgageValue,
      interestRate: mods.interestHikeTurns > 0 ? 0.20 : 0.10,
      effectiveUnmortgageCost,
    },
    salary: {
      baseSalary: state.config.salaryOnStart,
      salaryMultiplier: Number((getRoundSalaryMultiplier(state.roundNumber) * getWorldSalaryMultiplier(state) * (mods.goldenHourTurns > 0 ? 2 : 1)).toFixed(4)),
      effectiveSalary,
    },
    movement: {
      isCapped: mods.curfewTurns > 0 && diceSum > 4,
      maxStepCap: mods.curfewTurns > 0 ? 4 : 12,
      isReverse: mods.reverseDirectionTurns > 0,
    },
    market: {
      isFrozen: mods.marketFrozenTurns > 0,
    },
  };
}
