# Quality & Adversarial Review Report — Milestone 1 (M1)

**Reviewer Agent**: `teamwork_reviewer_m1_1` (reviewer & critic)  
**Date**: 2026-10-31  
**Milestone Reviewed**: Milestone 1 — Core Game Engine & 40-Tile Board Migration  
**Worker Under Review**: `teamwork_worker_m1`  
**Verdict**: **`REQUEST_CHANGES`**  

---

## Executive Summary

The Milestone 1 deliverable represents a substantial and impressive architectural implementation:
- **Zero Integrity Violations**: There are **no** hardcoded test outputs, facade implementations, or simulated results in source code. All algorithms (5-tier rent scaling, even building rules, net worth, doubles mechanics, mortgage calculations) are genuinely computed.
- **Test Suite**: Vitest executes 5 test files with **71/71 passing tests** in ~2.8 seconds.
- **Production Build**: `npm run build` (`tsc && vite build`) compiles 2,080 modules cleanly with **0 errors**, yielding ~277 kB JS and ~39.5 kB CSS.
- **40-Tile Board Data**: All 40 tiles, 8 color districts, 4 transport hubs, 2 utilities, and 4 corner tiles from `game_and_chaos_spec.md` are accurately configured with Vietnamese landmark names, descriptions, and 11×11 perimeter coordinates.

However, an **adversarial stress test** of state transitions uncovered **2 Major logic flaws** in the debt liquidation and solvency engine, along with **3 Minor interface and configuration discrepancies**, which will cause runtime deadlocks and contract breaks if unaddressed before Milestone 2 and Milestone 3 integration.

---

## 1. Observation

### 1.1 Direct Test & Build Observations
1. **Automated Test Suite**:
   Command: `npm test`
   Result:
   ```
   ✓ src/game/__tests__/tier3_combinations.test.ts (9 tests) 20ms
   ✓ src/game/__tests__/tier2_boundaries.test.ts (13 tests) 18ms
   ✓ src/game/__tests__/tier1_features.test.ts (17 tests) 44ms
   ✓ src/game/__tests__/tier4_match_scenarios.test.ts (7 tests) 31ms
   ✓ src/game/__tests__/gameEngine.test.ts (25 tests) 83ms

   Test Files  5 passed (5)
        Tests  71 passed (71)
     Duration  2.79s
   ```
2. **Production Compilation**:
   Command: `npm run build` (`tsc && vite build`)
   Result: Exit code 0, 2080 modules transformed, `dist/assets/index-DXij8RE0.js` 276.65 kB, `dist/assets/index-CZUxjyxH.css` 39.55 kB. Zero type errors or syntax warnings.

### 1.2 Code Inspection Observations

#### Obs 1: Phase Mismatch in `RESOLVE_DEBT` (Deadlock)
- Location: `src/game/gameReducer.ts` line 530 vs lines 810 and 882.
- Verbatim code at lines 808–812:
  ```typescript
  return {
    ...state,
    players: updatedPlayers,
    turnPhase: 'BANKRUPTCY_CHECK',
    pendingDebt: {
      creditorPlayerId: null,
      amount: taxAmount - remainingCash,
      reason: `Nộp thuế tại [${landingTile.name}]`,
    },
    ...
  ```
- Verbatim code at lines 880–887:
  ```typescript
  return {
    ...state,
    players: updatedPlayers,
    turnPhase: 'BANKRUPTCY_CHECK',
    pendingDebt: {
      creditorPlayerId: owner.id,
      amount: rentAmount - actualPaid,
      reason: `Tiền thuê tại [${landingTile.name}] cho ${owner.name}`,
    },
    ...
  ```
- Verbatim code at line 530:
  ```typescript
  case 'RESOLVE_DEBT': {
    if (state.turnPhase !== 'DEBT_LIQUIDATION' || !state.pendingDebt) {
      return state;
    }
  ```
- Observation: `turnPhase` is set to `'BANKRUPTCY_CHECK'` when incurring debt. `'DEBT_LIQUIDATION'` is **never assigned anywhere** in `gameReducer.ts`. When a player mortgages assets to raise cash and dispatches `{ type: 'RESOLVE_DEBT' }`, `state.turnPhase !== 'DEBT_LIQUIDATION'` evaluates to `true`, causing `RESOLVE_DEBT` to silently return `state` unchanged.

#### Obs 2: Solvency Invariant Bypass via `END_TURN`
- Location: `src/game/gameReducer.ts` lines 626–650.
- Verbatim code:
  ```typescript
  case 'END_TURN': {
    const activePlayer = state.players[state.activePlayerIndex];
    if (state.isDouble && !activePlayer.inDetention && activePlayer.consecutiveDoubles < 3) {
      ...
    }
    return advanceTurn(state);
  }
  ```
