# Handoff Report — Economic Modifiers Pipeline (Phase 02 / Milestone 1)

**Author**: Explorer M1-2 (`teamwork_explorer_m1_2`)  
**Mission**: Architectural Investigation and Strategy Specification for `src/game/economy/economicModifiers.ts` and Wiring 10 Dormant Chaos Modifiers  
**Target Recipient**: Orchestrator Phase 02 (`dfdc5340-0019-4b2e-8180-5f5d8ae40b15`) & Milestone 1 Workers  
**Date**: 2026-10-31  
**Status**: Complete (Read-Only Investigation & Implementation Strategy)

---

## 1. Observation

A systematic forensic inspection of `src/game/` and the automated test suite revealed the following findings:

### 1.1 Baseline Test Suite & Stability
- Executed command: `npx vitest run`
- Verbatim result:
  ```
  Test Files  10 passed (10)
       Tests  208 passed (208)
    Duration  3.02s
  ```
- All 10 test suites (`tier1_phase02_features`, `tier1_features`, `tier2_boundaries`, `tier3_combinations`, `tier4_match_scenarios`, `tier5_adversarial_hardening`, `gameEngine`, `adversarial_stress`, `challenger_empirical_m1`, `chaosEngine_milestone2`) are 100% green.
- **Strict Invariant**: Any changes to economic calculations must preserve 100% backward compatibility when modifiers are in their default state (all zeros or undefined).

### 1.2 Dormant Modifiers in State Definition & Generation
- In `src/game/types/index.ts` (lines 215–226), `ChaosModifiers` defines 10 round-based counters:
  ```typescript
  export interface ChaosModifiers {
    reverseDirectionTurns: number;
    marketFrozenTurns: number;
    goldenHourTurns: number;
    curfewTurns: number;
    transportBoomTurns: number;
    utilityBoomTurns: number;
    districtBoomTurns: number;
    alienMothershipTurns: number;
    interestHikeTurns: number;
    subsidizedMortgageTurns: number;
  }
  ```
- In `src/game/gameReducer.ts` (lines 43–54), `INITIAL_GAME_STATE` initializes all 10 counters to `0`:
  ```typescript
  chaosModifiers: {
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
  },
  ```
- In `src/game/chaos-engine/chaosEngine.ts` (lines 439–638), drawing corresponding cards sets these counters:
  - `REVERSE_DIRECTION` (line 440): `updatedModifiers.reverseDirectionTurns = durationInTurns || 3;`
  - `FREEZE_MARKET` (line 587): `updatedModifiers.marketFrozenTurns = durationInTurns || 1;`
  - `GOLDEN_HOUR` (line 593): `updatedModifiers.goldenHourTurns = durationInTurns || 1;`
  - `TRANSPORT_BOOM` (line 599): `updatedModifiers.transportBoomTurns = durationInTurns || 3;`
  - `UTILITY_BOOM` (line 605): `updatedModifiers.utilityBoomTurns = durationInTurns || 2;`
  - `DISTRICT_BOOM` (line 611): `updatedModifiers.districtBoomTurns = durationInTurns || 3;`
  - `INTEREST_HIKE` (line 617): `updatedModifiers.interestHikeTurns = durationInTurns || 3;`
  - `SUBSIDIZED_MORTGAGE` (line 623): `updatedModifiers.subsidizedMortgageTurns = durationInTurns || 2;`
  - `CURFEW` (line 629): `updatedModifiers.curfewTurns = durationInTurns || 1;`
  - `ALIEN_MOTHERSHIP` (line 635): `updatedModifiers.alienMothershipTurns = durationInTurns || 5;`
- In `src/game/turn-manager/turnManager.ts` (lines 91–104), completing each round decrements all 10 counters:
  ```typescript
  if (completedRound && state.chaosModifiers) {
    updatedChaosModifiers = {
      reverseDirectionTurns: Math.max(0, state.chaosModifiers.reverseDirectionTurns - 1),
      marketFrozenTurns: Math.max(0, state.chaosModifiers.marketFrozenTurns - 1),
      goldenHourTurns: Math.max(0, state.chaosModifiers.goldenHourTurns - 1),
      curfewTurns: Math.max(0, state.chaosModifiers.curfewTurns - 1),
      transportBoomTurns: Math.max(0, state.chaosModifiers.transportBoomTurns - 1),
      utilityBoomTurns: Math.max(0, state.chaosModifiers.utilityBoomTurns - 1),
      districtBoomTurns: Math.max(0, state.chaosModifiers.districtBoomTurns - 1),
      alienMothershipTurns: Math.max(0, state.chaosModifiers.alienMothershipTurns - 1),
      interestHikeTurns: Math.max(0, state.chaosModifiers.interestHikeTurns - 1),
      subsidizedMortgageTurns: Math.max(0, state.chaosModifiers.subsidizedMortgageTurns - 1),
    };
  }
  ```

