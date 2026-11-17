# Milestone 1 Architecture Strategy Report: Central Ledger Engine & Solvency Architecture

- **Author**: Explorer M1-1 (`teamwork_explorer_m1_1`)
- **Date**: 2026-10-31
- **Working Directory**: `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_m1_1`
- **Target Audience**: Orchestrator (`orchestrator_p2`), Worker M1-1 (Implementation), QA Engineers
- **Status**: Complete & Verified (Read-Only Architectural Blueprint)

---

## 1. Observation

A forensic examination of the existing codebase (`src/game/economy/economyEngine.ts`, `src/game/gameReducer.ts`, `src/game/types/index.ts`, and `src/game/__tests__/`) revealed the following concrete observations:

### 1.1 Existing Economy Subsystem Deficiencies (`src/game/economy/economyEngine.ts`)
1. **Ad-hoc mutation helper without strict invariant protection**:
   In `src/game/economy/economyEngine.ts` (lines 33–48):
   ```typescript
   export function executeCashTransaction(
     player: PlayerState,
     amount: number
   ): {
     updatedPlayer: PlayerState;
     isSolvent: boolean;
   } {
     const newCash = player.cash + amount;
     return {
       updatedPlayer: { ...player, cash: newCash },
       isSolvent: newCash >= 0,
     };
   }
   ```
   *Observation*: `executeCashTransaction` allows `newCash` to become negative in the returned `updatedPlayer` without rejection; it only flags `isSolvent: false`.

2. **Pollution of rent statistics across all cash transfers**:
   In `src/game/economy/economyEngine.ts` (lines 50–79):
   ```typescript
   export function transferCash(
     fromPlayer: PlayerState,
     toPlayer: PlayerState,
     amount: number
   ): { ... } {
     const actualPaid = Math.min(fromPlayer.cash, amount);
     return {
       fromPlayerUpdated: {
         ...fromPlayer,
         cash: Math.max(0, fromPlayer.cash - amount),
         stats: {
           ...fromPlayer.stats,
           rentPaid: fromPlayer.stats.rentPaid + actualPaid, // <-- HARDCODED RENT STAT
         },
       },
       toPlayerUpdated: {
         ...toPlayer,
         cash: toPlayer.cash + actualPaid,
         stats: {
           ...toPlayer.stats,
           rentCollected: toPlayer.stats.rentCollected + actualPaid, // <-- HARDCODED RENT STAT
         },
       },
       actualPaid,
     };
   }
   ```
   *Observation*: Every cash transfer executed via `transferCash` unconditionally increments `stats.rentPaid` on `fromPlayer` and `stats.rentCollected` on `toPlayer`. If used for debt settlements, auctions, or bilateral trades, it falsely inflates rent stats.

### 1.2 Disparate Ad-Hoc Cash Mutations across `src/game/gameReducer.ts`
Direct inspection of `src/game/gameReducer.ts` reveals 10 separate code locations performing direct mathematical mutations on `player.cash` without entering a centralized ledger or generating audit entries:
1. **Line 241 (`ROLL_DICE_RESULT` Start tile salary)**:
   `cash: activePlayer.cash + earnedSalary`
2. **Line 299 (`BUY_PROPERTY`)**:
   `cash: activePlayer.cash - price`
3. **Line 356 (`UPGRADE_PROPERTY`)**:
   `cash: activePlayer.cash - cost`
4. **Line 411 (`DOWNGRADE_PROPERTY`)**:
   `cash: activePlayer.cash + refund`
5. **Line 461 (`MORTGAGE_PROPERTY`)**:
   `cash: activePlayer.cash + mortgageVal`
6. **Line 511 (`UNMORTGAGE_PROPERTY`)**:
   `cash: activePlayer.cash - cost`
7. **Lines 562–577 (`RESOLVE_DEBT`)**:
   `transferCash(activePlayer, creditor, debt.amount)` or `cash: activePlayer.cash - debt.amount`
8. **Line 609 (`PAY_DETENTION_BAIL`)**:
   `cash: activePlayer.cash - bailCost`
9. **Line 689 (`DECLARE_BANKRUPTCY`)**:
   `cash: p.cash + remainingCash`
10. **Lines 810, 834, 885 (`resolveLandingTile` TAX & RENT)**:
    `cash: activePlayer.cash - taxAmount` (line 810), `cash: 0` (line 834), and `transferCash(activePlayer, owner, rentAmount)` (line 885).

### 1.3 Inflexible All-or-Nothing Debt Liquidation Check
In `src/game/gameReducer.ts` (lines 545–556):
```typescript
case 'RESOLVE_DEBT': {
  if ((state.turnPhase !== 'DEBT_LIQUIDATION' && state.turnPhase !== 'BANKRUPTCY_CHECK') || !state.pendingDebt) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const debt = state.pendingDebt;

  if (activePlayer.cash < debt.amount) {
    return state; // <-- STRICT REJECTION OF PARTIAL SETTLEMENT
  }
  ...
```
*Observation*: If an indebted player owes $500k, has $50k in liquid cash, and mortgages a property to raise $200k (total cash = $250k), they cannot pay the $250k towards reducing the debt to $250k. The reducer completely rejects `RESOLVE_DEBT` unless `cash >= debt.amount` in full.

### 1.4 Missing Ledger and Invariant Types in `src/game/types/index.ts`
1. `TransactionCategory` is not yet declared in `src/game/types/index.ts`.
2. `LedgerEntry` and `LedgerResult` are not yet declared.
3. `GameState` (lines 228–245) does not contain a `ledger?: LedgerEntry[]` field.
4. `PendingDebt` (lines 191–195) only has `{ creditorPlayerId, amount, reason }` without a `category?: TransactionCategory` to know the provenance of the debt for statistics attribution.

