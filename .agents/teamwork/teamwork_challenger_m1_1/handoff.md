# Empirical Challenger Report — Milestone 1: Core Game Engine & 40-Tile Board

**Agent**: `teamwork_challenger_m1_1` (challenger / critic / specialist)  
**Date**: 2026-10-31  
**Milestone**: Milestone 1 (M1) — Core Game Engine & 40-Tile Board  
**Verdict**: **REQUEST_CHANGES**  

---

## Challenge Summary

**Overall risk assessment**: **HIGH**  
While the core board geometry, rent mathematical scaling, 2d6 doubles rules, and basic cash transfer invariants are solidly implemented and verified by 20/20 test cases in `src/game/__tests__/challenger_empirical_m1.test.ts`, adversarial stress testing uncovered **two reproducible behavioral defects and one pacing flaw** in `src/game/gameReducer.ts` and `src/game/turn-manager/turnManager.ts`:
1. **Critical Debt Soft-Lock**: A phase mismatch prevents players from ever resolving debt via `RESOLVE_DEBT` after entering `BANKRUPTCY_CHECK`.
2. **Post-Game State Mutation**: Lack of guards allows player tokens to roll dice and move after `status === 'ENDED'` / `turnPhase === 'GAME_OVER'`.
3. **Off-By-One Round Cap**: Setting `maxRounds = 60` cuts off gameplay at the end of Round 59, preventing Round 60 from ever being played.

---

## 1. Observation

Direct observations from independent test execution, oracle evaluations, and codebase inspection:

### 1.1 Baseline Build and Execution
- Executed `npm test`:
  ```
  Test Files  5 passed (5)
       Tests  71 passed (71)
    Duration  2.54s
  ```
- Executed `npm run build` (`tsc && vite build`):
  ```
  ✓ 2080 modules transformed.
  dist/index.html                   1.05 kB │ gzip:  0.63 kB
  dist/assets/index-CZUxjyxH.css   39.55 kB │ gzip:  7.37 kB
  dist/assets/index-DXij8RE0.js   276.65 kB │ gzip: 82.43 kB
  ✓ built in 12.51s (Exit code: 0)
  ```

### 1.2 Empirical Oracle Test Suite (`src/game/__tests__/challenger_empirical_m1.test.ts`)
Authored and ran independent 20-test oracle verifying Section 2.1 of `game_and_chaos_spec.md`:
- **Board Geometry**: Verified strictly 40 tiles (indices 0 to 39 without gaps or duplicates), correct Vietnamese names (`Cổng Khởi Hành`, `Bến Ninh Kiều`, `Landmark 81`), tile types (`START`, `PROPERTY`, `TRANSPORT`, `UTILITY`, `CHAOS`, `CHEST`, `CHANCE`, `DETENTION`, `TAX`, `REST_ZONE`, `GO_TO_JAIL`), 11×11 perimeter grid layout (`col` and `row` in 1..11 on outer perimeter).
- **Mathematical Rent Matrix**:
  - All 22 street properties: unimproved single base rent, full color district monopoly doubling (`baseRent * 2`), 5-tier house upgrades (`houseRent[0]` to `houseRent[4]`), zero rent when mortgaged.
  - 4 Transport Hubs: 1 hub = $25k, 2 hubs = $50k, 3 hubs = $100k, 4 hubs = $200k.
  - 2 Utilities: 1 utility = $4 \times \text{diceSum}$, 2 utilities = $10 \times \text{diceSum}$ across all dice sums 2..12.
- **Building & Mortgage Invariants**:
  - Even Building Rule: cannot upgrade to Level $N + 1$ while sibling is $< N$.
  - Reverse Even Building Rule: cannot downgrade while sibling is $> N$.
  - Mortgage invariants: cannot mortgage if district has buildings; 50% mortgage value; 55% unmortgage cost ($50\% + 10\%$ interest); cannot build in district while any property is mortgaged.
- **Dice Mechanics**:
  - 36 combinations of 2d6 tested: exactly 6 doubles, 30 non-doubles.
  - Position wrap-around modulo 40 and pass GO salary (+$200k) accurately awarded.
  - 3 consecutive doubles penalty: immediately teleports to Tile 10 (`DETENTION`), sets `inDetention: true`, `detentionTurns: 2`, `consecutiveDoubles: 0`, and revokes `isDouble`.
  - Tile 30 (`GO_TO_JAIL`): direct detention without GO salary.
- **Solvency Invariant**:
  - `player.cash >= 0` preserved during excessive rent or tax.
  - Zero phantom funds: creditor receives only what debtor actually held.
  - Bankruptcy liquidation: properties transfer to creditor retaining mortgage flags, or return to bank with wiped buildings and cleared mortgage.
- Result: **20 passed (100%)**.

### 1.3 Adversarial Stress Testing (`src/game/__tests__/adversarial_stress.test.ts`)
Execution output:
```
FAIL src/game/__tests__/adversarial_stress.test.ts (14 tests | 2 failed)
× 2. Debt Liquidation Under Creditor Claims > tests whether RESOLVE_DEBT can be executed when in BANKRUPTCY_CHECK phase after raising funds
  AssertionError: expected { creditorPlayerId: 'player-2', amount: 100, reason: 'Rent debt' } to be null
× 4. 60-Round Match Conclusion and Net Worth Tie-Breaker > tests state immutability and guard against actions after GAME_OVER
  AssertionError: expected 5 to be +0 // Object.is equality (posAfter !== posBefore)
```

---

## 2. Logic Chain & Defect Analysis