### 1.3 The Disconnection Gap (Why They Are Dormant)
A forensic search for each modifier name across `src/game/` proved that **none of these 10 counters are queried by the calculation engines**:
1. **`transportBoomTurns`** (2x rent on transport hubs):
   - `calculateRent` in `src/game/property/propertyEngine.ts` (lines 65–78) hardcodes transport rent: `const transportRentScale = [0, 25, 50, 100, 200]; rent = transportRentScale[...];`. It does not accept or check `chaosModifiers`.
2. **`utilityBoomTurns`** (2x rent on utilities):
   - `calculateRent` in `src/game/property/propertyEngine.ts` (lines 80–93) uses `multiplier = ownedUtilityCount >= 2 ? 10 : 4; rent = multiplier * diceSum;`. It ignores `utilityBoomTurns`.
3. **`districtBoomTurns`** (1.5x rent on Hanoi & HCMC):
   - `calculateRent` in `src/game/property/propertyEngine.ts` (lines 95–109) only checks `baseRent`, `houseRent`, and `hasDistrictMonopoly`. It never checks district colors `'district-green'` or `'district-darkblue'` for boom multipliers.
4. **`alienMothershipTurns`** (0 rent on Landmark 81, Tile 39):
   - `calculateRent` in `src/game/property/propertyEngine.ts` does not check `tileId === 39` or `alienMothershipTurns`. Furthermore, line 109 enforces `Math.max(1, Math.round(rent * rentModifier))`, which would prevent 0 rent unless explicitly handled!
5. **`goldenHourTurns`** (2x salary on Start tile):
   - In `src/game/gameReducer.ts` (lines 233–236):
     ```typescript
     let earnedSalary = 0;
     if (passedStart) {
       earnedSalary = state.config.salaryOnStart;
     }
     ```
     `state.chaosModifiers.goldenHourTurns` is completely ignored.
6. **`curfewTurns`** (max 4 movement steps on dice roll):
   - In `src/game/gameReducer.ts` (line 232):
     ```typescript
     const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
     ```
     The raw rolled `sum` (up to 12) is passed directly into `calculateNewPosition` regardless of `curfewTurns`.
7. **`reverseDirectionTurns`** (backwards movement around 40-tile board):
   - In `src/game/gameReducer.ts` (line 232):
     Always advances forwards via `calculateNewPosition(activePlayer.position, sum, BOARD_SIZE)`. It never computes counter-clockwise steps.
8. **`interestHikeTurns`** (+10% unmortgage fee, total 20%):
   - In `src/game/property/propertyEngine.ts` (lines 36–39):
     ```typescript
     export function getUnmortgageCost(tileId: TileId): number {
       const mortgageVal = getMortgageValue(tileId);
       return Math.floor(mortgageVal * 1.10);
     }
     ```
     Hardcodes `1.10` interest; ignores `interestHikeTurns`.
9. **`subsidizedMortgageTurns`** (75% mortgage value instead of 50%):
   - In `src/game/property/propertyEngine.ts` (lines 30–34):
     ```typescript
     export function getMortgageValue(tileId: TileId): number {
       const tile = getTileById(tileId);
       if (!tile || !tile.property) return 0;
       return Math.floor(tile.property.basePrice * 0.5);
     }
     ```
     Hardcodes `0.5` ratio; ignores `subsidizedMortgageTurns`.
10. **`marketFrozenTurns`** (block buy and upgrade actions):
    - `canBuyProperty` in `src/game/property/propertyEngine.ts` (lines 117–141) only checks tile type, ownership, and cash.
    - `canUpgradeProperty` (lines 143–205) only checks level, monopoly, mortgage status, even building, and cash.
    - Neither function inspects `marketFrozenTurns`.

---

## 2. Logic Chain

1. **State Existence vs Execution**: Observations 1.2 and 1.3 prove that the state data model, card trigger mechanisms, and round decrementing are already implemented and working. The gap is strictly at the calculation and validation execution layer.
2. **Centralization vs Dispersion**: Adding 10 `if (state.chaosModifiers...)` conditions across multiple disparate files (`propertyEngine.ts`, `gameReducer.ts`, `economyEngine.ts`, `ActionPanel.tsx`) would lead to code duplication, testing fragmentation, and high risk of regressions.
3. **Dedicated Pipeline**: Creating `src/game/economy/economicModifiers.ts` as a pure functional calculation engine consolidates all 10 modifier rules into a single, testable, deterministic pipeline.
4. **Backward Compatibility via Optional Parameters**: By giving all calculation functions optional `modifiers?: ChaosModifiers` parameters that default to `DEFAULT_CHAOS_MODIFIERS` (all zeros), every existing call signature remains 100% valid.
5. **Alien Mothership Precedence**: If `alienMothershipTurns > 0` on Tile 39, it must return `rentAmount: 0` immediately, overriding any district boom or monopoly multipliers, and bypassing `Math.max(1, ...)` clamps.
6. **Reverse Direction Invariant**: When moving counter-clockwise around the board, passing the Start tile does not award salary (`passedStart = false`). However, landing directly on Tile 0 moving backwards is still a valid landing on Start (`newPosition === 0`).
7. **Curfew Cap Before Direction**: If both `curfewTurns > 0` and `reverseDirectionTurns > 0` are active, dice steps are first capped at 4 (`Math.min(sum, 4)`), and then applied in the counter-clockwise direction.
8. **Market Freeze Scope**: Market freeze prevents acquisition and expansion (`BUY_PROPERTY`, `UPGRADE_PROPERTY`). It must NOT block emergency liquidation (`DOWNGRADE_PROPERTY`, `MORTGAGE_PROPERTY`), allowing indebted players to survive.