### 1.5 Baseline Test Health
Running `npm test` executes Vitest across 9 test files:
- All 149 tests pass in 3.29s.
- `src/game/__tests__/tier1_features.test.ts:258–259` and `src/game/__tests__/tier2_boundaries.test.ts:78` test `transferCash` asserting `stats.rentPaid` and `stats.rentCollected`. Backward compatibility for existing helper functions must be strictly maintained.

---

## 2. Logic Chain

1. **Premise**: In any multiplayer economic game, money must be strictly conserved; cash cannot disappear or appear without an audit trail, and player cash must never become negative ($P.\text{cash} \ge 0$).
2. **Observation Connection**: The current implementation has 10 scattered cash mutations across `gameReducer.ts` (Observation 1.2), zero double-entry ledger tracking, and an `executeCashTransaction` that returns negative cash without rolling back or blocking (Observation 1.1).
3. **Risk**: As auctions and trading are integrated in Milestone 2, having uncentralized balance mutations will inevitably create cash creation bugs, desynchronization, and broken replays.
4. **Stats Corruption Mechanism**: `transferCash` unconditionally writes to `rentPaid` and `rentCollected` (Observation 1.1). If used for debt settlements from taxes or bail or bilateral trading, player post-game stats are corrupted.
5. **Debt Deadlock Mechanism**: Because line 553 of `gameReducer.ts` demands `activePlayer.cash >= debt.amount` (Observation 1.3), players in `DEBT_LIQUIDATION` who raise partial funds cannot pay down their obligation progressively. This forces players to either mortgage/sell everything in one turn or be blocked from partially settling with creditors.
6. **Solution**:
   - Introduce `src/game/economy/ledgerEngine.ts` as the single authoritative source of truth for all financial transactions.
   - Implement the 13 required typed `TransactionCategory` values.
   - Enforce the non-negative cash invariant and money conservation proof.
   - Support incremental partial debt repayment (`SETTLE_PARTIAL_DEBT` / progressive `RESOLVE_DEBT`).
   - Replace all 10 ad-hoc cash mutations in `gameReducer.ts` with clean `executeLedgerTransaction` invocations while retaining `transferCash` in `economyEngine.ts` for legacy compatibility.

---

## 3. Caveats

1. **Read-Only Scope**: This report is purely architectural. No production code in `src/` has been modified during this turn.
2. **Legacy Test Compatibility**: Existing tests in `tier1_features.test.ts` and `tier2_boundaries.test.ts` call `transferCash(p1, p2, 100)` directly and check `stats.rentPaid`. The implementation worker must keep `transferCash` exported in `economyEngine.ts` (it can either remain as a legacy wrapper or delegate to the ledger with category `'RENT_PAYMENT'`).
3. **Chaos Engine Refactoring Boundary**: `src/game/chaos-engine/chaosEngine.ts` has internal cash modifications (lines 222, 257, 271, 305, etc.). For Milestone 1, the primary requirement is centralizing `gameReducer.ts` and establishing `ledgerEngine.ts`. The worker can either route chaos cash effects through the ledger via a helper or dispatch `'APPLY_CHAOS_EFFECT'` with ledger calls.
4. **Performance**: In-memory array appending for `ledger` (`state.ledger.push(entry)`) has $O(1)$ amortized cost and negligible memory overhead for matches up to 45–60 rounds (approx. 200–400 transactions total).

---

## 4. Conclusion & Architectural Specifications

### 4.1 Domain Schema & Data Models (`src/game/types/index.ts` & `src/game/economy/ledgerEngine.ts`)

#### 4.1.1 Typed `TransactionCategory` (Exact 13 Types)
```typescript
export type TransactionCategory =
  | 'SALARY_START'         // Passing or landing on START / GO tile (+200k or Golden Hour +400k)
  | 'RENT_PAYMENT'         // Rent transferred between players for landing on improved/unimproved property
  | 'PROPERTY_PURCHASE'    // List price paid to Bank to acquire unowned property
  | 'PROPERTY_UPGRADE'     // Construction cost paid to Bank (1★ to 5★ Landmark)
  | 'PROPERTY_DOWNGRADE'   // Demolition refund (50%) credited from Bank
  | 'PROPERTY_MORTGAGE'    // Mortgage loan (50% or 75% subsidized) credited from Bank
  | 'PROPERTY_UNMORTGAGE'  // Repayment of mortgage (+10% or +20% interest) paid to Bank
  | 'TAX_PAYMENT'          // Income/Luxury tax paid to Bank
  | 'BAIL_PAYMENT'         // Detention bail fee ($100k) paid to Bank
  | 'AUCTION_WIN'          // Highest bid paid to Bank to acquire auctioned deed
  | 'TRADE_CASH'           // Cash transferred between players in bilateral trade
  | 'CHAOS_EFFECT'         // Cash injection or deduction triggered by Chaos card
  | 'DEBT_SETTLEMENT';     // Full or partial liquidation payment to creditor or Bank
```

#### 4.1.2 Ledger Entry & Result Interfaces
```typescript
export type LedgerParty = PlayerId | 'BANK';

export interface LedgerEntry {
  id: string;               // Format: `tx-${timestamp}-${sequence}`
  sequence: number;         // Monotonically increasing sequence number (1, 2, 3...)
  timestamp: number;        // UTC epoch millis
  roundNumber: number;      // Current round in GameState
  category: TransactionCategory;
  fromPlayerId: LedgerParty;
  toPlayerId: LedgerParty;
  amount: number;           // Absolute cash transferred (> 0)
  tileId?: TileId;          // Associated board tile (for rent, property purchase, tax)
  balanceBefore: {
    from?: number;          // Undefined if 'BANK'
    to?: number;            // Undefined if 'BANK'
  };
  balanceAfter: {
    from?: number;          // Undefined if 'BANK'
    to?: number;            // Undefined if 'BANK'
  };
  memo: string;             // Descriptive Vietnamese audit log
}

export interface ExecuteTransactionParams {
  category: TransactionCategory;
  from: LedgerParty;
  to: LedgerParty;
  amount: number;
  roundNumber: number;
  tileId?: TileId;
  memo: string;
  allowPartial?: boolean;             // If true, pays up to fromPlayer.cash without failing
  debtCategory?: TransactionCategory; // For DEBT_SETTLEMENT stats attribution (e.g. 'RENT_PAYMENT')
}

export interface LedgerResult {
  success: boolean;
  entry: LedgerEntry | null;
  error?: 'INSUFFICIENT_FUNDS' | 'INVALID_AMOUNT' | 'IDENTICAL_PARTIES' | 'PLAYER_NOT_FOUND' | 'PLAYER_BANKRUPT';
  newPlayers: PlayerState[];
  actualPaid: number;       // Amount actually moved (== amount if solvent, < amount if partial)
  shortfall: number;        // amount - actualPaid (0 if solvent)
}
```

