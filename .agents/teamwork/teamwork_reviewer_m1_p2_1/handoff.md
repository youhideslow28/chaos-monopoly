# Review Report & Adversarial Assessment: Phase 02 Milestone 1 (Ledger Engine & Economic Modifiers)

**Reviewer**: Reviewer M1-1 (Archetype: reviewer-critic)  
**Target Milestone**: Phase 02 Milestone 1 (`teamwork_worker_m1_p2`)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Baseline Test & Build Verification
1. `npx vitest run`:
   - Executed at 2026-10-31T19:05:23.
   - Result: 14 test files passed, 317 tests passed (0 failed). Duration 3.46s.
2. `npm run build`:
   - Executed `tsc && vite build`.
   - Result: 0 TypeScript errors, bundle generated in `dist/` in 8.26s.

### 1.2 Code Inspection Observations

#### Observation 1: Double-Decrement of `detentionTurns` in `turnManager.ts`
In `src/game/turn-manager/turnManager.ts`, lines 69–75:
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
In `src/game/gameReducer.ts`, lines 266–274:
```typescript
          // Non-doubles while detained
          if (activePlayer.detentionTurns > 0) {
            // Turns remaining: Remain detained, decrement counter (2 -> 1 -> 0)
            const remainingTurns = activePlayer.detentionTurns - 1;
            const updatedPlayer: PlayerState = {
              ...activePlayer,
              detentionTurns: remainingTurns,
            };
```
And in `src/game/gameReducer.ts`, lines 293–295:
```typescript
          } else {
            // Final attempt failed (detentionTurns <= 0) -> MANDATORY BAIL
            const bailCost = state.config.detentionBailCost;
```
When player is sent to detention (`inDetention: true, detentionTurns: 2`):
- **Attempt 1**: Player rolls non-doubles. `gameReducer.ts:268` decrements `detentionTurns` from 2 to 1. Player ends turn.
- Turn advances: `advanceTurn()` runs. When turn reaches this player for Attempt 2, `turnManager.ts:70-75` checks `updatedPlayer.detentionTurns === 1` and overwrites it to `0`.
- **Attempt 2**: Player rolls non-doubles. `gameReducer.ts:266` checks `activePlayer.detentionTurns > 0`, which is now `false` (value is 0). It branches directly to `else` (line 293) and **forces mandatory bail**.
- **Result**: The player only received 2 attempts, not 3.

#### Observation 2: Masking Test in `tier1_detention_start_fsm.test.ts`
In `src/game/__tests__/tier1_detention_start_fsm.test.ts`, lines 61–78:
```typescript
  it('decrements detentionTurns sequentially on non-doubles across turns', () => {
    let state = setup2PGame();
    state.players[0].inDetention = true;
    state.players[0].detentionTurns = 2;
    state.players[0].position = 10;

    // Turn 1: roll non-doubles [1, 2]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [1, 2] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(1);
    expect(state.players[0].position).toBe(10);

    // Turn 2: roll non-doubles [2, 3]
    state = gameReducer(state, { type: 'ROLL_DICE_RESULT', dice: [2, 3] });
    expect(state.players[0].inDetention).toBe(true);
    expect(state.players[0].detentionTurns).toBe(0);
    expect(state.players[0].position).toBe(10);
  });
```
The test dispatched `ROLL_DICE_RESULT` back-to-back on Player 0 without calling `END_TURN` or `advanceTurn()`. The test in lines 32–43 (`preserves detentionTurns across advanceTurn`) only tested `detentionTurns === 2`, where `detentionTurns === 1` was false. Neither test exercised `advanceTurn` when `detentionTurns === 1`.

#### Observation 3: Chaos Engine Completely Bypasses Central Ledger
In `src/game/chaos-engine/chaosEngine.ts`, line 15:
```typescript
import { executeCashTransaction, calculatePlayerNetWorth } from '../economy/economyEngine';
```
`executeLedgerTransaction` is not imported or called anywhere in `chaosEngine.ts`.
In `src/game/types/index.ts`, line 204 defines:
```typescript
  | 'CHAOS_EFFECT'         // Cash injection or deduction triggered by Chaos card
```
Yet in `chaosEngine.ts`:
- `CASH_SELF` (lines 217, 223) calls legacy `executeCashTransaction` or mutates `player.cash` directly.
- `CASH_ALL` (line 249) calls legacy `executeCashTransaction`.
- `CASH_STEAL` (lines 271, 284, 289) mutates `cash` directly.
- `REDISTRIBUTE_WEALTH` (lines 486, 489) mutates `cash` directly.
- `DESPERATION_GAMBLE` / `CASINO_GAMBLE` (lines 518, 525) mutates `cash` directly.
- `HOSTILE_TAKEOVER` (lines 575, 576, 584) mutates `cash` directly.
- `TELEPORT` (line 305, 321) mutates `cash` directly.