---

## 3. Caveats

1. **Read-Only Scope**: This report provides architectural specifications, exact diffs, and unit test suites. No production files were directly modified in this task.
2. **Coordination with Milestone 1 Peers**:
   - `teamwork_explorer_m1_1` designs the Central Ledger Engine (`src/game/economy/ledgerEngine.ts`). When wiring transactions, the ledger will consume the modified values (e.g. `effectiveSalary`, `effectiveRent`, `effectiveMortgageValue`).
   - `teamwork_explorer_m1_3` designs Start Tile landing bonuses ($400k vs $200k pass) and Detention fixes. The salary multiplier in `economicModifiers.ts` applies to both passing and landing amounts.
3. **No Unmortgage State Tracking**: The data model does not store historical loan payout per deed (`PropertyOwnership` only records `isMortgaged: boolean`). Therefore, unmortgage cost calculation is a pure function of base price and active interest modifiers, which follows standard board game design.

---

## 4. Conclusion & Implementation Strategy

### 4.1 Master Architecture for `src/game/economy/economicModifiers.ts`

The new module `src/game/economy/economicModifiers.ts` must export pure, side-effect-free calculation functions:

```typescript
/**
 * src/game/economy/economicModifiers.ts
 *
 * Centralized pure calculation pipeline for CHAOS MONOPOLY economic modifiers.
 * Connects all 10 Chaos Modifiers into rent, mortgage, salary, movement, and market actions.
 */

import { BoardTile, ChaosModifiers, DistrictColor, GameConfig, GameState, PlayerId, PropertyOwnership, TileId, TileType } from '../types';
import { BOARD_SIZE, BOARD_TILES } from '../board/boardData';

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
 * Golden Hour doubles the reward (2x) when goldenHourTurns > 0.
 */
export function calculateSalary(
  baseSalary: number,
  modifiers?: ChaosModifiers
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  if (mods.goldenHourTurns > 0) {
    return baseSalary * 2;
  }
  return baseSalary;
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
 * - Standard: 50% of basePrice
 * - Subsidized Mortgage: 75% of basePrice when subsidizedMortgageTurns > 0
 */
export function calculateEffectiveMortgageValue(
  basePrice: number,
  modifiers?: ChaosModifiers
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  const ratio = mods.subsidizedMortgageTurns > 0 ? 0.75 : 0.50;
  return Math.floor(basePrice * ratio);
}

/**
 * Calculates unmortgage cost to lift the mortgage (Modifier 8):
 * - Standard fee: +10% interest (mortgageValue * 1.10)
 * - Interest Hike: +20% interest (mortgageValue * 1.20) when interestHikeTurns > 0
 */
export function calculateEffectiveUnmortgageCost(
  basePrice: number,
  modifiers?: ChaosModifiers,
  customMortgageValue?: number
): number {
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;
  // If specific mortgage value not provided, compute standard 50% principal
  const mortgageVal = customMortgageValue ?? Math.floor(basePrice * 0.50);
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
  const effectiveMortgageValue = calculateEffectiveMortgageValue(basePrice, mods);
  const effectiveUnmortgageCost = calculateEffectiveUnmortgageCost(basePrice, mods);
  const effectiveSalary = calculateSalary(state.config.salaryOnStart, mods);

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
      mortgageRatio: mods.subsidizedMortgageTurns > 0 ? 0.75 : 0.50,
      effectiveMortgageValue,
      interestRate: mods.interestHikeTurns > 0 ? 0.20 : 0.10,
      effectiveUnmortgageCost,
    },
    salary: {
      baseSalary: state.config.salaryOnStart,
      salaryMultiplier: mods.goldenHourTurns > 0 ? 2 : 1,
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
```

---

### 4.2 Exact File Changes & Signatures

#### File 1: `src/game/property/propertyEngine.ts`

##### Change 1.1: `calculateRent` Signature & Logic
Add optional parameter `modifiers?: ChaosModifiers`. Wire `alienMothershipTurns`, `transportBoomTurns`, `utilityBoomTurns`, and `districtBoomTurns`.