#### 4.1.3 Updates to `PendingDebt`, `GameState`, and `GameAction` in `src/game/types/index.ts`
```typescript
export interface PendingDebt {
  creditorPlayerId: PlayerId | null; // null = Bank/Tax/Chaos
  amount: number;
  reason: string;
  category?: TransactionCategory;   // 'RENT_PAYMENT' | 'TAX_PAYMENT' | 'CHAOS_EFFECT'
}

export interface GameState {
  // ... existing fields ...
  ledger?: LedgerEntry[];            // Centralized transaction ledger audit history
}

export type GameAction =
  // ... existing actions ...
  | { type: 'SETTLE_PARTIAL_DEBT'; amount?: number } // Partial debt liquidation
  // ...
```

---

### 4.2 Centralized Ledger Engine Implementation (`src/game/economy/ledgerEngine.ts`)

#### 4.2.1 Core Function Signatures
```typescript
/**
 * Executes an atomic, double-entry financial transaction:
 * - Enforces non-negative cash invariant (payer cash >= 0)
 * - Enforces money conservation
 * - Updates player financial stats with zero cross-category pollution
 * - Emits an immutable LedgerEntry
 */
export function executeLedgerTransaction(
  players: PlayerState[],
  params: ExecuteTransactionParams,
  ledgerHistory: LedgerEntry[] = []
): LedgerResult;

/**
 * Validates money conservation across the transaction.
 * Throws an Error if delta sum of player balances does not match Bank transaction direction.
 */
export function assertMoneyConservation(
  beforePlayers: PlayerState[],
  afterPlayers: PlayerState[],
  entry: LedgerEntry
): void;

/**
 * Forensically verifies the entire match ledger against initial cash and current balances.
 */
export function verifyLedgerAudit(
  initialCash: number,
  currentPlayers: PlayerState[],
  ledger: LedgerEntry[]
): {
  isValid: boolean;
  discrepancies: string[];
};

/**
 * Returns available liquid cash for a player, clamped to minimum 0.
 */
export function getPlayerLiquidCash(player: PlayerState): number;
```

#### 4.2.2 Algorithmic Implementation Details
```typescript
let globalTxSequence = 1;

export function executeLedgerTransaction(
  players: PlayerState[],
  params: ExecuteTransactionParams,
  ledgerHistory: LedgerEntry[] = []
): LedgerResult {
  const { category, from, to, roundNumber, tileId, memo, allowPartial, debtCategory } = params;
  const requestedAmount = Math.floor(params.amount);

  // 1. Validation checks
  if (requestedAmount < 0 || !Number.isFinite(requestedAmount)) {
    return {
      success: false,
      entry: null,
      error: 'INVALID_AMOUNT',
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0,
    };
  }

  if (from === to) {
    return {
      success: false,
      entry: null,
      error: 'IDENTICAL_PARTIES',
      newPlayers: players,
      actualPaid: 0,
      shortfall: 0,
    };
  }

  // 2. Identify and check payer
  let fromPlayer: PlayerState | undefined;
  let fromBalanceBefore: number | undefined;

  if (from !== 'BANK') {
    fromPlayer = players.find(p => p.id === from);
    if (!fromPlayer) {
      return { success: false, entry: null, error: 'PLAYER_NOT_FOUND', newPlayers: players, actualPaid: 0, shortfall: requestedAmount };
    }
    if (fromPlayer.isBankrupt) {
      return { success: false, entry: null, error: 'PLAYER_BANKRUPT', newPlayers: players, actualPaid: 0, shortfall: requestedAmount };
    }
    fromBalanceBefore = fromPlayer.cash;
  }

  // 3. Identify and check recipient
  let toPlayer: PlayerState | undefined;
  let toBalanceBefore: number | undefined;

  if (to !== 'BANK') {
    toPlayer = players.find(p => p.id === to);
    if (!toPlayer) {
      return { success: false, entry: null, error: 'PLAYER_NOT_FOUND', newPlayers: players, actualPaid: 0, shortfall: requestedAmount };
    }
    if (toPlayer.isBankrupt) {
      return { success: false, entry: null, error: 'PLAYER_BANKRUPT', newPlayers: players, actualPaid: 0, shortfall: requestedAmount };
    }
    toBalanceBefore = toPlayer.cash;
  }

  // 4. Compute actualPaid & shortfall
  let actualPaid = requestedAmount;
  let shortfall = 0;

  if (fromPlayer) {
    if (fromPlayer.cash < requestedAmount) {
      if (!allowPartial) {
        return {
          success: false,
          entry: null,
          error: 'INSUFFICIENT_FUNDS',
          newPlayers: players,
          actualPaid: 0,
          shortfall: requestedAmount - fromPlayer.cash,
        };
      }
      actualPaid = Math.max(0, fromPlayer.cash);
      shortfall = requestedAmount - actualPaid;
    }
  }

  // 5. Build immutable updated player array
  const fromBalanceAfter = fromPlayer !== undefined ? fromPlayer.cash - actualPaid : undefined;
  const toBalanceAfter = toPlayer !== undefined ? toPlayer.cash + actualPaid : undefined;

  // Stats attribution condition: ONLY rent or debt-settling-rent increments rentPaid / rentCollected
  const isRentAttributable =
    category === 'RENT_PAYMENT' ||
    (category === 'DEBT_SETTLEMENT' && debtCategory === 'RENT_PAYMENT');

  const newPlayers = players.map(p => {
    if (p.id === from) {
      const updatedRentPaid = isRentAttributable ? p.stats.rentPaid + actualPaid : p.stats.rentPaid;
      return {
        ...p,
        cash: Math.max(0, p.cash - actualPaid),
        stats: {
          ...p.stats,
          rentPaid: updatedRentPaid,
        },
      };
    }
    if (p.id === to) {
      const updatedRentCollected = isRentAttributable ? p.stats.rentCollected + actualPaid : p.stats.rentCollected;
      return {
        ...p,
        cash: p.cash + actualPaid,
        stats: {
          ...p.stats,
          rentCollected: updatedRentCollected,
        },
      };
    }
    return p;
  });

  // 6. Generate LedgerEntry
  const nextSeq = ledgerHistory.length > 0 ? ledgerHistory[ledgerHistory.length - 1].sequence + 1 : globalTxSequence++;
  const entry: LedgerEntry = {
    id: `tx-${Date.now()}-${nextSeq}`,
    sequence: nextSeq,
    timestamp: Date.now(),
    roundNumber,
    category,
    fromPlayerId: from,
    toPlayerId: to,
    amount: actualPaid,
    tileId,
    balanceBefore: { from: fromBalanceBefore, to: toBalanceBefore },
    balanceAfter: { from: fromBalanceAfter, to: toBalanceAfter },
    memo,
  };

  // 7. Verify conservation invariant
  assertMoneyConservation(players, newPlayers, entry);

  return {
    success: true,
    entry,
    newPlayers,
    actualPaid,
    shortfall,
  };
}
```

