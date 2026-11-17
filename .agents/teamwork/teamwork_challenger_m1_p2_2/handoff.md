# Empirical Challenge Report: Milestone 1 (Economic Modifiers & Detention Stress Testing)

**Agent**: Challenger M1-2 (`teamwork_challenger_m1_p2_2`)  
**Verdict**: **REQUEST_CHANGES**  
**Timestamp**: 2026-10-31T12:17:00Z  

---

## 1. Observation

### 1.1 Test Execution & Baseline Suite
- Execution command: `npx vitest run`
- Output: 16 test files passed, 358 tests passed (0 failed).
- Authored stress test suite: `src/game/__tests__/challenger_m1_p2_modifiers_detention.test.ts` (20 tests passed).
- Execution command: `npm run build`
- Output: `tsc && vite build` succeeded with exit code 0; 0 TypeScript errors; bundle built in `dist/`.

### 1.2 Extreme Combinations of Chaos Modifiers
- Verified in `src/game/__tests__/challenger_m1_p2_modifiers_detention.test.ts` with all 10 Chaos modifiers active simultaneously:
  - `reverseDirectionTurns: 3`, `curfewTurns: 3`, `marketFrozenTurns: 3`, `goldenHourTurns: 3`, `transportBoomTurns: 3`, `utilityBoomTurns: 3`, `districtBoomTurns: 3`, `alienMothershipTurns: 3`, `interestHikeTurns: 3`, `subsidizedMortgageTurns: 3`.
  - Movement: Roll of [6, 6] (sum 12) is correctly capped to 4 steps by curfew and moves counter-clockwise (position 2 -> 38). `isReverse = true`, `isCapped = true`, `passedStart = false`.
  - Rent on Landmark 81 (Tile 39): strictly 0 rent (Alien Mothership completely overrides District Boom 1.5x multiplier).
  - Rent on Nguyễn Huệ (Tile 37): scaled by 1.5x District Boom (Level 5 Landmark: 1,500k -> 2,250k).
  - Mortgage: Subsidized mortgage awards 75% principal ($300k on $400k base price).
  - Unmortgage: Interest hike applies 20% interest ($240k on $400k base price).
  - Market: `canBuyProperty` and `canUpgradeProperty` return `canBuy = false` / `canUpgrade = false` with freeze explanation.
  - Round Advance: All 10 active modifiers decrement in lockstep on round completion.

### 1.3 Tile 39 (Landmark 81) Alien Mothership Edge Case
- Verified across upgrade levels 0 through 5:
  - Level 0 (Base Rent 50k): rent is strictly 0.
  - Level 5 (Landmark 2,000k): rent is strictly 0.
  - An insolvent player with only $10 cash landing on opponent-owned Level 5 Landmark 81 pays $0, generates 0 debt, and remains solvent in `turnPhase: 'ACTION_MENU'`.
  - Expiration of Alien Mothership (`alienMothershipTurns === 0`) restores full 2,000k rent immediately.
  - Sibling property in dark blue district (Tile 37) is unaffected and collects full rent.

### 1.4 Board Wrap-Around under Reverse Movement
- Exhaustive coverage across all 40 tiles x all 11 dice sums (440 test permutations):
  - Standard reverse movement: `newPosition === ((pos - sum) % 40 + 40) % 40`, `passedStart === false`.
  - Curfew reverse movement: `steps === Math.min(sum, 4)`, `newPosition === ((pos - steps) % 40 + 40) % 40`.
  - Boundary steps verified: Tile 0 - 1 = 39; Tile 0 - 4 = 36; Tile 1 - 2 = 39; Tile 3 - 4 = 39; Tile 39 - 1 = 38.
  - Reversing across Tile 0 does NOT award Start tile salary (`passedStart = false`, 0 `SALARY_START` ledger entries).

### 1.5 Detention 100-Run Monte Carlo Stress Test & Defect Discovery
- In 100 simulated detention entries:
  - Free on doubles: player freed immediately, moves by dice sum, `isDouble = false` (no extra turn), no bail deducted.
  - Card release: `USE_DETENTION_CARD` decrements `jailFreeCards`, frees player without cash deduction.
  - Voluntary bail: `PAY_DETENTION_BAIL` deducts $100 via ledger, frees player, resets turn to `WAITING_FOR_ROLL`.
  - Insolvent bail: player unable to pay mandatory bail enters `BANKRUPTCY_CHECK` for exact shortfall without infinite detention.
- **DEFECT OBSERVED**: In `src/game/turn-manager/turnManager.ts` lines 70-75:
  ```typescript
  // Reset consecutive doubles for next player
  let updatedPlayer = { ...nextPlayer, consecutiveDoubles: 0 };
  if (updatedPlayer.inDetention && updatedPlayer.detentionTurns === 1) {
    updatedPlayer = {
      ...updatedPlayer,
      detentionTurns: 0,
    };
  }
  ```
  When tested across multi-turn game cycles with `END_TURN` / `advanceTurn`:
  - Player 0 enters detention (`detentionTurns = 2`).
  - Turn 1 (Attempt 1): Player 0 rolls non-doubles. `gameReducer.ts:268` decrements `detentionTurns` from 2 to 1.
  - Player 0 ends turn. Turn advances to Player 1, then back to Player 0.
  - During `advanceTurn`, `turnManager.ts:70-75` checks `updatedPlayer.detentionTurns === 1` and prematurely decrements `detentionTurns` to 0 **before Player 0 even rolls on Turn 2**!
  - Turn 2 (Attempt 2): Player 0 starts with `detentionTurns === 0`. Rolling non-doubles immediately triggers mandatory bail and evicts the player on Turn 2!
  - Player 0 is denied their 3rd roll attempt. In actual gameplay, detained players only receive 2 roll attempts instead of 3.
  - Captured empirically in test:
    `it.fails('BUG EXPOSURE: tracks 3 distinct roll attempts across multi-turn game cycles (with END_TURN) [Fails due to turnManager.ts:70 duplicate decrement]')`.