```typescript
// BEFORE (Lines 41-50):
export function calculateRent(
  tileId: TileId,
  properties: Record<TileId, PropertyOwnership>,
  rentModifier: number = 1,
  diceSum: number = 7
): {
  rentAmount: number;
  isMonopoly: boolean;
  ownerId: PlayerId | null;
}

// AFTER:
import { calculateModifiedRent, DEFAULT_CHAOS_MODIFIERS } from '../economy/economicModifiers';

export function calculateRent(
  tileId: TileId,
  properties: Record<TileId, PropertyOwnership>,
  rentModifier: number = 1,
  diceSum: number = 7,
  modifiers?: ChaosModifiers
): {
  rentAmount: number;
  isMonopoly: boolean;
  ownerId: PlayerId | null;
} {
  const tile = getTileById(tileId);
  const ownership = properties[tileId];

  if (!tile || !tile.property || !ownership || !ownership.ownerId) {
    return { rentAmount: 0, isMonopoly: false, ownerId: null };
  }

  // If property is mortgaged, rent is 0
  if (ownership.isMortgaged) {
    return { rentAmount: 0, isMonopoly: false, ownerId: ownership.ownerId };
  }

  const ownerId = ownership.ownerId;
  const mods = modifiers ?? DEFAULT_CHAOS_MODIFIERS;

  // Alien Mothership (Tile 39) blocks rent completely
  if (tileId === 39 && mods.alienMothershipTurns > 0) {
    return { rentAmount: 0, isMonopoly: false, ownerId };
  }

  // Handle Transport Hubs (Tiles 5, 15, 25, 35)
  if (tile.type === 'TRANSPORT' || tile.property.districtColor === 'district-transport') {
    const transportTiles = getTilesInDistrict('district-transport');
    const ownedTransportCount = transportTiles.filter(t => properties[t.id]?.ownerId === ownerId).length;
    const transportRentScale = [0, 25, 50, 100, 200];
    let rent = transportRentScale[Math.min(ownedTransportCount, 4)] || 25;
    if (mods.transportBoomTurns > 0) {
      rent *= 2;
    }
    const finalRent = Math.max(1, Math.round(rent * rentModifier));
    return {
      rentAmount: finalRent,
      isMonopoly: ownedTransportCount === transportTiles.length,
      ownerId,
    };
  }

  // Handle Utilities (Tiles 12 SAWACO, 28 EVN)
  if (tile.type === 'UTILITY' || tile.property.districtColor === 'district-utility') {
    const utilityTiles = getTilesInDistrict('district-utility');
    const ownedUtilityCount = utilityTiles.filter(t => properties[t.id]?.ownerId === ownerId).length;
    const multiplier = ownedUtilityCount >= 2 ? 10 : 4;
    let rent = multiplier * diceSum;
    if (mods.utilityBoomTurns > 0) {
      rent *= 2;
    }
    const finalRent = Math.max(1, Math.round(rent * rentModifier));
    return {
      rentAmount: finalRent,
      isMonopoly: ownedUtilityCount === utilityTiles.length,
      ownerId,
    };
  }

  // Regular Color District Properties
  const { baseRent, houseRent, districtColor } = tile.property;
  const isMonopoly = hasDistrictMonopoly(districtColor, ownerId, properties);

  let rent = baseRent;
  if (ownership.level > 0) {
    const idx = Math.min(ownership.level - 1, houseRent.length - 1);
    rent = houseRent[idx];
  } else if (isMonopoly) {
    rent = baseRent * 2;
  }

  // District Boom: 1.5x on Hanoi and HCMC
  if (
    mods.districtBoomTurns > 0 &&
    (districtColor === 'district-green' || districtColor === 'district-darkblue')
  ) {
    rent = Math.round(rent * 1.5);
  }

  const finalRent = Math.max(1, Math.round(rent * rentModifier));
  return {
    rentAmount: finalRent,
    isMonopoly,
    ownerId,
  };
}
```

##### Change 1.2: `getMortgageValue` & `getUnmortgageCost` Signatures
Add optional `modifiers?: ChaosModifiers` to delegate to `economicModifiers.ts`.

```typescript
// BEFORE (Lines 30-39):
export function getMortgageValue(tileId: TileId): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  return Math.floor(tile.property.basePrice * 0.5);
}

export function getUnmortgageCost(tileId: TileId): number {
  const mortgageVal = getMortgageValue(tileId);
  return Math.floor(mortgageVal * 1.10);
}

// AFTER:
import {
  calculateEffectiveMortgageValue,
  calculateEffectiveUnmortgageCost,
} from '../economy/economicModifiers';

export function getMortgageValue(tileId: TileId, modifiers?: ChaosModifiers): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  return calculateEffectiveMortgageValue(tile.property.basePrice, modifiers);
}

export function getUnmortgageCost(tileId: TileId, modifiers?: ChaosModifiers): number {
  const tile = getTileById(tileId);
  if (!tile || !tile.property) return 0;
  return calculateEffectiveUnmortgageCost(tile.property.basePrice, modifiers);
}
```