### Defect 1: Permanent Soft-Lock on Debt Resolution (`RESOLVE_DEBT`)
1. **Observation**: In `src/game/gameReducer.ts` lines 808–828 (Tax) and lines 878–890 (Rent):
   ```typescript
   // Line 810 & Line 882:
   return {
     ...state,
     players: updatedPlayers,
     turnPhase: 'BANKRUPTCY_CHECK',
     pendingDebt: { creditorPlayerId: ..., amount: ... },
   };
   ```
2. **Observation**: In `src/game/gameReducer.ts` line 529–532:
   ```typescript
   case 'RESOLVE_DEBT': {
     if (state.turnPhase !== 'DEBT_LIQUIDATION' || !state.pendingDebt) {
       return state;
     }
   ```
3. **Inference**: When an insolvent player lands on a property and owes rent or tax, `resolveLandingTile` transitions `turnPhase` to `'BANKRUPTCY_CHECK'`.
4. **Impact**: The player can mortgage properties or sell buildings to raise adequate cash (`player.cash >= pendingDebt.amount`), but when dispatching `RESOLVE_DEBT`, the guard `if (state.turnPhase !== 'DEBT_LIQUIDATION')` evaluates to `true` because `turnPhase === 'BANKRUPTCY_CHECK'`. The action is discarded as a no-op! The player is trapped in `BANKRUPTCY_CHECK` and cannot resume the game except by declaring bankruptcy.
5. **Mitigation**: Update `RESOLVE_DEBT` guard to permit both debt phases:
   ```typescript
   if ((state.turnPhase !== 'DEBT_LIQUIDATION' && state.turnPhase !== 'BANKRUPTCY_CHECK') || !state.pendingDebt) {
     return state;
   }
   ```
   Or have `resolveLandingTile` set `turnPhase: 'DEBT_LIQUIDATION'`.

### Defect 2: Missing Action Guards After Match Conclusion (`GAME_OVER`)
1. **Observation**: In `src/game/gameReducer.ts` lines 110–112:
   ```typescript
   case 'ROLL_DICE_RESULT': {
     const activePlayer = state.players[state.activePlayerIndex];
     if (!activePlayer || activePlayer.isBankrupt) return state;
   ```
2. **Observation**: Neither `state.status === 'ENDED'` nor `state.turnPhase === 'GAME_OVER'` is checked before executing movement and tile landing resolution.
3. **Impact**: If a player or automated agent dispatches `ROLL_DICE_RESULT` after a victory condition is reached, the reducer computes dice rolls, updates positions, and triggers tile events on an ended match.
4. **Mitigation**: Add a guard at the top of gameplay actions (`ROLL_DICE_RESULT`, `BUY_PROPERTY`, `UPGRADE_PROPERTY`, `DOWNGRADE_PROPERTY`, `MORTGAGE_PROPERTY`, `UNMORTGAGE_PROPERTY`, `PAY_DETENTION_BAIL`, `END_TURN`):
   ```typescript
   if (state.status === 'ENDED' || state.turnPhase === 'GAME_OVER') {
     return state;
   }
   ```

### Defect 3: Off-By-One Premature Round Termination (Round 60 Never Played)
1. **Observation**: In `src/game/turn-manager/turnManager.ts` lines 49–66:
   ```typescript
   if (completedRound) {
     const postRoundWin = evaluateWinCondition(
       state.players,
       state.properties,
       newRound,
       maxRounds
     );
     if (postRoundWin.isGameOver) return { ...state, roundNumber: newRound, status: 'ENDED' };
   }
   ```
2. **Observation**: In `src/game/win-condition/winCondition.ts` line 37:
   ```typescript
   if (maxRounds && currentRound >= maxRounds) {
     // Ends game
   }
   ```
3. **Inference**: When all players complete Round 59, `completedRound` is `true`, incrementing `newRound` to `60`. Immediately, `evaluateWinCondition(..., 60, 60)` sees `currentRound >= maxRounds` (`60 >= 60`) and terminates the game with `MAX_ROUNDS_REACHED`.
4. **Impact**: Round 60 is never played; only 59 rounds take place.
5. **Mitigation**: The check should evaluate whether the match has *exceeded* the maximum rounds (`currentRound > maxRounds`), ensuring all players participate in Round 60 before final net worth evaluation.

---

## 3. Caveats

- Milestone 1 specifically targets the Core Game Engine and data layer. The 11×11 DOM board renderer and 3D CSS isometric visuals are part of Milestone 3.
- The 36 Vietnamese Chaos cards are scheduled for Milestone 2; the dispatch interface hooks are present and compatible.
- The 71 existing worker tests pass because they do not exercise `RESOLVE_DEBT` during `BANKRUPTCY_CHECK` nor actions post-game over.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 is approximately **90% complete**. The Vietnamese board layout, financial models, rent calculation matrix, and pure reducer architecture are high quality and meet specifications. However, the game engine cannot be approved into production with a broken debt-resolution flow that soft-locks the player in `BANKRUPTCY_CHECK`, nor with unprotected action handlers post-victory.

A prompt fix by the worker to resolve these 3 specific points will allow immediate APPROVE on re-verification.

---

## 5. Verification Method

To independently reproduce the failures and verify the fixes:

```powershell
# 1. Run the empirical oracle suite (passes 20/20):
npx vitest run src/game/__tests__/challenger_empirical_m1.test.ts

# 2. Run the adversarial stress suite (reproduces the 2 failing cases):
npx vitest run src/game/__tests__/adversarial_stress.test.ts

# 3. Invalidation condition for REQUEST_CHANGES:
# When Defect 1 (RESOLVE_DEBT) and Defect 2 (GAME_OVER action guard) are resolved,
# 'npx vitest run' will report 105 passed (0 failed).
```