#### 4.2.3 Money Conservation Mathematical Proof
Let $C_{\text{players}} = \sum_{p \in P} p.\text{cash}$.
- **Case 1: Peer-to-Peer Transfer (`from !== 'BANK'` and `to !== 'BANK'`)**:
  $$\Delta C_{\text{from}} = -A, \quad \Delta C_{\text{to}} = +A$$
  $$\sum \Delta C_{\text{players}} = -A + A = 0$$
  *Invariant verified: Total player cash before equals total player cash after.*
- **Case 2: Bank Outflow (`from === 'BANK'`)**:
  $$\Delta C_{\text{players}} = +A$$
  *Invariant verified: Total player cash increases by exactly $A$.*
- **Case 3: Bank Inflow (`to === 'BANK'`)**:
  $$\Delta C_{\text{players}} = -A$$
  *Invariant verified: Total player cash decreases by exactly $A$.*

```typescript
export function assertMoneyConservation(
  before: PlayerState[],
  after: PlayerState[],
  entry: LedgerEntry
): void {
  const sumBefore = before.reduce((acc, p) => acc + p.cash, 0);
  const sumAfter = after.reduce((acc, p) => acc + p.cash, 0);
  const delta = sumAfter - sumBefore;

  if (entry.fromPlayerId !== 'BANK' && entry.toPlayerId !== 'BANK') {
    if (delta !== 0) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] P2P tx ${entry.id} altered total cash by ${delta}!`);
    }
  } else if (entry.fromPlayerId === 'BANK') {
    if (delta !== entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank payout tx ${entry.id} expected delta +${entry.amount}, got ${delta}!`);
    }
  } else if (entry.toPlayerId === 'BANK') {
    if (delta !== -entry.amount) {
      throw new Error(`[MONEY CONSERVATION VIOLATION] Bank deposit tx ${entry.id} expected delta -${entry.amount}, got ${delta}!`);
    }
  }
}
```

---

### 4.3 Clean Replacement Blueprint for `src/game/gameReducer.ts`

Here are the exact 10 code replacements to eliminate all ad-hoc mutations:

#### 1. Start Tile Salary in `ROLL_DICE_RESULT`
*Target*: Lines 233–248
```typescript
// BEFORE:
let earnedSalary = 0;
if (passedStart) {
  earnedSalary = state.config.salaryOnStart;
}
const updatedPlayer: PlayerState = {
  ...activePlayer,
  position: newPosition,
  cash: activePlayer.cash + earnedSalary,
  ...
};

// AFTER:
let currentPlayers = state.players;
let currentLedger = state.ledger || [];

if (passedStart) {
  const salaryAmount = state.chaosModifiers?.goldenHourTurns && state.chaosModifiers.goldenHourTurns > 0
    ? state.config.salaryOnStart * 2
    : state.config.salaryOnStart;

  const result = executeLedgerTransaction(currentPlayers, {
    category: 'SALARY_START',
    from: 'BANK',
    to: activePlayer.id,
    amount: salaryAmount,
    roundNumber: state.roundNumber,
    memo: `Lương qua Cổng Khởi Hành (GO)`,
  }, currentLedger);

  if (result.success && result.entry) {
    currentPlayers = result.newPlayers;
    currentLedger = [...currentLedger, result.entry];
  }
}
```

#### 2. `BUY_PROPERTY`
*Target*: Lines 296–308
```typescript
// BEFORE:
const price = tile.property.basePrice;
const updatedPlayer: PlayerState = {
  ...activePlayer,
  cash: activePlayer.cash - price,
  stats: { ...activePlayer.stats, propertiesOwned: activePlayer.stats.propertiesOwned + 1 },
};
const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

// AFTER:
const price = tile.property.basePrice;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'PROPERTY_PURCHASE',
  from: activePlayer.id,
  to: 'BANK',
  amount: price,
  roundNumber: state.roundNumber,
  tileId,
  memo: `Mua bất động sản [${tile.name}]`,
}, state.ledger || []);

if (!ledgerRes.success) return state;

// Update propertiesOwned statistic cleanly
const updatedPlayers = ledgerRes.newPlayers.map(p =>
  p.id === activePlayer.id ? { ...p, stats: { ...p.stats, propertiesOwned: p.stats.propertiesOwned + 1 } } : p
);
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 3. `UPGRADE_PROPERTY`
*Target*: Lines 350–361
```typescript
// BEFORE:
const cost = tile.property.upgradeCost;
const updatedPlayer: PlayerState = { ...activePlayer, cash: activePlayer.cash - cost };
const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

// AFTER:
const cost = tile.property.upgradeCost;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'PROPERTY_UPGRADE',
  from: activePlayer.id,
  to: 'BANK',
  amount: cost,
  roundNumber: state.roundNumber,
  tileId,
  memo: `Nâng cấp [${tile.name}] lên Cấp ${nextLevel}`,
}, state.ledger || []);

