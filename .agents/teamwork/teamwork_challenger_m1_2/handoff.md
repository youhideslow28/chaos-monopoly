# Empirical Stress Report & Handoff — Milestone 1 (M1)

**Agent**: `teamwork_challenger_m1_2` (critic / specialist)  
**Date**: 2026-10-31  
**Milestone**: Milestone 1 (M1) — Core Game Engine & 40-Tile Board  
**Status**: COMPLETE  
**Explicit Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct observations and verbatim test execution outputs across the core game engine codebase:

### 1.1 Baseline Build & Test Execution
- **Command**: `npm run build` (`tsc && vite build`)
  - **Result**: PASSED in 11.26s.
  - 2,080 modules transformed into `dist/` (JS bundle 276.65 kB, CSS 39.55 kB). Exit code: 0.
- **Command**: `npm test` (`vitest run`)
  - **Baseline Result**: 5 test files passed (71/71 tests).

### 1.2 Adversarial Empirical Stress Test Suite (`src/game/__tests__/adversarial_stress.test.ts`)
A comprehensive adversarial stress test suite was created and executed via `npx vitest run src/game/__tests__/adversarial_stress.test.ts`. Out of 16 tests, 12 passed and 4 failed with critical reproducible errors:

#### Defect 1: `RESOLVE_DEBT` is Unusable Due to Phase Mismatch (`BANKRUPTCY_CHECK` vs `DEBT_LIQUIDATION`)
- **Code Observation**:
  - In `src/game/gameReducer.ts` (lines 810 and 882):
    When a player encounters rent or tax exceeding cash, `state.turnPhase` is set to `'BANKRUPTCY_CHECK'`:
    ```typescript
    // line 882
    turnPhase: 'BANKRUPTCY_CHECK',
    pendingDebt: { creditorPlayerId: owner.id, amount: rentAmount - actualPaid, ... }
    ```
  - In `src/game/gameReducer.ts` (line 530):
    Action `RESOLVE_DEBT` strictly requires `DEBT_LIQUIDATION`:
    ```typescript
    case 'RESOLVE_DEBT': {
      if (state.turnPhase !== 'DEBT_LIQUIDATION' || !state.pendingDebt) {
        return state;
      }
    ```
  - Grep search reveals `turnPhase` is **never** set to `'DEBT_LIQUIDATION'` anywhere in the codebase.
- **Verbatim Test Failure**:
  ```
  FAIL src/game/__tests__/adversarial_stress.test.ts > 2. Debt Liquidation Under Creditor Claims > tests whether RESOLVE_DEBT can be executed when in BANKRUPTCY_CHECK phase after raising funds
  AssertionError: expected { creditorPlayerId: 'player-2', amount: 100, reason: 'Rent debt' } to be null
  ```
- **Consequence**: When a player in debt liquidates assets (mortgages properties or downgrades buildings) and raises sufficient cash, dispatching `RESOLVE_DEBT` is rejected as a no-op. The player cannot pay off debt and is permanently locked in bankruptcy check.

#### Defect 2: Reducer Allows State Mutation and Movement After `GAME_OVER`
- **Code Observation**:
  - In `src/game/gameReducer.ts` (line 110):
    Action `ROLL_DICE_RESULT` has no guard for `state.status === 'ENDED'` or `state.turnPhase === 'GAME_OVER'`:
    ```typescript
    case 'ROLL_DICE_RESULT': {
      const activePlayer = state.players[state.activePlayerIndex];
      if (!activePlayer || activePlayer.isBankrupt) return state;
    ```
- **Verbatim Test Failure**:
  ```
  FAIL src/game/__tests__/adversarial_stress.test.ts > 4. 60-Round Match Conclusion and Net Worth Tie-Breaker > tests state immutability and guard against actions after GAME_OVER
  AssertionError: expected 5 to be +0
  ```
- **Consequence**: After a match is ended and a winner declared, players can continue rolling dice, moving around the board, and altering state.