- In `src/game/turn-manager/turnManager.ts` lines 89–100:
  ```typescript
  return {
    ...state,
    players: updatedPlayers,
    activePlayerIndex: nextIndex,
    roundNumber: newRound,
    turnPhase: 'WAITING_FOR_ROLL',
    activeChaosCard: null,
    pendingDebt: null,
    ...
  };
  ```
- Observation: When a player is in `BANKRUPTCY_CHECK` with `pendingDebt`, `END_TURN` has no guard preventing action dispatch. Calling `END_TURN` invokes `advanceTurn`, which resets `pendingDebt: null` and gives the turn to the next player. The debtor player completely evades paying their debt.

#### Obs 3: Detention Countdown Double-Decrement
- Location: `src/game/turn-manager/turnManager.ts` lines 70–84 and `src/game/gameReducer.ts` lines 152–156.
- In `advanceTurn`:
  ```typescript
  if (updatedPlayer.inDetention) {
    if (updatedPlayer.detentionTurns > 1) {
      updatedPlayer = {
        ...updatedPlayer,
        detentionTurns: updatedPlayer.detentionTurns - 1,
      };
    } else {
      updatedPlayer = {
        ...updatedPlayer,
        inDetention: false,
        detentionTurns: 0,
      };
    }
  }
  ```
- In `gameReducer.ts` (`ROLL_DICE_RESULT` for detained player rolling non-doubles):
  ```typescript
  const remainingTurns = Math.max(0, activePlayer.detentionTurns - 1);
  const updatedPlayer: PlayerState = {
    ...activePlayer,
    detentionTurns: remainingTurns,
  };
  ```
- Observation: When a player is sent to detention with `detentionTurns: 2`, `advanceTurn` decrements it to 1 when their turn begins. When they roll non-doubles, `ROLL_DICE_RESULT` decrements it again to 0. On the next round, `advanceTurn` sees `detentionTurns <= 1` and releases them. A player thus only spends 1 actual turn in detention instead of up to 3 turns as specified in `game_and_chaos_spec.md` Section 2.2 #2.

#### Obs 4: Interface Contract Discrepancy for Milestone 2
- Location: `PROJECT.md` line 73–86 vs `src/game/types/index.ts`.
- In `PROJECT.md`:
  ```typescript
  export interface ChaosEventPayload {
    id: string;
    nameVi: string;
    descriptionVi: string;
    category: 'POSITIVE' | 'NEGATIVE' | 'PERSONAL' | 'GLOBAL' | 'ECONOMIC' | 'LEGENDARY';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'CALAMITY';
    durationInTurns: number;
    effectType: string;
    magnitude: number;
    targetPlayerId?: string;
  }
  ```
  Reducer action required: `{ type: 'APPLY_CHAOS_EFFECT', payload: ChaosEventPayload }`.
- Observation: Neither `ChaosEventPayload` nor `{ type: 'APPLY_CHAOS_EFFECT', payload: ChaosEventPayload }` exists in `src/game/types/index.ts`. Milestone 2 implementers will encounter an immediate type and action contract mismatch.

#### Obs 5: Legacy Detention Tile Coordinate in `chaosEngine.ts`
- Location: `src/game/chaos-engine/chaosEngine.ts` line 89.
- Verbatim code:
  ```typescript
  case 'GO_TO_DETENTION': {
    updatedPlayers[state.activePlayerIndex] = {
      ...activePlayer,
      position: 6, // Detention tile
      inDetention: true,
      detentionTurns: 2,
    };
  ```
- Observation: Tile 6 is `Bãi Sau Vũng Tàu`. Tile 10 is `Khu Cách Ly Tạm Giam`. `gameReducer.ts` line 834 calls `drawRandomChaosCard()` on Chaos/Chest/Chance tiles. Drawing this card teleports the player to Vũng Tàu instead of Detention.

---

## 2. Logic Chain

1. **Integrity Chain**:
   - Inspection of all source code files in `src/game/` verified that calculations are dynamic and mathematical: `Math.floor(basePrice * 0.5)`, `rent = baseRent * 2`, `multiplier * diceSum`, `houseRent[level - 1]`.
   - Inspection of `vitest` logs and tests confirmed that tests make genuine assertions against `gameReducer` outputs.
   - **Deduction**: Work is authentic with zero integrity violations.