if (!ledgerRes.success) return state;
const updatedPlayers = ledgerRes.newPlayers;
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 4. `DOWNGRADE_PROPERTY`
*Target*: Lines 405–416
```typescript
// BEFORE:
const refund = validation.refundAmount;
const updatedPlayer: PlayerState = { ...activePlayer, cash: activePlayer.cash + refund };
const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

// AFTER:
const refund = validation.refundAmount;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'PROPERTY_DOWNGRADE',
  from: 'BANK',
  to: activePlayer.id,
  amount: refund,
  roundNumber: state.roundNumber,
  tileId,
  memo: `Dỡ bỏ 1 cấp công trình tại [${tile.name}] nhận hoàn tiền 50%`,
}, state.ledger || []);

if (!ledgerRes.success) return state;
const updatedPlayers = ledgerRes.newPlayers;
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 5. `MORTGAGE_PROPERTY`
*Target*: Lines 457–466
```typescript
// BEFORE:
const mortgageVal = validation.mortgageValue;
const updatedPlayer: PlayerState = { ...activePlayer, cash: activePlayer.cash + mortgageVal };
const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

// AFTER:
const mortgageVal = validation.mortgageValue;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'PROPERTY_MORTGAGE',
  from: 'BANK',
  to: activePlayer.id,
  amount: mortgageVal,
  roundNumber: state.roundNumber,
  tileId,
  memo: `Thế chấp [${tile.name}] vay ngân hàng`,
}, state.ledger || []);

if (!ledgerRes.success) return state;
const updatedPlayers = ledgerRes.newPlayers;
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 6. `UNMORTGAGE_PROPERTY`
*Target*: Lines 507–516
```typescript
// BEFORE:
const cost = validation.unmortgageCost;
const updatedPlayer: PlayerState = { ...activePlayer, cash: activePlayer.cash - cost };
const updatedPlayers = [...state.players];
updatedPlayers[state.activePlayerIndex] = updatedPlayer;

// AFTER:
const cost = validation.unmortgageCost;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'PROPERTY_UNMORTGAGE',
  from: activePlayer.id,
  to: 'BANK',
  amount: cost,
  roundNumber: state.roundNumber,
  tileId,
  memo: `Giải chấp [${tile.name}] kèm 10% lãi suất`,
}, state.ledger || []);

if (!ledgerRes.success) return state;
const updatedPlayers = ledgerRes.newPlayers;
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 7. Flexible `RESOLVE_DEBT` & `SETTLE_PARTIAL_DEBT`
*Target*: Lines 545–597
```typescript
case 'RESOLVE_DEBT':
case 'SETTLE_PARTIAL_DEBT': {
  if ((state.turnPhase !== 'DEBT_LIQUIDATION' && state.turnPhase !== 'BANKRUPTCY_CHECK') || !state.pendingDebt) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const debt = state.pendingDebt;
  const requestedPayment = ('amount' in action && typeof action.amount === 'number' && action.amount > 0)
    ? Math.min(action.amount, debt.amount)
    : debt.amount;

  // Allow partial payment if player has any positive cash
  const ledgerRes = executeLedgerTransaction(state.players, {
    category: 'DEBT_SETTLEMENT',
    from: activePlayer.id,
    to: debt.creditorPlayerId || 'BANK',
    amount: requestedPayment,
    roundNumber: state.roundNumber,
    memo: `Thanh toán nợ: ${debt.reason}`,
    allowPartial: true,
    debtCategory: debt.category,
  }, state.ledger || []);

  if (!ledgerRes.success || ledgerRes.actualPaid <= 0) {
    return state; // No funds available to make any payment
  }

  const remainingDebt = debt.amount - ledgerRes.actualPaid;
  const isFullySettled = remainingDebt <= 0;
  const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

  return {
    ...state,
    players: ledgerRes.newPlayers,
    turnPhase: isFullySettled ? 'ACTION_MENU' : state.turnPhase,
    pendingDebt: isFullySettled ? null : { ...debt, amount: remainingDebt },
    ledger: updatedLedger,
    logs: [
      {
        id: `debt-${Date.now()}`,
        timestamp: Date.now(),
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: isFullySettled
          ? `[HOÀN TẤT TRẢ NỢ] ${activePlayer.name} đã thanh toán đủ khoản nợ $${debt.amount}M (${debt.reason}).`
          : `[TRẢ NỢ MỘT PHẦN] ${activePlayer.name} đã nộp $${ledgerRes.actualPaid}M, còn nợ lại $${remainingDebt}M.`,
        type: 'INFO',
      },
      ...state.logs,
    ],
  };
}
```

#### 8. `PAY_DETENTION_BAIL`
*Target*: Lines 601–615
```typescript
// BEFORE:
const bailCost = state.config.detentionBailCost;
const updatedPlayer: PlayerState = {
  ...activePlayer,
  cash: activePlayer.cash - bailCost,
  inDetention: false,
  detentionTurns: 0,
};