#### Defect 3: Bankrupt Player's Remaining Cash Vanishes Instead of Transferring to Creditor
- **Code Observation**:
  - In `src/game/gameReducer.ts` (lines 659–661):
    ```typescript
    const updatedPlayers = state.players.map(p =>
      p.id === action.playerId ? { ...p, isBankrupt: true, cash: 0 } : p
    );
    ```
  - In `src/game/economy/economyEngine.ts` (line 110): `liquidateBankruptPlayer` only transfers properties; it does not transfer cash.
  - If a player had cash (e.g., $350k raised via mortgaging in an attempt to pay a $1,000k debt) and then declares bankruptcy to a creditor, their cash is set to 0, but the creditor never receives it.
- **Verbatim Test Failure**:
  ```
  FAIL src/game/__tests__/adversarial_stress.test.ts > 4. 60-Round Match Conclusion and Net Worth Tie-Breaker > tests whether bankrupt player remaining cash is transferred to creditor
  AssertionError: expected 1500 to be 1850 // Creditor cash remained 1500 instead of 1500 + 350
  ```
- **Consequence**: Violates Spec 3.6 ("Toàn bộ tiền mặt còn lại và tất cả bất động sản được chuyển nhượng cho chủ nợ") and causes money leakage from the economy.

#### Defect 4: `GO_TO_DETENTION` Chaos Card Teleports to Tile 6 (Vũng Tàu) Instead of Tile 10 (Detention)
- **Code Observation**:
  - In `src/game/chaos-engine/chaosEngine.ts` (line 89):
    ```typescript
    case 'GO_TO_DETENTION': {
      updatedPlayers[state.activePlayerIndex] = {
        ...activePlayer,
        position: 6, // Detention tile (legacy 24-tile board index!)
        inDetention: true,
        detentionTurns: 2,
      };
    ```
  - On the 40-tile Vietnamese board, Tile 10 is Detention (Khu Cách Ly Tạm Giam). Tile 6 is `Bãi Sau Vũng Tàu`.
- **Verbatim Test Failure**:
  ```
  FAIL src/game/__tests__/adversarial_stress.test.ts > 5. Chaos Engine Tile Mapping & Flakiness Oracles > verifies GO_TO_DETENTION chaos card sends player to Tile 10, not Tile 6
  AssertionError: expected 6 to be 10
  ```

#### Defect 5: 60-Round Termination Prematurely Cuts Off Match at 59 Rounds
- **Code Observation**:
  - In `src/game/turn-manager/turnManager.ts` (lines 46–54):
    ```typescript
    const newRound = completedRound ? state.roundNumber + 1 : state.roundNumber;
    if (completedRound) {
      const postRoundWin = evaluateWinCondition(state.players, state.properties, newRound, maxRounds);
      if (postRoundWin.isGameOver) return { ...state, roundNumber: newRound, status: 'ENDED', ... };
    }
    ```
  - In `src/game/win-condition/winCondition.ts` (line 37):
    ```typescript
    if (maxRounds && currentRound >= maxRounds) { ... }
    ```
  - When Round 59 completes, `completedRound` increments `newRound` to 60. `60 >= 60` evaluates to true immediately, terminating the game at the start of Round 60 before any player can take a turn.
- **Consequence**: In a 60-round game, only 59 rounds are ever played. In a 3-round game, only 2 rounds are played.

#### Defect 6: Non-Deterministic PRNG in `drawRandomChaosCard()` Causes Intermittent Test Flakiness
- **Code Observation**:
  - In `src/game/chaos-engine/chaosEngine.ts` (line 7):
    ```typescript
    export function drawRandomChaosCard(): ChaosCard {
      const index = Math.floor(Math.random() * CHAOS_CARDS.length);
      return CHAOS_CARDS[index];
    }
    ```
  - In `src/game/__tests__/tier4_match_scenarios.test.ts` (line 54):
    When player lands on Tile 7 (Chaos α), `drawRandomChaosCard()` randomly draws `quantum-warp-start` (teleporting player to Tile 0). Line 55 asserts `expect(state.players[0].position).toBe(7)`, which fails intermittently:
    ```
    FAIL src/game/__tests__/tier4_match_scenarios.test.ts > 1. 2-Player Full Match Simulation > expected +0 to be 7
    ```
  - Violates PROJECT.md Requirement 15 ("Deterministic, seedable PRNG for Chaos").

---

## 2. Logic Chain

