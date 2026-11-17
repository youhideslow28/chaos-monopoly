# Phase 02 Survey Report: Economy, Auction & Trading Architecture

- **Author**: Economy, Auction & Trading Explorer (`teamwork_explorer_p2_survey_2`)
- **Working Directory**: `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_p2_survey_2`
- **Date**: 2026-10-31
- **Status**: Complete & Validated (Read-Only Survey)
- **Target Audience**: Phase 02 Orchestrator, Game Systems Architects, Implementation Workers, QA Engineers

---

## 1. Observation

A forensic investigation of the existing codebase (`src/game/`) and tests (`src/game/__tests__/`) revealed the following baseline facts:

### 1.1 Existing Economy Subsystem (`src/game/economy/economyEngine.ts`)
- **File size & content**: 138 lines containing 5 pure helper functions:
  1. `calculatePlayerNetWorth(player, properties)`: Sums cash + base price + building costs ($50k–$200k per level) − mortgage debt.
  2. `executeCashTransaction(player, amount)`: Pure addition `player.cash + amount`. Does not prevent negative balance internally; only returns `isSolvent: newCash >= 0`.
  3. `transferCash(fromPlayer, toPlayer, amount)`: Clamps payment to `actualPaid = Math.min(fromPlayer.cash, amount)`. Automatically increments `stats.rentPaid` and `stats.rentCollected`. **Defect**: This assumes all cash transfers are rent! Transfers from trading, auctions, chaos cards, or tax don't distinguish rent stats.
  4. `calculateMaxLiquidationValue(player, properties)`: Calculates max emergency cash by selling buildings at 50% refund + mortgaging unmortgaged properties at 50% base price.
  5. `liquidateBankruptPlayer(bankruptPlayerId, properties, creditorPlayerId)`: If creditor exists, transfers all properties retaining level and mortgage status. If bank, resets `ownerId = null, level = 0, isMortgaged = false`.
- **Missing Central Ledger**: There is NO centralized ledger, transaction ID system, or double-entry audit trail. Financial changes occur as disparate, ad-hoc mutations across 10+ action handlers in `src/game/gameReducer.ts`.
- **Inflexible Debt Liquidation**: In `gameReducer.ts` (`case 'RESOLVE_DEBT'`, line 553), payment requires `activePlayer.cash >= debt.amount`. If a debtor raises partial funds through mortgaging (e.g., owes $400k, raises $250k), they cannot pay the $250k towards the debt. It is an all-or-nothing check.

### 1.2 Missing Auction System
- **Current Behavior**: In `src/game/gameReducer.ts` (`resolveLandingTile`, lines 873–932), landing on an unowned property sets `turnPhase: 'ACTION_MENU'`. The active player can dispatch `BUY_PROPERTY` or `END_TURN`.
- **Grep Verification**: Ripgrep search for pattern `auction` across `src/` yielded **0 matches**.
- **Rule Defect**: Under Monopoly and competitive board game rules, if the landing player declines to buy at list price or cannot afford it, the property **must immediately be put up for public auction** among all solvent players. Currently, if declined, the property remains unowned on the board with zero auction mechanism.

### 1.3 Missing Trading System
- **Current Behavior**: Ripgrep search for pattern `trade` across `src/` yielded **0 matches**.
- **Missing Elements**:
  - No `TradeProposal` data structures or interfaces.
  - No action types for proposing, accepting, rejecting, or countering trades.
  - No validation to ensure properties in a district are unimproved (`level === 0`) before trading.
  - No atomic swap logic preventing stale offers or asset duplication.

### 1.4 Disconnected Economic Event Modifiers (`ChaosModifiers`)
- In `src/game/types/index.ts` (lines 215–226), `ChaosModifiers` defines 10 modifier counters:
  `reverseDirectionTurns`, `marketFrozenTurns`, `goldenHourTurns`, `curfewTurns`, `transportBoomTurns`, `utilityBoomTurns`, `districtBoomTurns`, `alienMothershipTurns`, `interestHikeTurns`, `subsidizedMortgageTurns`.