None of these operations create a `LedgerEntry`, none update `state.ledger` or `state.ledgerHistory`, and none emit `CHAOS_EFFECT`.

#### Observation 4: Money Conservation Violation in `CASH_STEAL`
In `src/game/chaos-engine/chaosEngine.ts`, lines 278–292:
```typescript
      } else {
        const giftAmount = Math.abs(value);
        let count = 0;
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === state.activePlayerIndex || p.isBankrupt) return p;
          count++;
          return { ...p, cash: p.cash + giftAmount };
        });
        const totalGift = giftAmount * count;
        updatedPlayers[state.activePlayerIndex] = {
          ...activePlayer,
          cash: Math.max(0, activePlayer.cash - totalGift),
        };
        logMsg += ` -> Hào phóng tặng mỗi đối thủ $${giftAmount}M!`;
      }
```
If an active player has $50M cash and plays a card giving $100M to 3 opponents (`totalGift = $300M`):
- Opponents receive $100M * 3 = +$300M cash.
- Active player's cash drops from $50M to $0M (loss of $50M).
- Total money supply across players increases by +$250M out of thin air, with no bank debits or ledger tracking.

#### Observation 5: Inconsistency in Worker Handoff Report Categories
Worker M1's handoff states:
> "Full double-entry atomic ledger with 13 transaction categories (`PROPERTY_PURCHASE`, `PROPERTY_UPGRADE`, `PROPERTY_DOWNGRADE`, `MORTGAGE_PAYOUT`, `UNMORTGAGE_PAYMENT`, `RENT_PAYMENT`, `TAX_PAYMENT`, `SALARY_START`, `BAIL_PAYMENT`, `CHAOS_REWARD`, `CHAOS_PENALTY`, `DEBT_SETTLEMENT`, `BANKRUPTCY_TRANSFER`)."

However, `src/game/types/index.ts` lines 192–206 defines:
`SALARY_START`, `RENT_PAYMENT`, `PROPERTY_PURCHASE`, `PROPERTY_UPGRADE`, `PROPERTY_DOWNGRADE`, `PROPERTY_MORTGAGE`, `PROPERTY_UNMORTGAGE`, `TAX_PAYMENT`, `BAIL_PAYMENT`, `AUCTION_WIN`, `TRADE_CASH`, `CHAOS_EFFECT`, `DEBT_SETTLEMENT`.

The code in `types/index.ts` matches `PROJECT.md` correctly, but the worker's report claimed non-existent categories (`CHAOS_REWARD`, `CHAOS_PENALTY`, `MORTGAGE_PAYOUT`, `UNMORTGAGE_PAYMENT`, `BANKRUPTCY_TRANSFER`).

---

## 2. Logic Chain

1. **Premature Jail Ejection**:
   - By specification (PROJECT.md line 27 and handoff.md Section 2.4), a detained player is entitled to up to 3 roll attempts before mandatory bail is enforced.
   - Initializing `detentionTurns: 2` represents 3 turns (Attempt 1 at 2, Attempt 2 at 1, Attempt 3 at 0).
   - In `gameReducer.ts`, each failed roll decrements `detentionTurns` by 1.
   - However, in `turnManager.ts:70-75`, `advanceTurn()` actively checks `if (updatedPlayer.detentionTurns === 1) updatedPlayer.detentionTurns = 0;`.
   - Therefore, after Attempt 1, `detentionTurns` is 1. When turn rotates back to the player, `advanceTurn()` immediately drops it to 0 before the player even rolls for Attempt 2.
   - On Attempt 2, `gameReducer.ts` sees `detentionTurns <= 0` and immediately executes mandatory bail.
   - The player gets only 2 roll attempts instead of 3.
   - The test suite masked this because `tier1_detention_start_fsm.test.ts` bypassed `advanceTurn()` between rolls.

2. **Ledger Integrity & Zero Leaks Violation**:
   - PROJECT.md Feature 1 mandates: "Centralized transaction handling... Server-independent deterministic game calculations... Validated balance changes... Transaction history."
   - Category `CHAOS_EFFECT` was added to `TransactionCategory` specifically to record financial Chaos events into the double-entry ledger.
   - Because `chaosEngine.ts` was left untouched and continues to mutate player balances via legacy functions without emitting `LedgerEntry` records:
     a) `state.ledger` and `state.ledgerHistory` have no record of Chaos financial events.
     b) Calling `verifyLedgerAudit()` on any game that triggers cash Chaos events immediately reports discrepancies and fails validation.
     c) The negative `CASH_STEAL` branch creates phantom money when debtor cash is less than `totalGift`, directly violating the money conservation invariant.

---

## 3. Caveats