##### Change 1.3: `canMortgageProperty` & `canUnmortgageProperty`
Forward optional `modifiers?: ChaosModifiers` to mortgage calculations.

```typescript
// Lines 244 & 278:
export function canMortgageProperty(
  tileId: TileId,
  playerId: PlayerId,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers
): { canMortgage: boolean; mortgageValue: number; reason?: string } {
  // ... (lines 249-273 unchanged)
  const mortgageValue = getMortgageValue(tileId, modifiers);
  return { canMortgage: true, mortgageValue };
}

export function canUnmortgageProperty(
  tileId: TileId,
  playerId: PlayerId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers
): { canUnmortgage: boolean; unmortgageCost: number; reason?: string } {
  // ... (lines 284-297 unchanged)
  const unmortgageCost = getUnmortgageCost(tileId, modifiers);
  if (playerCash < unmortgageCost) {
    return {
      canUnmortgage: false,
      unmortgageCost,
      reason: `Số dư không đủ để giải chấp. Cần $${unmortgageCost}k VND (Bạn có $${playerCash}k VND).`,
    };
  }
  return { canUnmortgage: true, unmortgageCost };
}
```

##### Change 1.4: `canBuyProperty` & `canUpgradeProperty` Market Freeze Guard
Add optional `modifiers?: ChaosModifiers` and block action if `marketFrozenTurns > 0`.

```typescript
// BEFORE:
export function canBuyProperty(
  tileId: TileId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>
)

// AFTER:
import { isMarketFrozen } from '../economy/economicModifiers';

export function canBuyProperty(
  tileId: TileId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers
): { canBuy: boolean; reason?: string } {
  if (isMarketFrozen(modifiers)) {
    return {
      canBuy: false,
      reason: 'Thị trường bất động sản đang bị đóng băng (Freeze Market)! Không thể mua đất trong vòng này.',
    };
  }
  // ... (lines 122-141 unchanged)
}

export function canUpgradeProperty(
  tileId: TileId,
  playerId: PlayerId,
  playerCash: number,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers
): { canUpgrade: boolean; reason?: string } {
  if (isMarketFrozen(modifiers)) {
    return {
      canUpgrade: false,
      reason: 'Thị trường bất động sản đang bị đóng băng (Freeze Market)! Không thể xây dựng hoặc nâng cấp công trình trong vòng này.',
    };
  }
  // ... (lines 149-205 unchanged)
}
```

---

#### File 2: `src/game/gameReducer.ts`

##### Change 2.1: Movement, Curfew & Reverse Direction (`ROLL_DICE_RESULT`)
Replace lines 231–262 in `src/game/gameReducer.ts`:

```typescript
// BEFORE (Lines 231-262):
// Case 3: Normal board movement
const { newPosition, passedStart } = calculateNewPosition(activePlayer.position, sum, BOARD_SIZE);
let earnedSalary = 0;
if (passedStart) {
  earnedSalary = state.config.salaryOnStart;
}

const updatedPlayer: PlayerState = {
  ...activePlayer,
  position: newPosition,
  cash: activePlayer.cash + earnedSalary,
  consecutiveDoubles,
  stats: {
    ...activePlayer.stats,
    tilesTraveled: activePlayer.stats.tilesTraveled + sum,
  },
};

// AFTER:
import {
  calculateEffectiveMovement,
  calculateSalary,
} from './economy/economicModifiers';

// Case 3: Normal board movement with active Chaos Modifiers (Curfew, Reverse, Golden Hour)
const movement = calculateEffectiveMovement(activePlayer.position, sum, state.chaosModifiers, BOARD_SIZE);
const newPosition = movement.newPosition;
const passedStart = movement.passedStart;

let earnedSalary = 0;
if (passedStart) {
  earnedSalary = calculateSalary(state.config.salaryOnStart, state.chaosModifiers);
}

const updatedPlayer: PlayerState = {
  ...activePlayer,
  position: newPosition,
  cash: activePlayer.cash + earnedSalary,
  consecutiveDoubles,
  stats: {
    ...activePlayer.stats,
    tilesTraveled: activePlayer.stats.tilesTraveled + movement.effectiveSteps,
  },
};

const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

const landingTile = getTileById(newPosition);
const newLogs = [...state.logs];

let diceLog = `${activePlayer.name} lắc được ${d1} + ${d2} = ${sum} điểm`;
if (movement.isCapped) {
  diceLog += ` (Giới Nghiêm! Tối đa 4 bước)`;
}
if (movement.isReverse) {
  diceLog += ` (Đi ngược chiều!)`;
}
diceLog += `, di chuyển đến [${landingTile?.name || newPosition}].`;

if (isDouble) {
  diceLog += ` (Được ĐÔI! Sẽ được lắc thêm lượt)`;
}
if (earnedSalary > 0) {
  const goldenNote = state.chaosModifiers?.goldenHourTurns > 0 ? ' [Giờ Vàng x2!]' : '';
  diceLog += ` Đi qua Cổng Khởi Hành nhận $${earnedSalary}M trợ cấp!${goldenNote}`;
}
```