// AFTER:
const bailCost = state.config.detentionBailCost;
const ledgerRes = executeLedgerTransaction(state.players, {
  category: 'BAIL_PAYMENT',
  from: activePlayer.id,
  to: 'BANK',
  amount: bailCost,
  roundNumber: state.roundNumber,
  memo: `Nộp tiền bảo lãnh rời Khu Cách Ly`,
}, state.ledger || []);

if (!ledgerRes.success) return state;

const updatedPlayers = ledgerRes.newPlayers.map(p =>
  p.id === activePlayer.id ? { ...p, inDetention: false, detentionTurns: 0 } : p
);
const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);
```

#### 9. `DECLARE_BANKRUPTCY`
*Target*: Lines 681–693
```typescript
// BEFORE:
const remainingCash = Math.max(0, targetPlayer.cash);
const updatedPlayers = state.players.map(p => {
  if (p.id === action.playerId) return { ...p, isBankrupt: true, cash: 0 };
  if (creditorId && p.id === creditorId && remainingCash > 0) return { ...p, cash: p.cash + remainingCash };
  return p;
});

// AFTER:
let currentPlayers = state.players;
let currentLedger = state.ledger || [];
const remainingCash = Math.max(0, targetPlayer.cash);

if (remainingCash > 0 && creditorId) {
  const ledgerRes = executeLedgerTransaction(currentPlayers, {
    category: 'DEBT_SETTLEMENT',
    from: targetPlayer.id,
    to: creditorId,
    amount: remainingCash,
    roundNumber: state.roundNumber,
    memo: `Chuyển toàn bộ tiền mặt còn lại cho chủ nợ khi phá sản`,
    debtCategory: state.pendingDebt?.category,
  }, currentLedger);

  if (ledgerRes.success && ledgerRes.entry) {
    currentPlayers = ledgerRes.newPlayers;
    currentLedger = [...currentLedger, ledgerRes.entry];
  }
}

const updatedPlayers = currentPlayers.map(p =>
  p.id === action.playerId ? { ...p, isBankrupt: true, cash: 0 } : p
);
```

#### 10. `TAX` and `RENT` in `resolveLandingTile`
*Target*: Lines 804–928
```typescript
// TAX HANDLING:
case 'TAX': {
  const taxAmount = landingTile.taxAmount || (landingTile.id === 4 ? 200 : 100);
  soundEffects.payRent();

  const ledgerRes = executeLedgerTransaction(state.players, {
    category: 'TAX_PAYMENT',
    from: activePlayer.id,
    to: 'BANK',
    amount: taxAmount,
    roundNumber: state.roundNumber,
    tileId: landingTile.id,
    memo: `Nộp thuế tại [${landingTile.name}]`,
    allowPartial: true,
  }, state.ledger || []);

  const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

  if (ledgerRes.shortfall > 0) {
    // Insufficient funds -> Enter debt liquidation / bankruptcy check
    return {
      ...state,
      players: ledgerRes.newPlayers,
      ledger: updatedLedger,
      turnPhase: 'DEBT_LIQUIDATION',
      pendingDebt: {
        creditorPlayerId: null,
        amount: ledgerRes.shortfall,
        reason: `Nộp thuế tại [${landingTile.name}]`,
        category: 'TAX_PAYMENT',
      },
      logs: [
        {
          id: `tax-warn-${Date.now()}`,
          timestamp: Date.now(),
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          message: `[CẢNH BÁO NỢ THUẾ] ${activePlayer.name} đối mặt khoản thuế $${taxAmount}M, thiếu $${ledgerRes.shortfall}M!`,
          type: 'WARNING',
        },
        ...newLogs,
      ],
    };
  }

  return {
    ...state,
    players: ledgerRes.newPlayers,
    ledger: updatedLedger,
    turnPhase: 'ACTION_MENU',
    logs: newLogs,
  };
}