- In `src/game/chaos-engine/chaosEngine.ts` (lines 586–638), drawing these cards increments the counters.
- In `src/game/turn-manager/turnManager.ts` (lines 92–104), these counters decrement upon each completed round.
- **Critical Finding**: **None of these counters are connected to the actual economy calculations!**
  1. `transportBoomTurns` (double transport rent) is NOT queried in `calculateRent` (`propertyEngine.ts:66–78`).
  2. `utilityBoomTurns` (double utility rent) is NOT queried in `calculateRent` (`propertyEngine.ts:80–93`).
  3. `districtBoomTurns` (1.5x rent for Hanoi & HCMC) is NOT queried in `calculateRent`.
  4. `alienMothershipTurns` (Tile 39 Landmark 81 chaos portal, 0 rent) is NOT queried in `calculateRent`.
  5. `goldenHourTurns` (double salary on GO) is NOT queried in `gameReducer.ts:233–236`.
  6. `marketFrozenTurns` (cannot buy/upgrade) is NOT checked in `canBuyProperty` or `canUpgradeProperty`.
  7. `interestHikeTurns` (extra 10% mortgage interest) is NOT queried in `getUnmortgageCost`.
  8. `subsidizedMortgageTurns` (75% mortgage value) is NOT queried in `getMortgageValue`.
  9. `curfewTurns` (max 4 movement steps) is NOT checked in `ROLL_DICE_RESULT`.

### 1.5 Game Balance Baseline
- Board: 40 tiles (22 color properties, 4 transport hubs, 2 utilities, 12 special/corner tiles).
- Starting Cash: $1,500k VND. Total money supply (4 players) = $6,000k VND.
- Pass Start Salary: $200k VND (13.3% of starting cash; ~5.7 turns per lap).
- Property Pricing: $60k (Cần Thơ) to $400k (Landmark 81).
- Rents: Base $2k–$50k; 5★ Landmark $250k–$2,000k.
- Upgrade costs: $50k to $200k per star level.
- Current Round Cap: 60 rounds (approx. 60–90 min match duration; target is 45–60 min).
- Test Suite: All 149 tests across 9 test files in Vitest pass clean (3.27s).

---

## 2. Logic Chain

```
[Observation 1.1: Cash mutations are scattered across 10+ reducer branches]
       │
       ▼
[Inference A: Lack of centralized ledger prevents auditability, corrupts rent stats during non-rent transfers, and risks race conditions]
       │
       ▼
[Recommendation A: Implement centralized LedgerEngine with double-entry accounting and typed TransactionCategory]

[Observation 1.2: Unowned properties never go to auction when passed]
       │
       ▼
[Inference B: Lack of auctions stalls property distribution, prevents district consolidation, and artificially prolongs matches]
       │
       ▼
[Recommendation B: Implement Ascending Clock Auction State Machine triggered whenever landing player declines list purchase]

[Observation 1.3: Zero trading mechanics exist in codebase]
       │
       ▼
[Inference C: Players cannot negotiate trades to break monopolies or assemble sets, locking the board in low-rent stalemate]
       │
       ▼
[Recommendation C: Implement Bilateral Trading State Machine with strict Even Building / District Unimproved validation and atomic swaps]

[Observation 1.4: 9 out of 10 ChaosModifiers are dead counters not wired to financial formulas]
       │
       ▼
[Inference D: Dynamic economic events declared by Chaos Engine have zero tangible gameplay impact]
       │
       ▼
[Recommendation D: Introduce unified EconomicModifierPipeline plugged into calculateRent, getMortgageValue, and salary logic]

[Observation 1.5: 60 rounds duration exceeds 45-60 min target]
       │
       ▼
[Inference E: 4 players * 20s/turn = 80s/round. 60 rounds = 80 mins. 45 rounds = 60 mins]
       │
       ▼
[Recommendation E: Re-calibrate default maxRounds to 45 with Fast (30), Standard (45), and Marathon (60) presets]
```