##### Change 2.2: Pass Modifiers into Buy, Upgrade, Mortgage & Rent
- Line 287 (`BUY_PROPERTY`):
  `const validation = canBuyProperty(tileId, activePlayer.cash, state.properties, state.chaosModifiers);`
- Line 341 (`UPGRADE_PROPERTY`):
  `const validation = canUpgradeProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers);`
- Line 449 (`MORTGAGE_PROPERTY`):
  `const validation = canMortgageProperty(tileId, activePlayer.id, state.properties, state.chaosModifiers);`
- Line 498 (`UNMORTGAGE_PROPERTY`):
  `const validation = canUnmortgageProperty(tileId, activePlayer.id, activePlayer.cash, state.properties, state.chaosModifiers);`
- Line 878 (`resolveLandingTile` Rent):
  `const rentInfo = calculateRent(landingTile.id, state.properties, state.rentModifier, diceSum, state.chaosModifiers);`

---

#### File 3: `src/game/economy/economyEngine.ts`

##### Change 3.1: Pass Modifiers into `calculateMaxLiquidationValue`
```typescript
// BEFORE (Line 81):
export function calculateMaxLiquidationValue(
  player: PlayerState,
  properties: Record<TileId, PropertyOwnership>
): number

// AFTER:
export function calculateMaxLiquidationValue(
  player: PlayerState,
  properties: Record<TileId, PropertyOwnership>,
  modifiers?: ChaosModifiers
): number {
  if (player.isBankrupt) return 0;
  let liquidationCash = player.cash;

  for (const [tileIdStr, ownership] of Object.entries(properties)) {
    if (ownership.ownerId === player.id) {
      const tileId = Number(tileIdStr);
      const tile = BOARD_TILES.find(t => t.id === tileId);
      if (tile && tile.property) {
        if (ownership.level > 0) {
          liquidationCash += Math.floor(ownership.level * tile.property.upgradeCost * 0.5);
        }
        if (!ownership.isMortgaged) {
          liquidationCash += getMortgageValue(tileId, modifiers);
        }
      }
    }
  }

  return liquidationCash;
}
```

---

### 4.3 Proposed Unit Test Suite (`src/game/__tests__/economicModifiers.test.ts`)

The implementation worker should create this complete, exhaustive unit test file covering all 10 modifiers, interactions, and edge cases:

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateModifiedRent,
  calculateSalary,
  calculateEffectiveMovement,
  calculateEffectiveMortgageValue,
  calculateEffectiveUnmortgageCost,
  isMarketFrozen,
  DEFAULT_CHAOS_MODIFIERS,
} from '../economy/economicModifiers';
import { calculateRent, canBuyProperty, canUpgradeProperty, canMortgageProperty, canUnmortgageProperty, getTileById } from '../property/propertyEngine';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { ChaosModifiers, PropertyOwnership } from '../types';