1. **Premise 1**: The Milestone 1 objective requires verified debt liquidation under creditor claims, invariant preservation (no negative cash, correct asset/cash transfer), 3 consecutive doubles jail transition, turn rotation across 2/3/4 players, and 60-round match conclusion with net worth tie-breaking.
2. **Observation 1**: The 3 consecutive doubles mechanic is implemented correctly: the 3rd double suppresses movement, sets position to 10 with `inDetention: true`, resets `consecutiveDoubles` to 0, revokes `isDouble`, and transitions turn to the next player.
3. **Observation 2**: Turn rotation across 2, 3, and 4 players correctly skips bankrupt players and increments round numbers upon complete cycles.
4. **Observation 3**: Net worth calculation (`Cash + Base + Upgrades - Mortgages`) and secondary tie-breaking by cash balance are mathematically accurate and pass all tests.
5. **Observation 4**: In `gameReducer.ts:530`, `RESOLVE_DEBT` checks `state.turnPhase !== 'DEBT_LIQUIDATION'`, while `gameReducer.ts:810, 882` sets `turnPhase` to `'BANKRUPTCY_CHECK'`. Because `'DEBT_LIQUIDATION'` is never set, `RESOLVE_DEBT` is dead code that always aborts.
6. **Observation 5**: In `gameReducer.ts:660`, `DECLARE_BANKRUPTCY` resets player cash to 0 without adding it to the creditor's balance, causing funds to vanish.
7. **Observation 6**: In `gameReducer.ts:110`, missing game-over guards permit actions after match conclusion.
8. **Observation 7**: In `chaosEngine.ts:89`, `GO_TO_DETENTION` targets legacy Tile 6 instead of Tile 10.
9. **Observation 8**: In `winCondition.ts:37`, `currentRound >= maxRounds` evaluates on `newRound` right after Round 59 ends, truncating the 60th round.
10. **Inference**: While the 40-tile board geometry, dice engine, property rent tiers, and turn rotations are solid, the defects in debt resolution, creditor cash absorption, game-over guards, round termination, and tile mapping directly impact core game invariants.
11. **Conclusion**: Milestone 1 requires targeted remediation before advancing to Milestone 2.

---

## 3. Caveats

- Presentation layer (BoardView 11x11 rendering) and procedural audio synthesis are assigned to Milestone 3 and were not tested here.
- The 36-card Chaos deck catalog and PRNG seeding are assigned to Milestone 2; however, the preliminary Chaos card logic integrated into Milestone 1 directly introduced flakiness and the Tile 6 detention bug.
- Baseline `npm test` previously passed with 71/71 tests only because the existing tests did not attempt to call `RESOLVE_DEBT` after raising funds or test post-game action rejection.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 shows high-quality architectural design, rigorous 40-tile board geometry, and excellent rent math. However, the Worker must resolve the following 6 specific defects before M1 can be approved:

1. **Fix `RESOLVE_DEBT` Phase Mismatch**: Allow `RESOLVE_DEBT` when `state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION'`.
2. **Add Game Over Guard**: At the top of `gameReducer` (or in each action handler), return `state` unchanged if `state.status === 'ENDED' || state.turnPhase === 'GAME_OVER'` (except for `RESTART_GAME`).
3. **Transfer Remaining Cash to Creditor on Bankruptcy**: In `DECLARE_BANKRUPTCY`, if `creditorId` is present and `targetPlayer.cash > 0`, transfer `targetPlayer.cash` to `creditor.cash`.
4. **Fix Detention Card Tile Index**: In `chaosEngine.ts:89`, update `position: 6` to `position: 10`.
5. **Fix Round Cap Termination**: In `turnManager.ts:50` / `winCondition.ts:37`, ensure all players can play Round 60 before the match is declared over (i.e. check `newRound > maxRounds` after a completed round).
6. **Eliminate Flakiness in `tier4_match_scenarios.test.ts`**: Avoid landing on Chaos tiles with random teleports during deterministic scenario tests, or mock `drawRandomChaosCard`.

---

## 5. Verification Method

To independently reproduce all findings and verify future fixes:

```powershell
# 1. Run the empirical adversarial stress test suite
npx vitest run src/game/__tests__/adversarial_stress.test.ts

# 2. Run the full test suite
npm test

# 3. Verify production compilation
npm run build
```

Expected result after remediation:
- All 16 tests in `src/game/__tests__/adversarial_stress.test.ts` PASS.
- All tests across all test files PASS (100% pass rate).
- Production build succeeds with 0 errors.