1. `src/game/economy/economicModifiers.ts` is mathematically sound and well-tested: all 10 Chaos Modifiers are correctly calculated and tested with 100% backward compatibility when modifiers are absent.
2. `src/game/economy/ledgerEngine.ts` correctly implements double-entry bookkeeping, monotonic sequence generation, balance before/after tracking, and `assertMoneyConservation` for the transactions routed through it.
3. Property transactions (`PROPERTY_PURCHASE`, `PROPERTY_UPGRADE`, `PROPERTY_DOWNGRADE`, `PROPERTY_MORTGAGE`, `PROPERTY_UNMORTGAGE`), rent (`RENT_PAYMENT`), taxes (`TAX_PAYMENT`), start salary (`SALARY_START`), and bail (`BAIL_PAYMENT`) are properly routed through `executeLedgerTransaction` in `gameReducer.ts`.
4. The remaining issues are localized to:
   - `src/game/turn-manager/turnManager.ts` (removal of lines 70–75)
   - `src/game/chaos-engine/chaosEngine.ts` (routing cash modifications through `executeLedgerTransaction` with `category: 'CHAOS_EFFECT'`)
   - `src/game/__tests__/tier1_detention_start_fsm.test.ts` (adding full turn-rotation test for 3 attempts)

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 cannot be approved in its current state due to:
1. **Critical Defect (Detention FSM)**: `turnManager.ts:70-75` double-decrements `detentionTurns` from 1 to 0 during turn rotation, depriving players of their 3rd detention attempt and forcing mandatory bail on Turn 2.
2. **Critical Defect (Ledger Completeness & Money Conservation)**: `chaosEngine.ts` bypasses the centralized ledger engine entirely, failing to emit `CHAOS_EFFECT` entries, invalidating `verifyLedgerAudit()`, and allowing unbacked money creation in `CASH_STEAL`.
3. **Integrity / Test Facade**: `tier1_detention_start_fsm.test.ts` called `ROLL_DICE_RESULT` back-to-back without advancing turns, masking the rotation bug.

### Required Changes for Worker M1:
1. **Fix `src/game/turn-manager/turnManager.ts`**: Remove the extraneous block:
   ```typescript
   if (updatedPlayer.inDetention && updatedPlayer.detentionTurns === 1) {
     updatedPlayer = {
       ...updatedPlayer,
       detentionTurns: 0,
     };
   }
   ```
   Allow `detentionTurns` to be managed exclusively by the reducer upon roll attempts.
2. **Wire Chaos cash effects to Central Ledger in `src/game/chaos-engine/chaosEngine.ts`**:
   - Route `CASH_SELF`, `CASH_ALL`, `CASH_STEAL`, `REDISTRIBUTE_WEALTH`, `DESPERATION_GAMBLE`, `CASINO_GAMBLE`, `HOSTILE_TAKEOVER`, and `TELEPORT` Start salary through `executeLedgerTransaction` (or update `state.ledger` accordingly) with category `CHAOS_EFFECT` or `SALARY_START`.
   - In `CASH_STEAL` (gift branch), clamp total gift to `activePlayer.cash` so no phantom money is minted.
3. **Add end-to-end multi-turn test in `tier1_detention_start_fsm.test.ts`**:
   - Verify 3 distinct roll attempts with `advanceTurn()` between turns:
     - Turn 1: non-doubles -> remains in jail (`detentionTurns = 1`).
     - Turn 2: non-doubles -> remains in jail (`detentionTurns = 0`).
     - Turn 3: non-doubles -> mandatory bail paid and moved by dice sum.
4. **Add audit test for Chaos ledger integration**:
   - Verify that executing Chaos cash events produces valid `LedgerEntry` records with category `CHAOS_EFFECT` and passes `verifyLedgerAudit()`.

---

## 5. Verification Method

To reproduce and verify these findings independently:

### Verification 1: Reproduce Detention Double-Decrement Bug
Inspect `src/game/turn-manager/turnManager.ts` lines 70–75. Run a trace where Player 1 in detention rolls non-doubles on Attempt 1, dispatches `END_TURN`, and observes `detentionTurns` dropping from 1 to 0 before Attempt 2 begins.

### Verification 2: Verify Absence of `CHAOS_EFFECT` in Codebase
Run:
```powershell
rg "category: 'CHAOS_EFFECT'" src/
```
Expected result: 0 matches found in any runtime code (`gameReducer.ts`, `chaosEngine.ts`, `economyEngine.ts`).

### Verification 3: Verify Test Suite
Run:
```powershell
npx vitest run
npm run build
```
Note that existing tests pass because `tier1_detention_start_fsm.test.ts` skipped `END_TURN` / `advanceTurn()`, proving the tests were self-certifying against the full turn cycle.