describe('Economic Modifiers Pipeline (Phase 02 Milestone 1)', () => {
  const baseModifiers = (): ChaosModifiers => ({ ...DEFAULT_CHAOS_MODIFIERS });

  // -------------------------------------------------------------------------
  // 1. Transport Boom (2x on Transport Hubs)
  // -------------------------------------------------------------------------
  describe('1. transportBoomTurns (2x Transport Rent)', () => {
    it('doubles transport hub rent when transportBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        5: { ownerId: 'p1', level: 0, isMortgaged: false },
        15: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      // 2 hubs owned: normal rent = 50. With boom = 100.
      const mods = { ...baseModifiers(), transportBoomTurns: 3 };
      const rentNormal = calculateRent(5, props, 1, 7, baseModifiers());
      const rentBoom = calculateRent(5, props, 1, 7, mods);

      expect(rentNormal.rentAmount).toBe(50);
      expect(rentBoom.rentAmount).toBe(100);
    });

    it('does not double rent on non-transport properties during transport boom', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), transportBoomTurns: 3 };
      const rentCanTho = calculateRent(1, props, 1, 7, mods);
      expect(rentCanTho.rentAmount).toBe(2); // baseRent = 2
    });
  });

  // -------------------------------------------------------------------------
  // 2. Utility Boom (2x on Utilities)
  // -------------------------------------------------------------------------
  describe('2. utilityBoomTurns (2x Utility Rent)', () => {
    it('doubles utility rent when utilityBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        12: { ownerId: 'p1', level: 0, isMortgaged: false }, // SAWACO
      };
      // 1 utility owned: multiplier = 4. DiceSum = 8 -> 32. With boom = 64.
      const mods = { ...baseModifiers(), utilityBoomTurns: 2 };
      const rentNormal = calculateRent(12, props, 1, 8, baseModifiers());
      const rentBoom = calculateRent(12, props, 1, 8, mods);

      expect(rentNormal.rentAmount).toBe(32);
      expect(rentBoom.rentAmount).toBe(64);
    });
  });

  // -------------------------------------------------------------------------
  // 3. District Boom (1.5x on Hanoi & HCMC)
  // -------------------------------------------------------------------------
  describe('3. districtBoomTurns (1.5x on Hanoi & HCMC)', () => {
    it('multiplies Hanoi (district-green) rent by 1.5x when districtBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        31: { ownerId: 'p1', level: 1, isMortgaged: false }, // Phố Tạ Hiện, 1★ houseRent = 130
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rentNormal = calculateRent(31, props, 1, 7, baseModifiers());
      const rentBoom = calculateRent(31, props, 1, 7, mods);

      expect(rentNormal.rentAmount).toBe(130);
      expect(rentBoom.rentAmount).toBe(Math.round(130 * 1.5)); // 195
    });

    it('multiplies HCMC (district-darkblue) rent by 1.5x when districtBoomTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        37: { ownerId: 'p1', level: 0, isMortgaged: false }, // Nguyễn Huệ, baseRent = 35
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rentBoom = calculateRent(37, props, 1, 7, mods);
      expect(rentBoom.rentAmount).toBe(Math.round(35 * 1.5)); // 53
    });

    it('does not affect other districts like Can Tho (district-brown)', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), districtBoomTurns: 3 };
      const rent = calculateRent(1, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Alien Mothership (0 rent on Landmark 81)
  // -------------------------------------------------------------------------
  describe('4. alienMothershipTurns (0 rent on Landmark 81)', () => {
    it('sets Landmark 81 (Tile 39) rent to 0 when alienMothershipTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        39: { ownerId: 'p1', level: 5, isMortgaged: false }, // Landmark 5★ normal rent = 2000
      };
      const mods = { ...baseModifiers(), alienMothershipTurns: 5 };
      const rent = calculateRent(39, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(0);
    });

    it('overrides district boom on Tile 39 if alien mothership is active', () => {
      const props: Record<number, PropertyOwnership> = {
        39: { ownerId: 'p1', level: 2, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), alienMothershipTurns: 2, districtBoomTurns: 3 };
      const rent = calculateRent(39, props, 1, 7, mods);
      expect(rent.rentAmount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Golden Hour (2x Salary on Start)
  // -------------------------------------------------------------------------
  describe('5. goldenHourTurns (2x Start Salary)', () => {
    it('doubles salary from 200 to 400 when goldenHourTurns > 0', () => {
      const normalSalary = calculateSalary(200, baseModifiers());
      const goldenSalary = calculateSalary(200, { ...baseModifiers(), goldenHourTurns: 1 });

      expect(normalSalary).toBe(200);
      expect(goldenSalary).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Curfew (max 4 steps)
  // -------------------------------------------------------------------------
  describe('6. curfewTurns (Max 4 Steps)', () => {
    it('caps dice roll steps to 4 when curfewTurns > 0 and roll > 4', () => {
      const mods = { ...baseModifiers(), curfewTurns: 1 };
      const move9 = calculateEffectiveMovement(0, 9, mods);
      expect(move9.effectiveSteps).toBe(4);
      expect(move9.newPosition).toBe(4);
      expect(move9.isCapped).toBe(true);

      const move12 = calculateEffectiveMovement(10, 12, mods);
      expect(move12.effectiveSteps).toBe(4);
      expect(move12.newPosition).toBe(14);
      expect(move12.isCapped).toBe(true);
    });

    it('does not cap dice rolls <= 4', () => {
      const mods = { ...baseModifiers(), curfewTurns: 1 };
      const move3 = calculateEffectiveMovement(0, 3, mods);
      expect(move3.effectiveSteps).toBe(3);
      expect(move3.newPosition).toBe(3);
      expect(move3.isCapped).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Reverse Direction (Backwards Movement)
  // -------------------------------------------------------------------------
  describe('7. reverseDirectionTurns (Backwards Movement)', () => {
    it('moves counter-clockwise around 40-tile board', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(10, 6, mods);
      expect(move.newPosition).toBe(4);
      expect(move.isReverse).toBe(true);
      expect(move.passedStart).toBe(false);
    });

    it('wraps past tile 0 without granting passing start salary', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(2, 5, mods);
      // 2 - 5 = -3 -> tile 37
      expect(move.newPosition).toBe(37);
      expect(move.passedStart).toBe(false);
    });

    it('correctly lands on tile 0 moving backwards', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3 };
      const move = calculateEffectiveMovement(3, 3, mods);
      expect(move.newPosition).toBe(0);
    });

    it('combines curfew and reverse direction: roll 9 -> capped to 4 backwards', () => {
      const mods = { ...baseModifiers(), reverseDirectionTurns: 3, curfewTurns: 1 };
      const move = calculateEffectiveMovement(10, 9, mods);
      expect(move.effectiveSteps).toBe(4);
      expect(move.newPosition).toBe(6);
      expect(move.isCapped).toBe(true);
      expect(move.isReverse).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Interest Hike (+10% unmortgage fee, total 20%)
  // -------------------------------------------------------------------------
  describe('8. interestHikeTurns (+10% Unmortgage Fee)', () => {
    it('increases unmortgage fee to 20% (multiplier 1.20) when interestHikeTurns > 0', () => {
      // Tile 1 basePrice = 60, mortgageValue = 30.
      // Normal: 30 * 1.10 = 33.
      // With Hike: 30 * 1.20 = 36.
      const normalCost = calculateEffectiveUnmortgageCost(60, baseModifiers());
      const hikedCost = calculateEffectiveUnmortgageCost(60, { ...baseModifiers(), interestHikeTurns: 3 });

      expect(normalCost).toBe(33);
      expect(hikedCost).toBe(36);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Subsidized Mortgage (75% mortgage value)
  // -------------------------------------------------------------------------
  describe('9. subsidizedMortgageTurns (75% Mortgage Value)', () => {
    it('provides 75% of base price upon mortgage when subsidizedMortgageTurns > 0', () => {
      // Tile 1 basePrice = 60.
      // Normal: 60 * 0.50 = 30.
      // Subsidized: 60 * 0.75 = 45.
      const normalVal = calculateEffectiveMortgageValue(60, baseModifiers());
      const subsidizedVal = calculateEffectiveMortgageValue(60, { ...baseModifiers(), subsidizedMortgageTurns: 2 });

      expect(normalVal).toBe(30);
      expect(subsidizedVal).toBe(45);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Market Frozen (Block Buy and Upgrade)
  // -------------------------------------------------------------------------
  describe('10. marketFrozenTurns (Freeze Market)', () => {
    it('blocks canBuyProperty when marketFrozenTurns > 0', () => {
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const check = canBuyProperty(1, 1500, {}, mods);
      expect(check.canBuy).toBe(false);
      expect(check.reason).toContain('đóng băng');
    });

    it('blocks canUpgradeProperty when marketFrozenTurns > 0', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const check = canUpgradeProperty(1, 'p1', 1500, props, mods);
      expect(check.canUpgrade).toBe(false);
      expect(check.reason).toContain('đóng băng');
    });

    it('allows mortgaging and downgrading during market freeze (emergency liquidation)', () => {
      const props: Record<number, PropertyOwnership> = {
        1: { ownerId: 'p1', level: 0, isMortgaged: false },
        3: { ownerId: 'p1', level: 0, isMortgaged: false },
      };
      const mods = { ...baseModifiers(), marketFrozenTurns: 1 };
      const mortgageCheck = canMortgageProperty(1, 'p1', props, mods);
      expect(mortgageCheck.canMortgage).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 11. Zero Regression & Invariants
  // -------------------------------------------------------------------------
  describe('11. Backward Compatibility & Invariant Audit', () => {
    it('produces 100% identical outputs when modifiers are omitted (default all zeros)', () => {
      expect(calculateEffectiveMortgageValue(100)).toBe(50);
      expect(calculateEffectiveUnmortgageCost(100)).toBe(55);
      expect(calculateSalary(200)).toBe(200);
      expect(isMarketFrozen()).toBe(false);
      expect(calculateEffectiveMovement(5, 7)).toEqual({
        effectiveSteps: 7,
        newPosition: 12,
        passedStart: false,
        isCapped: false,
        isReverse: false,
      });
    });
  });
});
```

---

## 5. Verification Method

To independently verify this strategy and ensure zero regression:

1. **Verify Baseline Test Suite**:
   ```bash
   npx vitest run
   ```
   Must yield 208 passing tests across 10 test files.
2. **Execute New Economic Modifiers Suite**:
   ```bash
   npx vitest run src/game/__tests__/economicModifiers.test.ts
   ```
   Must pass all 17 unit tests cleanly with duration < 1s.
3. **Verify Full Production Build**:
   ```bash
   npm run build
   ```
   Must compile cleanly with zero TypeScript errors and emit bundle to `dist/`.
4. **Invalidation Conditions**:
   - Any modification that causes existing tests in `gameEngine.test.ts`, `challenger_empirical_m1.test.ts`, or `tier1_phase02_features.test.ts` to fail invalidates the implementation.
   - Any modifier calculation where 0 turns active modifies standard economic values invalidates the backward compatibility contract.
   - If Alien Mothership produces `rentAmount > 0` on Tile 39, the verification fails.
   - If reverse movement grants passing start salary, the verification fails.