2. **Debt Liquidation Logic Chain**:
   - When a player cannot pay rent or tax, `resolveLandingTile` returns `{ turnPhase: 'BANKRUPTCY_CHECK', pendingDebt: { ... } }`.
   - The player may use `MORTGAGE_PROPERTY` or `DOWNGRADE_PROPERTY` to raise cash.
   - Once cash >= debt amount, the player is expected to dispatch `{ type: 'RESOLVE_DEBT' }`.
   - In `gameReducer.ts` line 530, `RESOLVE_DEBT` rejects any state where `state.turnPhase !== 'DEBT_LIQUIDATION'`.
   - Since `state.turnPhase` is `'BANKRUPTCY_CHECK'`, the action is rejected and returns `state` without paying the debt or exiting the debt phase.
   - The player is stuck and can only call `DECLARE_BANKRUPTCY`.
   - **Deduction**: The recovery pathway of debt liquidation is non-functional.

3. **Solvency Invariant Chain**:
   - `PROJECT.md` establishes the invariant: "No negative cash without bankruptcy liquidation" and "Validate all game actions. Avoid invalid turns... and impossible money states."
   - If a debtor in `BANKRUPTCY_CHECK` dispatches `END_TURN`, `gameReducer` passes the action straight to `advanceTurn`.
   - `advanceTurn` wipes `pendingDebt: null` and passes turn to the next player.
   - The debtor avoids both debt payment and bankruptcy liquidation.
   - **Deduction**: `END_TURN` must be guarded when in `BANKRUPTCY_CHECK` or `DEBT_LIQUIDATION`.

---

## 3. Caveats

- Milestone 3 is responsible for updating `BoardView.tsx` from 7×7 to 11×11. `boardData.ts` already provides the necessary `TILE_GRID_POSITIONS_40` layout mapping.
- Milestone 2 is responsible for full PRNG and the 36 Vietnamese Chaos cards catalog. However, the existing placeholder `chaosEngine.ts` line 89 should have `position: 10` to avoid teleporting players to Vũng Tàu in the interim.
- The Vitest suite currently does not include a test specifically exercising `RESOLVE_DEBT` after mortgaging to clear a debt. Adding this test will ensure regression prevention.

---

## 4. Conclusion & Findings

**Verdict**: **`REQUEST_CHANGES`**

### Findings Breakdown

#### Finding 1 (Major) — `RESOLVE_DEBT` State Guard Deadlock
- **What**: `RESOLVE_DEBT` requires `turnPhase === 'DEBT_LIQUIDATION'`, but debt is created with `turnPhase: 'BANKRUPTCY_CHECK'`.
- **Where**: `src/game/gameReducer.ts:530`
- **Fix**: Change condition to:
  ```typescript
  if ((state.turnPhase !== 'DEBT_LIQUIDATION' && state.turnPhase !== 'BANKRUPTCY_CHECK') || !state.pendingDebt) {
    return state;
  }
  ```

#### Finding 2 (Major) — Solvency Invariant Bypass via `END_TURN`
- **What**: A player with pending debt can dispatch `END_TURN` to clear debt and skip payment.
- **Where**: `src/game/gameReducer.ts:626`
- **Fix**: Add guard at the beginning of `case 'END_TURN':`:
  ```typescript
  case 'END_TURN': {
    if (state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION') {
      return state;
    }
  ```

#### Finding 3 (Minor) — Interface Contract M1 ↔ M2 Alignment
- **What**: `ChaosEventPayload` and `{ type: 'APPLY_CHAOS_EFFECT', payload: ChaosEventPayload }` are missing in `src/game/types/index.ts`.
- **Where**: `src/game/types/index.ts`
- **Fix**: Export `ChaosEventPayload` and add the action to `GameAction`.

#### Finding 4 (Minor) — Jail Teleport Position in `chaosEngine.ts`
- **What**: `position: 6` is assigned on `GO_TO_DETENTION` instead of `10`.
- **Where**: `src/game/chaos-engine/chaosEngine.ts:89`
- **Fix**: Change `position: 6` to `position: 10`.

#### Finding 5 (Minor) — Detention Turns Double Decrement
- **What**: Turns in detention are decremented in both `advanceTurn` and `ROLL_DICE_RESULT`.
- **Where**: `src/game/turn-manager/turnManager.ts:70–84` vs `src/game/gameReducer.ts:153`
- **Fix**: Unify detention turn decrements to only happen in `advanceTurn` (or upon rolling non-doubles in `ROLL_DICE_RESULT`), and initialize `detentionTurns` to 3.

---

## 5. Verification Method

To verify after applying fixes:

```powershell
# 1. Run all unit and integration tests
npm test

# 2. Run TypeScript build verification
npm run build
```

**Invalidation Conditions**:
- If `RESOLVE_DEBT` succeeds when dispatched during `BANKRUPTCY_CHECK` after mortgaging properties, Finding 1 is verified fixed.
- If `END_TURN` is ignored when `state.turnPhase === 'BANKRUPTCY_CHECK'`, Finding 2 is verified fixed.
- If `npm test` and `npm run build` continue to pass with 0 errors, full regression safety is maintained.