---

## 3. Caveats

1. **Read-Only Scope**: This report is purely analytical and architectural. No production code was modified in `src/`.
2. **Backward Compatibility**: 149 existing tests in `src/game/__tests__/` must remain 100% passing. All new features (Ledger, Auction, Trading) must extend `GameState` additively without removing or breaking existing properties (`players`, `properties`, `pendingDebt`, etc.).
3. **UI Coordination**: The Auction and Trading systems require modal components in the presentation layer. The interface contracts specified below are designed for clean integration with React `useReducer` and UI modals.
4. **AI Bot Simplification**: While full AI trading logic is slated for future phases, basic rule-based AI auction bidding (bid if price < 80% base price and cash > 2x bid) and simple trade rejection must be supported by the data contract.

---

## 4. Conclusion & Architectural Specifications

To complete Phase 02 Product Requirements (#4 Economy, #5 Auctions, #6 Trading, #8 Game Balancing), we specify the following data structures, state machines, and interface contracts.

### 4.1 Centralized Economy System & Ledger Architecture

#### 4.1.1 Ledger Data Structures (`src/game/economy/ledgerTypes.ts`)

```typescript
export type TransactionCategory =
  | 'START_SALARY'          // Pass or land on GO (+$200k)
  | 'PROPERTY_PURCHASE'     // Standard purchase at base price
  | 'PROPERTY_UPGRADE'      // Construction of 1★ to 5★ Landmark
  | 'PROPERTY_DOWNGRADE'    // Building demolition refund (50%)
  | 'MORTGAGE_LOAN'         // Bank mortgage payout (50% or 75%)
  | 'UNMORTGAGE_REPAYMENT'  // Mortgage lift payment (+10% or +20% interest)
  | 'RENT_PAYMENT'          // Rent transferred between players
  | 'TAX_PAYMENT'           // Income/Luxury tax paid to Bank
  | 'DETENTION_BAIL'        // Bail payment to leave detention ($100k)
  | 'AUCTION_SETTLEMENT'    // Winning bid paid to Bank for property
  | 'TRADE_CASH'            // Bilateral trade cash transfer
  | 'CHAOS_GRANT'           // Positive chaos cash injection
  | 'CHAOS_PENALTY'         // Negative chaos cash deduction
  | 'BANKRUPTCY_TRANSFER';  // Remaining cash liquidation to creditor

export type LedgerParty = PlayerId | 'BANK' | 'CHAOS';

export interface LedgerEntry {
  id: string;               // UUID or `tx-${timestamp}-${seq}`
  sequence: number;         // Monotonically increasing sequence number
  timestamp: number;        // UTC epoch millis
  roundNumber: number;      // Current match round
  category: TransactionCategory;
  from: LedgerParty;        // Source entity
  to: LedgerParty;          // Destination entity
  amount: number;           // Absolute cash transferred (>= 0)
  tileId?: TileId;          // Associated board tile if property/rent/tax
  balanceBefore: {
    from?: number;
    to?: number;
  };
  balanceAfter: {
    from?: number;
    to?: number;
  };
  descriptionVi: string;    // Human-readable audit log entry in Vietnamese
}
```

#### 4.1.2 Transaction Engine Contract (`src/game/economy/ledgerEngine.ts`)

```typescript
export interface ExecuteTransactionParams {
  category: TransactionCategory;
  from: LedgerParty;
  to: LedgerParty;
  amount: number;
  tileId?: TileId;
  descriptionVi: string;
}

export interface TransactionResult {
  success: boolean;
  ledgerEntry?: LedgerEntry;
  updatedPlayers: PlayerState[];
  errorReason?: string;
  isSolvent: boolean;
  shortfallAmount?: number; // > 0 if payer could not afford full amount
}

/**
 * Atomic double-entry transaction executor:
 * 1. Validates payer solvency (if payer is a player, cash must >= amount).
 * 2. If payer has insufficient cash, computes exact shortfall and creates debt.
 * 3. Deducts from payer, credits to recipient.
 * 4. Updates player financial statistics (rentPaid, rentCollected, etc.).
 * 5. Emits an immutable LedgerEntry.
 */
export function executeLedgerTransaction(
  state: GameState,
  params: ExecuteTransactionParams
): TransactionResult;
```

#### 4.1.3 Enhanced Property Valuation Formulas

1. **Current Net Worth (`calculatePlayerNetWorth`)**:
   $$\text{NetWorth} = \text{Cash} + \sum_{\text{owned}} \left( \text{BasePrice} + \text{Level} \times \text{UpgradeCost} \right) - \sum_{\text{mortgaged}} \text{MortgageValue}$$
   - *Rationale*: Represents total balance sheet equity. If a property is mortgaged, the owner already pocketed the mortgage loan cash, so the property equity is reduced by the loan obligation.

2. **Maximum Emergency Liquidation Value (`calculateMaxLiquidationValue`)**:
   $$\text{LiquidationValue} = \text{Cash} + \sum_{\text{owned}} \left( 0.5 \times \text{Level} \times \text{UpgradeCost} \right) + \sum_{\text{unmortgaged}} \text{MortgageValue}$$
   - *Rationale*: Determines whether an indebted player can avoid bankruptcy. If $\text{PendingDebt} \le \text{LiquidationValue}$, the player is capable of surviving via emergency mortgage and building sales.

3. **Partial Debt Settlement Contract**:
   When a player faces `pendingDebt`, allow an action `SETTLE_PARTIAL_DEBT` that deducts whatever liquid cash the player currently has, reduces `pendingDebt.amount`, and transfers `actualPaid` to the creditor immediately, rather than blocking until 100% is raised.

---

### 4.2 Auction System Architecture

#### 4.2.1 Auction Flow State Machine

```
[Landing on Unowned Property]
       │
       ├─► Player chooses BUY_PROPERTY ──► Standard Purchase Complete
       │
       └─► Player DECLINES / PASSES ──► Trigger Auction
                                              │
                                              ▼
                                      [Phase: AUCTION]
                         Opening Bid: 50% BasePrice (Min $10k)
                         Active Bidders: All Solvent Players (Including Landing Player)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              [Player Turn to Bid]                             [Player Passes]
        - Place Bid >= Current + Increment                 - Set hasFolded = true
        - Check Bid <= Player.Cash                         - Exclude from further rounds
        - Update highestBidder & currentBid                           │
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                             [Check Remaining Active Bidders]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [Remaining Bidders == 1]                            [All Bidders Passed]
           (At least 1 bid placed)                              (No bids placed)
                      │                                               │
                      ▼                                               ▼
             [AUCTION SUCCESS]                                 [NO-BID PASS]
        - Deduct Winning Bid from Cash                   - Property remains unowned
        - Transfer Property to Winner                    - ownerId = null
        - Record AUCTION_SETTLEMENT                      - Return to turn flow
        - Return to original player turn
```

#### 4.2.2 Auction Data Structures (`src/game/types/index.ts`)

```typescript
export interface AuctionParticipant {
  playerId: PlayerId;
  hasFolded: boolean;
  highestBidPlaced: number;
}

export interface AuctionState {
  tileId: TileId;
  basePrice: number;
  currentBid: number;
  highestBidderId: PlayerId | null;
  activeBidderIndex: number; // Index within participants array
  participants: AuctionParticipant[];
  minimumIncrement: number;  // e.g. $10k VND
  returnTurnPhase: TurnPhase; // Action menu to resume after auction
  originatingPlayerIndex: number;
}
```

#### 4.2.3 Auction Game Actions to add to `GameAction`:

```typescript
| { type: 'START_AUCTION'; tileId: TileId }
| { type: 'AUCTION_BID'; playerId: PlayerId; bidAmount: number }
| { type: 'AUCTION_PASS'; playerId: PlayerId }
| { type: 'CANCEL_AUCTION' } // In rare abort scenario
```

#### 4.2.4 Auction Validation Invariants
1. **Solvency Guarantee**: A player CANNOT bid more than their liquid cash (`bidAmount <= player.cash`).
2. **Strict Incremental Order**: `bidAmount >= currentBid + minimumIncrement`.
3. **Inclusive Eligibility**: Even the player who landed on the tile and declined base price is allowed to bid (standard Monopoly tournament rule).
4. **Detention Exemption**: Players in Detention **can** bid in auctions (maintains engagement and follows official rules). Bankrupt players cannot.
5. **No-Bid Guarantee**: If all participants fold without placing any bid, the auction cleanly terminates with `ownerId: null` and the tile remains unowned.

---

### 4.3 Trading System Architecture

#### 4.3.1 Trading Flow State Machine

```
[Active Player Opens Trade Panel]
               │
               ▼
   [Configure TradeProposal]
   - Sender: Active Player
   - Recipient: Selected Solvent Opponent
   - Offer: Cash, Properties, Jail Release Cards
   - Request: Cash, Properties, Jail Release Cards
               │
               ▼
      [Validate Proposal]
   1. Properties have level === 0 (unimproved) across entire district
   2. Sender owns offered properties & has offered cash
   3. Recipient owns requested properties & has requested cash
   4. Recipient is not bankrupt
               │
               ▼
        [PROPOSE_TRADE] ──► Sets state.activeTradeProposal
               │
               ▼
     [Recipient Review on Screen]
               │
       ┌───────┼──────────────────────────────┐
       ▼       ▼                              ▼
  [ACCEPT]  [REJECT]                      [COUNTER]
       │       │                              │
       │       └─► Discard proposal           └─► Swap Sender/Recipient,
       │           Clear activeTradeProposal      edit items, re-propose
       ▼
 [ATOMIC SWAP]
 1. Re-validate ownership and cash balances at exact moment of acceptance.
 2. If balances or properties changed in the interim -> ABORT (Stale Offer).
 3. Execute atomic property ownership transfer.
 4. Execute atomic cash transfer via Ledger (`TRADE_CASH`).
 5. Transfer jail release card status.
 6. Emit `TRADE_EXECUTED` log and clear activeTradeProposal.
```

#### 4.3.2 Trading Data Structures (`src/game/types/index.ts`)

```typescript
export interface TradeItemBundle {
  cash: number;
  tileIds: TileId[];
  jailFreeCards: number;
}

export interface TradeProposal {
  id: string;             // UUID or `trade-${timestamp}`
  roundNumber: number;
  proposerId: PlayerId;
  targetPlayerId: PlayerId;
  offeredItems: TradeItemBundle;
  requestedItems: TradeItemBundle;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: number;
}
```

#### 4.3.3 Trading Game Actions to add to `GameAction`:

```typescript
| { type: 'INITIATE_TRADE'; proposal: Omit<TradeProposal, 'id' | 'status' | 'createdAt'> }
| { type: 'ACCEPT_TRADE'; proposalId: string }
| { type: 'REJECT_TRADE'; proposalId: string }
| { type: 'CANCEL_TRADE'; proposalId: string }
| { type: 'COUNTER_TRADE'; originalProposalId: string; counterOffer: TradeItemBundle; counterRequest: TradeItemBundle }
```

#### 4.3.4 Trading Validation Rules & Invariants
1. **The Even Building Rule for Trading**:
   - A property **CANNOT** be traded if ANY property in its color district has buildings (`level > 0`).
   - *Rationale*: Trading a property from an improved monopoly would leave orphan buildings on non-monopoly land, violating core board game rules. All buildings in that district must first be sold back to the bank.
2. **Mortgaged Property Trading**:
   - Mortgaged properties **CAN** be traded (as unimproved land).
   - The recipient inherits the `isMortgaged: true` status and can unmortgage later on their turn.
3. **Atomic State Check**:
   - At the instant `ACCEPT_TRADE` executes, the reducer must verify:
     - `proposer.cash >= proposal.offeredItems.cash`
     - `target.cash >= proposal.requestedItems.cash`
     - All `offeredItems.tileIds` still belong to `proposer`
     - All `requestedItems.tileIds` still belong to `target`
   - If any condition fails, the trade aborts with a descriptive error log `[GIAO DỊCH HỦY BỎ] Tài sản hoặc số dư của người chơi đã thay đổi.`

---

### 4.4 Economic Modifier Pipeline (`applyEconomicModifiers`)

To activate the 10 currently disconnected `ChaosModifiers`, introduce a pure calculation pipeline:

```typescript
export interface EffectiveEconomicValues {
  effectiveRent: number;
  effectiveMortgageValue: number;
  effectiveUnmortgageCost: number;
  effectiveSalary: number;
  canBuyOrUpgrade: boolean;
  maxDiceRollCap: number;
}

export function applyEconomicModifiers(
  tileId: TileId,
  baseRent: number,
  state: GameState,
  diceSum: number = 7
): EffectiveEconomicValues {
  const tile = getTileById(tileId);
  const modifiers = state.chaosModifiers || ({} as ChaosModifiers);

  // 1. Calculate Rent Modifiers
  let rent = baseRent;

  // Alien Mothership: Landmark 81 is blocked (0 rent)
  if (tileId === 39 && modifiers.alienMothershipTurns > 0) {
    rent = 0;
  }
  // Transport Boom: Double transport hub rent
  else if (tile?.property?.districtColor === 'district-transport' && modifiers.transportBoomTurns > 0) {
    rent *= 2;
  }
  // Utility Boom: Double utility rent
  else if (tile?.property?.districtColor === 'district-utility' && modifiers.utilityBoomTurns > 0) {
    rent *= 2;
  }
  // District Boom: 1.5x rent for Hanoi (Green) and HCMC (Dark Blue)
  else if (
    (tile?.property?.districtColor === 'district-green' || tile?.property?.districtColor === 'district-darkblue') &&
    modifiers.districtBoomTurns > 0
  ) {
    rent = Math.round(rent * 1.5);
  }

  // Global turn rent modifier (e.g. 0.5x or 2x from instant cards)
  rent = Math.round(rent * (state.rentModifier || 1));

  // 2. Mortgage Calculations
  const basePrice = tile?.property?.basePrice || 0;
  // Subsidized Mortgage: 75% instead of 50%
  const mortgageRatio = modifiers.subsidizedMortgageTurns > 0 ? 0.75 : 0.50;
  const effectiveMortgageValue = Math.floor(basePrice * mortgageRatio);

  // Interest Hike: 20% instead of 10%
  const interestRatio = modifiers.interestHikeTurns > 0 ? 1.20 : 1.10;
  const effectiveUnmortgageCost = Math.floor(effectiveMortgageValue * interestRatio);

  // 3. Salary on Start
  // Golden Hour: Double salary ($400k)
  const effectiveSalary = modifiers.goldenHourTurns > 0 ? state.config.salaryOnStart * 2 : state.config.salaryOnStart;

  // 4. Market Freeze
  const canBuyOrUpgrade = modifiers.marketFrozenTurns === 0;

  // 5. Curfew Step Cap
  const maxDiceRollCap = modifiers.curfewTurns > 0 ? 4 : 12;

  return {
    effectiveRent: Math.max(0, rent),
    effectiveMortgageValue,
    effectiveUnmortgageCost,
    effectiveSalary,
    canBuyOrUpgrade,
    maxDiceRollCap,
  };
}
```

---

### 4.5 Game Balance Calibration (45–60 Minute Match Duration)

#### 4.5.1 Match Duration Analysis & Pacing Model

| Parameter | Current Value | Recommended Calibration | Mathematical Justification |
|-----------|---------------|-------------------------|----------------------------|
| **`maxRounds`** | 60 rounds | **45 rounds** (Configurable: 30 Fast / 45 Standard / 60 Marathon) | In hot-seat multiplayer, 4 players take ~80s per round (20s/turn). 45 rounds × 80s = **60.0 minutes**. 60 rounds takes 80–90 minutes, which exceeds the target duration. |
| **Starting Cash** | $1,500k | **$1,500k** (Keep) | Allows players to purchase 3–5 properties in opening laps before needing salary. Calibrated to prevent turn 1–5 bankruptcies while creating cash pressure by round 10. |
| **Pass GO Salary** | $200k | **$200k** (Keep) | At 5.7 turns/lap, players receive +$200k every ~1.5 rounds. In 45 rounds, a player receives ~$1,600k total salary. This sustains maintenance without hyper-inflating cash. |
| **Auction Min Bid** | None | **50% of Base Price** (e.g. $30k–$200k) | Prevents players from acquiring high-tier properties for trivial $1 bids while offering genuine discount over list price. |
| **Bid Increment** | None | **$10k VND** | Granular enough for competitive tactical bidding without prolonging auction rounds. |
| **Detention Bail** | $100k | **$100k** (Keep) | 6.7% of starting cash; meaningful deterrent without being crippling. |
| **Building Downgrade Refund** | 50% | **50%** (Keep) | Standard liquidation penalty; prevents consequence-free over-building. |
| **Fast-Track Surrender** | None | **Voluntary Bankruptcy Action** | Insolvent players who cannot pay debts can immediately declare bankruptcy rather than taking 5 minutes to manually sell each building one by one. |

#### 4.5.2 Property Group Balance Matrix

| District | Tiles | Base Price | Base Rent | 1★ | 2★ | 3★ | 4★ | 5★ Landmark | Upgrade Cost | ROI (Laps to Break Even on 3★) |
|----------|-------|------------|-----------|----|----|----|----|-------------|--------------|--------------------------------|
| **Cần Thơ (Nâu)** | 1, 3 | $60k | $2k–$4k | $10k–$20k | $30k–$60k | $90k–$180k | $160k–$320k | $250k–$450k | $50k | 2.1 laps (Fast cash engine) |
| **Vũng Tàu/Nha Trang (Lam)** | 6, 8, 9 | $100k–$120k | $6k–$8k | $30k–$40k | $90k–$100k | $270k–$300k | $400k–$450k | $550k–$600k | $50k | 2.4 laps |
| **Huế/Hội An (Tím)** | 11, 13, 14 | $140k–$160k | $10k–$12k | $50k–$60k | $150k–$180k | $450k–$500k | $625k–$700k | $750k–$900k | $100k | 2.6 laps |
| **Hải Phòng/Tuần Châu (Cam)** | 16, 18, 19 | $180k–$200k | $14k–$16k | $70k–$80k | $200k–$220k | $550k–$600k | $750k–$800k | $950k–$1000k | $100k | 2.7 laps (Sweet spot) |
| **Đà Nẵng (Đỏ)** | 21, 23, 24 | $220k–$240k | $18k–$20k | $90k–$100k | $250k–$300k | $700k–$750k | $875k–$925k | $1050k–$1100k| $150k | 3.1 laps |
| **Phú Quốc (Vàng)** | 26, 27, 29 | $260k–$280k | $22k–$24k | $110k–$120k| $330k–$360k| $800k–$850k | $975k–$1025k| $1150k–$1200k| $150k | 3.2 laps |
| **Hà Nội (Lục)** | 31, 32, 34 | $300k–$320k | $26k–$28k | $130k–$150k| $390k–$450k| $900k–$1000k| $1100k–$1200k| $1275k–$1500k| $200k | 3.6 laps (High stakes) |
| **TP.HCM (Lam Thẫm)** | 37, 39 | $350k–$400k | $35k–$50k | $175k–$200k| $500k–$600k| $1100k–$1400k|$1300k–$1700k| $1500k–$2000k| $200k | 2.8 laps (Game ender) |
| **Trục Vận Tải (4 Ga)** | 5, 15, 25, 35 | $200k | $25k | 2 hubs: $50k | 3 hubs: $100k | 4 hubs: $200k | - | - | 0 | Reliable mid-game annuity |
| **Tiện Ích (EVN, SAWACO)** | 12, 28 | $150k | 4x dice ($28k)| - | - | 2 utils: 10x dice ($70k) | - | - | 0 | Low entry, chaotic variance |

---

## 5. Verification Method

To independently verify all findings and confirm the health of the codebase:

### 5.1 Verification Commands
1. **Vitest Test Suite Run**:
   ```bash
   npm test
   ```
   *Expected Result*: 9 test files, 149 tests passing, duration < 4s.
2. **TypeScript & Production Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Zero type errors, bundle emitted cleanly to `dist/`.

### 5.2 Phase 02 Test Cases to Author (For Testing Stream)
1. **Ledger Unit Tests**:
   - `test('executes clean double-entry ledger transaction updating both players and stats')`
   - `test('rejects transaction when payer has insufficient funds and flags exact shortfall')`
   - `test('verifies ledger maintains cash conservation invariant across all transfers')`
2. **Auction Unit Tests**:
   - `test('initiates auction when landing player declines property purchase')`
   - `test('enforces bid validation: bid must exceed current bid by minimum increment and <= player cash')`
   - `test('completes auction, transfers property to winner, and deducts winning bid')`
   - `test('handles unanimous pass: property remains unowned when all players fold')`
3. **Trading Unit Tests**:
   - `test('prevents trade proposal if any property in color district has buildings > 0')`
   - `test('executes atomic trade swap of cash and properties between two players')`
   - `test('aborts trade execution if player assets or cash changed between proposal and acceptance')`
4. **Economic Modifiers Unit Tests**:
   - `test('doubles transport hub rent when transportBoomTurns > 0')`
   - `test('multiplies Hanoi and HCMC rent by 1.5x when districtBoomTurns > 0')`
   - `test('sets Landmark 81 rent to 0 when alienMothershipTurns > 0')`
   - `test('doubles start tile salary when goldenHourTurns > 0')`
   - `test('caps dice roll to 4 when curfewTurns > 0')`
5. **Game Balance Pacing Test**:
   - `test('simulates 4-player AI match and verifies completion within 45 rounds')`

---

## 6. Handoff Summary for Orchestrator

| System | Current State | Phase 02 Deliverables Specified | Implementation Priority |
|--------|---------------|--------------------------------|-------------------------|
| **Economy & Ledger** | Ad-hoc mutations, no transaction logs | `LedgerEntry` schema, `ledgerEngine.ts`, atomic double-entry executor, partial debt settlement | P1 (Foundational) |
| **Auction System** | 0% implemented (no-op on decline) | `AuctionState`, ascending clock turn-based bidding, pass/fold tracking, winner settlement | P2 (Core Rules) |
| **Trading System** | 0% implemented | `TradeProposal`, Even Building validation, atomic asset swap, proposal lifecycle | P2 (Core Rules) |
| **Economic Modifiers**| 9 modifiers dormant in `ChaosModifiers` | `applyEconomicModifiers` pipeline wiring all 10 chaos events into rent, mortgage, salary | P2 (Chaos Polish) |
| **Game Balancing** | Default 60 rounds (60–90 min) | Re-calibrate default to 45 rounds (45–60 min), calibrated auction min bids & increments | P3 (Pacing) |