// RENT HANDLING:
case 'PROPERTY':
case 'TRANSPORT':
case 'UTILITY': {
  const ownership = state.properties[landingTile.id];
  if (ownership && ownership.ownerId && ownership.ownerId !== activePlayer.id && !ownership.isMortgaged) {
    const rentInfo = calculateRent(landingTile.id, state.properties, state.rentModifier, diceSum);
    const owner = updatedPlayers.find(p => p.id === ownership.ownerId);

    if (owner && !owner.isBankrupt && rentInfo.rentAmount > 0) {
      soundEffects.payRent();

      const ledgerRes = executeLedgerTransaction(state.players, {
        category: 'RENT_PAYMENT',
        from: activePlayer.id,
        to: owner.id,
        amount: rentInfo.rentAmount,
        roundNumber: state.roundNumber,
        tileId: landingTile.id,
        memo: `Trả tiền thuê tại [${landingTile.name}] cho ${owner.name}`,
        allowPartial: true,
      }, state.ledger || []);

      const updatedLedger = ledgerRes.entry ? [...(state.ledger || []), ledgerRes.entry] : (state.ledger || []);

      if (ledgerRes.shortfall > 0) {
        return {
          ...state,
          players: ledgerRes.newPlayers,
          ledger: updatedLedger,
          turnPhase: 'DEBT_LIQUIDATION',
          pendingDebt: {
            creditorPlayerId: owner.id,
            amount: ledgerRes.shortfall,
            reason: `Tiền thuê tại [${landingTile.name}] cho ${owner.name}`,
            category: 'RENT_PAYMENT',
          },
          logs: newLogs,
        };
      }

      return {
        ...state,
        players: ledgerRes.newPlayers,
        ledger: updatedLedger,
        turnPhase: 'ACTION_MENU',
        logs: newLogs,
      };
    }
  }
}
```

---

### 4.4 Stats Integrity Verification Matrix

| Transaction Category | Debited Party | Credited Party | Updates `rentPaid`? | Updates `rentCollected`? | Updates `propertiesOwned`? | Rationale |
|----------------------|---------------|----------------|---------------------|--------------------------|----------------------------|-----------|
| **`SALARY_START`** | BANK | Player | ❌ NO | ❌ NO | ❌ NO | Income from bank, not rent |
| **`RENT_PAYMENT`** | Player A | Player B | ✅ YES (+amount) | ✅ YES (+amount) | ❌ NO | Actual property tenancy rent |
| **`PROPERTY_PURCHASE`** | Player | BANK | ❌ NO | ❌ NO | ✅ YES (+1) | Capital expenditure to bank |
| **`PROPERTY_UPGRADE`** | Player | BANK | ❌ NO | ❌ NO | ❌ NO | Building capital improvement |
| **`PROPERTY_DOWNGRADE`** | BANK | Player | ❌ NO | ❌ NO | ❌ NO | Demolition asset liquidation |
| **`PROPERTY_MORTGAGE`** | BANK | Player | ❌ NO | ❌ NO | ❌ NO | Loan collateral borrowing |
| **`PROPERTY_UNMORTGAGE`**| Player | BANK | ❌ NO | ❌ NO | ❌ NO | Loan debt repayment + interest |
| **`TAX_PAYMENT`** | Player | BANK | ❌ NO | ❌ NO | ❌ NO | State tax obligation |
| **`BAIL_PAYMENT`** | Player | BANK | ❌ NO | ❌ NO | ❌ NO | Legal detention fee |
| **`AUCTION_WIN`** | Player | BANK | ❌ NO | ❌ NO | ✅ YES (+1) | Deed auction settlement |
| **`TRADE_CASH`** | Player A | Player B | ❌ NO | ❌ NO | ❌ NO | Bilateral property/asset trade |
| **`CHAOS_EFFECT`** | BANK / Player | Player / BANK | ❌ NO | ❌ NO | ❌ NO | Dynamic card variance |
| **`DEBT_SETTLEMENT` (Rent)** | Player A | Player B | ✅ YES (+amount) | ✅ YES (+amount) | ❌ NO | Deferred rent obligation |
| **`DEBT_SETTLEMENT` (Tax/Other)**| Player | BANK | ❌ NO | ❌ NO | ❌ NO | Deferred tax/non-rent obligation |

---

### 4.5 Unit Test Suite Specification (`src/game/__tests__/ledgerEngine.test.ts`)

The implementation worker should implement the following complete test suite in `src/game/__tests__/ledgerEngine.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { executeLedgerTransaction, assertMoneyConservation, verifyLedgerAudit } from '../economy/ledgerEngine';
import { PlayerState } from '../types';
import { DEFAULT_PLAYER_TOKENS } from '../board/boardData';

function createMockPlayer(id: string, cash: number, name = `Player ${id}`): PlayerState {
  return {
    id,
    name,
    token: DEFAULT_PLAYER_TOKENS[0],
    cash,
    position: 0,
    inDetention: false,
    detentionTurns: 0,
    isBankrupt: false,
    consecutiveDoubles: 0,
    stats: {
      rentPaid: 0,
      rentCollected: 0,
      chaosTriggered: 0,
      tilesTraveled: 0,
      propertiesOwned: 0,
    },
  };
}