---

## 2. Logic Chain

1. **Specification Requirement**: Feature 7 of `PROJECT.md` mandates:
   > "Jail & Detention Overhaul: Fix double-decrement bug (3 turns max), force bail on turn 3, `jailFreeCards`"
   Worker M1's handoff report (Section 2, item 4) explicitly claims:
   > "Authentic 3-Turn Detention Rules: Under Monopoly specifications, a detained player is entitled to up to 3 roll attempts. Initializing `detentionTurns: 2` allows 3 distinct turns: Attempt 1 at `detentionTurns === 2`, Attempt 2 at `detentionTurns === 1`, and Attempt 3 at `detentionTurns === 0`."
2. **Implementation Flaw**: `gameReducer.ts` lines 266-274 already handles the decrement upon each failed roll attempt:
   ```typescript
   if (activePlayer.detentionTurns > 0) {
     const remainingTurns = activePlayer.detentionTurns - 1;
     // 2 -> 1 on attempt 1, 1 -> 0 on attempt 2
   ```
   Because `gameReducer` decrements `detentionTurns` from 2 to 1 on Attempt 1, `detentionTurns` is 1 when Player 0 ends their turn.
3. **Double Decrement in turnManager.ts**: When the turn rotates back to Player 0 via `advanceTurn`, lines 70-75 of `turnManager.ts` intercept `detentionTurns === 1` and decrement it to 0 before Attempt 2 starts.
4. **Premature Bail**: Attempt 2 starts with `detentionTurns === 0`. Failing Attempt 2 immediately enters line 294 of `gameReducer.ts` ("Final attempt failed (detentionTurns <= 0) -> MANDATORY BAIL"), forcing bail on Turn 2.
5. **Masked Unit Test**: Worker M1's unit test in `tier1_detention_start_fsm.test.ts` lines 61-78 tested two consecutive `ROLL_DICE_RESULT` calls without invoking `END_TURN` or `advanceTurn`, thereby masking the bug. When simulated under realistic multi-turn cycles, the bug reproduces 100% of the time.

---

## 3. Caveats

- All economic modifier calculations, formulas, multipliers, and diagnostic reporting functions in `src/game/economy/economicModifiers.ts` and `src/game/property/propertyEngine.ts` are robust, mathematically verified, and free of defects.
- In-turn detention handling in `gameReducer.ts` (doubles escape, card escape, voluntary bail, mandatory bail shortfall liquidation) functions correctly in isolation.
- The defect is strictly isolated to `src/game/turn-manager/turnManager.ts` lines 70-75.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

While the Economic Modifiers pipeline, Tile 39 Alien Mothership edge case, and board wrap-around under reverse movement are fully correct and pass all stress harnesses, a residual double-decrement defect exists in `src/game/turn-manager/turnManager.ts` (lines 70-75). This defect violates the core rule requirement of 3 distinct detention roll attempts by prematurely triggering mandatory bail on Turn 2.

### Actionable Remediation for Worker / Architect:
In `src/game/turn-manager/turnManager.ts`, remove lines 70-75 completely:
```typescript
<<<< DELETE LINES 70-75 FROM src/game/turn-manager/turnManager.ts >>>>
  if (updatedPlayer.inDetention && updatedPlayer.detentionTurns === 1) {
    updatedPlayer = {
      ...updatedPlayer,
      detentionTurns: 0,
    };
  }
<<<< END DELETE >>>>
```
Because `gameReducer.ts` already decrements `detentionTurns` upon each non-double roll, removing lines 70-75 will allow:
- Attempt 1: player rolls at `detentionTurns === 2` -> decrements to 1.
- Turn advances: `detentionTurns` remains 1.
- Attempt 2: player rolls at `detentionTurns === 1` -> decrements to 0.
- Turn advances: `detentionTurns` remains 0.
- Attempt 3: player rolls at `detentionTurns === 0` -> mandatory bail triggered.

Once lines 70-75 are removed, change `it.fails` in `src/game/__tests__/challenger_m1_p2_modifiers_detention.test.ts` line 397 to `it`, and the entire test suite will be 100% green.

---

## 5. Verification Method

To reproduce and verify these findings independently from the project root (`c:\Users\hxn\Desktop\CHAOS MONOPOLY`):

1. **Run Challenger Stress Suite**:
   ```powershell
   npx vitest run src/game/__tests__/challenger_m1_p2_modifiers_detention.test.ts
   ```
   *Expected outcome*: 20 tests pass. Note that `BUG EXPOSURE: tracks 3 distinct roll attempts across multi-turn game cycles (with END_TURN)` is marked with `it.fails` to formally track the `turnManager.ts:70-75` bug.

2. **Run Full Test Matrix**:
   ```powershell
   npx vitest run
   ```
   *Expected outcome*: 16 test files pass, 358 tests pass (0 failed).

3. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected outcome*: Clean build with exit code 0 (`dist/` bundle created).