describe('Milestone 1: Central Ledger Engine & Solvency Architecture', () => {
  let p1: PlayerState;
  let p2: PlayerState;
  let players: PlayerState[];

  beforeEach(() => {
    p1 = createMockPlayer('p1', 1500, 'Alice');
    p2 = createMockPlayer('p2', 1500, 'Bob');
    players = [p1, p2];
  });

  describe('1. Double-Entry Accounting & Money Conservation', () => {
    it('executes atomic P2P transaction conserving total money supply', () => {
      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 300,
        roundNumber: 1,
        memo: 'Test rent',
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(300);
      expect(res.newPlayers[0].cash).toBe(1200);
      expect(res.newPlayers[1].cash).toBe(1800);
      expect(res.entry?.balanceBefore).toEqual({ from: 1500, to: 1500 });
      expect(res.entry?.balanceAfter).toEqual({ from: 1200, to: 1800 });
      expect(res.newPlayers[0].cash + res.newPlayers[1].cash).toBe(3000);
    });

    it('executes Bank payout (SALARY_START) with proper delta accounting', () => {
      const res = executeLedgerTransaction(players, {
        category: 'SALARY_START',
        from: 'BANK',
        to: 'p1',
        amount: 200,
        roundNumber: 1,
        memo: 'Salary GO',
      });

      expect(res.success).toBe(true);
      expect(res.newPlayers[0].cash).toBe(1700);
      expect(res.newPlayers[1].cash).toBe(1500);
      expect(res.entry?.balanceBefore.from).toBeUndefined();
      expect(res.entry?.balanceBefore.to).toBe(1500);
      expect(res.entry?.balanceAfter.to).toBe(1700);
    });

    it('executes Bank deposit (TAX_PAYMENT) with proper delta accounting', () => {
      const res = executeLedgerTransaction(players, {
        category: 'TAX_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 200,
        roundNumber: 1,
        memo: 'Luxury Tax',
      });

      expect(res.success).toBe(true);
      expect(res.newPlayers[0].cash).toBe(1300);
      expect(res.entry?.balanceBefore.from).toBe(1500);
      expect(res.entry?.balanceAfter.to).toBeUndefined();
    });
  });

  describe('2. Non-Negative Cash Invariant Enforcement', () => {
    it('rejects transaction when payer is insolvent and allowPartial is false', () => {
      const poorPlayer = createMockPlayer('p1', 100);
      const res = executeLedgerTransaction([poorPlayer, p2], {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 250,
        roundNumber: 1,
        memo: 'Too expensive rent',
        allowPartial: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('INSUFFICIENT_FUNDS');
      expect(res.shortfall).toBe(150);
      expect(res.newPlayers[0].cash).toBe(100); // Balance untouched
    });

    it('allows partial payment when allowPartial is true without making cash negative', () => {
      const poorPlayer = createMockPlayer('p1', 100);
      const res = executeLedgerTransaction([poorPlayer, p2], {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 250,
        roundNumber: 1,
        memo: 'Partial rent',
        allowPartial: true,
      });

      expect(res.success).toBe(true);
      expect(res.actualPaid).toBe(100);
      expect(res.shortfall).toBe(150);
      expect(res.newPlayers[0].cash).toBe(0); // Zeroed, never negative!
      expect(res.newPlayers[1].cash).toBe(1600);
    });
  });

  describe('3. Statistics Isolation & Integrity', () => {
    it('increments rentPaid and rentCollected ONLY on RENT_PAYMENT', () => {
      const res = executeLedgerTransaction(players, {
        category: 'RENT_PAYMENT',
        from: 'p1',
        to: 'p2',
        amount: 200,
        roundNumber: 1,
        memo: 'Rent',
      });

      expect(res.newPlayers[0].stats.rentPaid).toBe(200);
      expect(res.newPlayers[1].stats.rentCollected).toBe(200);
    });

    it('DOES NOT increment rentPaid or rentCollected on TRADE_CASH', () => {
      const res = executeLedgerTransaction(players, {
        category: 'TRADE_CASH',
        from: 'p1',
        to: 'p2',
        amount: 500,
        roundNumber: 2,
        memo: 'Trade payment',
      });

      expect(res.newPlayers[0].cash).toBe(1000);
      expect(res.newPlayers[1].cash).toBe(2000);
      expect(res.newPlayers[0].stats.rentPaid).toBe(0);
      expect(res.newPlayers[1].stats.rentCollected).toBe(0);
    });

    it('DOES NOT increment rentPaid on TAX_PAYMENT or BAIL_PAYMENT', () => {
      const taxRes = executeLedgerTransaction(players, {
        category: 'TAX_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 150,
        roundNumber: 1,
        memo: 'Income tax',
      });
      expect(taxRes.newPlayers[0].stats.rentPaid).toBe(0);

      const bailRes = executeLedgerTransaction(players, {
        category: 'BAIL_PAYMENT',
        from: 'p1',
        to: 'BANK',
        amount: 100,
        roundNumber: 1,
        memo: 'Bail',
      });
      expect(bailRes.newPlayers[0].stats.rentPaid).toBe(0);
    });

    it('properly attributes DEBT_SETTLEMENT to rent stats only if debtCategory is RENT_PAYMENT', () => {
      const rentDebtRes = executeLedgerTransaction(players, {
        category: 'DEBT_SETTLEMENT',
        from: 'p1',
        to: 'p2',
        amount: 300,
        roundNumber: 3,
        memo: 'Settling rent debt',
        debtCategory: 'RENT_PAYMENT',
      });
      expect(rentDebtRes.newPlayers[0].stats.rentPaid).toBe(300);
      expect(rentDebtRes.newPlayers[1].stats.rentCollected).toBe(300);

      const taxDebtRes = executeLedgerTransaction(players, {
        category: 'DEBT_SETTLEMENT',
        from: 'p1',
        to: 'BANK',
        amount: 300,
        roundNumber: 3,
        memo: 'Settling tax debt',
        debtCategory: 'TAX_PAYMENT',
      });
      expect(taxDebtRes.newPlayers[0].stats.rentPaid).toBe(0);
    });
  });

  describe('4. Ledger Audit Replay Verification', () => {
    it('successfully audits sequence of 10 transactions against initial balances', () => {
      let statePlayers = [createMockPlayer('p1', 1500), createMockPlayer('p2', 1500)];
      const history = [];

      // 1. p1 buys property ($300k)
      const t1 = executeLedgerTransaction(statePlayers, {
        category: 'PROPERTY_PURCHASE',
        from: 'p1',
        to: 'BANK',
        amount: 300,
        roundNumber: 1,
        memo: 'Buy',
      }, history);
      statePlayers = t1.newPlayers;
      if (t1.entry) history.push(t1.entry);

      // 2. p2 pays rent to p1 ($100k)
      const t2 = executeLedgerTransaction(statePlayers, {
        category: 'RENT_PAYMENT',
        from: 'p2',
        to: 'p1',
        amount: 100,
        roundNumber: 1,
        memo: 'Rent',
      }, history);
      statePlayers = t2.newPlayers;
      if (t2.entry) history.push(t2.entry);

      // 3. p1 upgrades ($150k)
      const t3 = executeLedgerTransaction(statePlayers, {
        category: 'PROPERTY_UPGRADE',
        from: 'p1',
        to: 'BANK',
        amount: 150,
        roundNumber: 2,
        memo: 'Upgrade',
      }, history);
      statePlayers = t3.newPlayers;
      if (t3.entry) history.push(t3.entry);

      // Verify audit
      const audit = verifyLedgerAudit(1500, statePlayers, history);
      expect(audit.isValid).toBe(true);
      expect(audit.discrepancies).toHaveLength(0);
    });
  });
});
```

---

## 5. Verification Method

To independently verify the implementation when executed by Worker M1-1:

1. **Run the Full Test Suite**:
   ```bash
   npm test
   ```
   *Expected Result*: All 149 existing tests continue to pass with 0 regressions, plus the new `src/game/__tests__/ledgerEngine.test.ts` suite passes 100%.

2. **Run TypeScript Production Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Clean build to `dist/` with 0 type errors.

3. **Grep Search for Remaining Raw Cash Mutations**:
   ```bash
   # In gameReducer.ts, ensure no direct arithmetic 'cash: player.cash +/- ...' exists outside of ledger result handling
   ```

4. **Invalidation Conditions**:
   - Any test failure in `tier1_features.test.ts` or `tier2_boundaries.test.ts`.
   - Any player cash dropping below 0 ($P.\text{cash} < 0$).
   - Any non-rent transaction inflating `rentPaid` or `rentCollected`.
   - Indebted player being unable to pay down partial debt in `DEBT_LIQUIDATION`.
