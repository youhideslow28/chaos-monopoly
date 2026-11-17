# Project: CHAOS MONOPOLY — Phase 02: Complete Game Systems

## Architecture
CHAOS MONOPOLY Phase 02 completes all core game systems, economic transaction handling, property auctions, player-to-player trading, state persistence, and full UI integration.

The architecture comprises:
- **Core Game Engine & FSM (`src/game/`)**: Pure functional reducer governing turn lifecycle, 2d6 movement, double-roll rules, jail detention, start tile bonuses, tax, and property ownership.
- **Centralized Ledger Engine (`src/game/economy/ledgerEngine.ts`)**: Server-independent, double-entry financial ledger enforcing cash conservation, atomic transactions, typed event categories, and comprehensive audit history.
- **Economic Modifiers Pipeline (`src/game/economy/economicModifiers.ts`)**: Connects all 10 Chaos Modifiers (transportBoom, utilityBoom, districtBoom, goldenHour, curfew, alienMothership, interestHike, subsidizedMortgage, marketFrozen) into rent, mortgage, salary, and movement formulas.
- **Auction Engine (`src/game/auction/auctionEngine.ts`)**: Ascending clock auction state machine handling property auction initiation on decline-to-buy, turn-based bidding, increments (+10M, +25M, +50M, +100M), pass/fold tracking, and transfer to highest bidder.
- **Trading Engine (`src/game/trade/tradeEngine.ts`)**: Bilateral trade state machine managing proposals, counter-offers, Even Building / unimproved district validation, and atomic swaps of cash, properties, and detention cards.
- **Match State & Persistence Service (`src/game/storage/matchStorage.ts`)**: Versioned schema (`SCHEMA_VERSION = 2`), localStorage auto-saving with 300ms debounce, corruption fallback, startup recovery prompt, and action idempotency buffer.
- **Presentation Layer & UI Modals (`src/components/`)**: React 18 + Tailwind CSS with 2.5D GPU-accelerated isometric perspective, dedicated modals for Auctions (`AuctionModal`), Trading (`TradeModal`), Jail decisions (`JailModal`), Debt settlement (`DebtSettlementModal`), and Leaderboard (`VictoryModal`).
- **QA & E2E Test Suite (`src/game/__tests__/e2e/`)**: 4-Tier test matrix (T1: Feature coverage, T2: Boundary cases, T3: Pairwise cross-feature, T4: Real-world match scenarios) running via Vitest.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Centralized Ledger & Double-Entry Accounting | `LedgerEntry` schema, atomic double-entry balance transfers, transaction log | M1 | Survey 2 |
| 2 | Cash Invariant & Balance Validation | Non-negative cash invariant, rejection of invalid withdrawals, balance audit | M1 | ORIGINAL_REQUEST |
| 3 | Partial Debt Settlement | Ability to pay down debt incrementally during liquidation | M1 | Survey 2 |
| 4 | Economic Modifiers Pipeline | Wire 10 dormant Chaos Modifiers into rent, mortgage, salary, movement | M1 | Survey 1 & 2 |
| 5 | Start Tile Rewards Polish | Passing salary ($200k), landing bonus ($400k), Golden Hour 2x multiplier | M1 | Survey 1 |
| 6 | 2d6 Movement & Doubles Overhaul | Roll doubles move on jail escape, apply reverse direction and curfew caps | M1 | Survey 1 |
| 7 | Jail & Detention Overhaul | Fix double-decrement bug (3 turns max), force bail on turn 3, `jailFreeCards` | M1 | Survey 1 |
| 8 | Turn Ownership & Action Idempotency | `senderPlayerId` validation, action envelope with ring buffer idempotency | M1 | Survey 3 |
| 9 | Pure Reducer Decoupling | Decouple procedural sound effects from reducer to pure middleware/listeners | M1 | Survey 3 |
| 10 | Property Auction Initiation | Trigger auction when landing player declines/passes property purchase | M2 | ORIGINAL_REQUEST |
| 11 | Ascending Clock Bidding Engine | Opening bid (50% base price), quick increments, pass/fold tracking, timer | M2 | Survey 2 & 3 |
| 12 | Auction Resolution & Asset Transfer | Winner cash deduction, deed assignment, no-bid handling, anti-duplication | M2 | Survey 2 |
| 13 | Bilateral Trading Engine | Propose, counter, accept, reject, cancel trades (cash, properties, jail cards)| M2 | ORIGINAL_REQUEST |
| 14 | Unimproved District Validation | Enforce Even Building: no properties in district can have buildings when traded| M2 | Survey 2 |
| 15 | Atomic Trade Swap | Prevent stale offers, race conditions, and asset duplication during trade | M2 | Survey 2 |
| 16 | Match State Serialization & Persistence| `MatchStorageService` with schema v2, localStorage auto-save (debounced) | M3 | ORIGINAL_REQUEST |
| 17 | Browser Refresh Recovery | Startup prompt to resume unfinished match, corrupted state graceful fallback| M3 | Survey 3 |
| 18 | Auction Modal UI | Live bidding console, bid increments, timer countdown, 2.5D deed card | M3 | Survey 3 |
| 19 | Trade Modal UI | 2-player swap interface, property checklists, cash sliders, accept/reject | M3 | Survey 3 |
| 20 | Jail Decision Modal / Dock UI | 3 clear choices (Pay $50k bail, Roll for doubles, Use card) with turn count | M3 | Survey 3 |
| 21 | Debt Settlement Modal UI | Emergency liquidation console with 1-click mortgage/downgrade and debt pay | M3 | Survey 3 |
| 22 | Victory & Leaderboard Modal UI | 1st to 4th place ranking, net worth breakdown, match stats, rematch flow | M3 | Survey 1 & 3 |
| 23 | Game Balance Pacing Calibration | Standard 45 rounds cap (~45-60 min target), calibrated cash & rent curves | M3 | Survey 2 |
| 24 | E2E Testing Track: Tier 1 Features | >=5 tests per core feature (>=50 tests total) | M4 | Project Pattern |
| 25 | E2E Testing Track: Tier 2 Boundaries | >=5 tests per feature for edge cases & limits (>=50 tests total) | M4 | Project Pattern |
| 26 | E2E Testing Track: Tier 3 Pairwise | Pairwise cross-feature interaction suites (>=30 tests total) | M4 | Project Pattern |
| 27 | E2E Testing Track: Tier 4 Scenarios | Realistic full 2P, 3P, 4P games and refresh recovery (>=15 tests total) | M4 | Project Pattern |
| 28 | Tier 5 Adversarial Hardening | Stress testing, edge case mutation, invariant audit | M4 | Project Pattern |
| 29 | Forensic Integrity Audit | Independent verification of zero cheating, genuine implementations | M4 | Hard Constraint |
| 30 | Project Documentation Suite | docs/CHANGELOG.md, KNOWN_ISSUES.md, TEST_REPORT.md, PROJECT_STATUS.md | M4 | ORIGINAL_REQUEST |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Rules & Economy Ledger | Features 1–9: Central Ledger, FSM ownership/idempotency, movement/doubles fixes, start tile rewards, jail detention overhaul, economic modifiers pipeline, pure reducer decoupling | none | PLANNED |
| M2 | Auction & Trading Systems | Features 10–15: Ascending clock auction engine, bilateral trading engine, unimproved district validation, atomic trade execution, reducer integration | M1 | PLANNED |
| M3 | Match State Persistence & UI Integration | Features 16–23: localStorage persistence & refresh recovery, AuctionModal, TradeModal, JailModal, DebtSettlementModal, VictoryLeaderboardModal, game balance calibration (45 rounds) | M1, M2 | PLANNED |
| M4 | E2E Test Suite (Tiers 1-4) & Final Verification | Features 24–30: Complete opaque-box E2E test suites (Tiers 1-4), Tier 5 adversarial hardening, forensic audit, documentation updates, clean build | M1, M2, M3 | PLANNED |

---

## Interface Contracts

### 1. Ledger Subsystem (`src/game/economy/ledgerEngine.ts`)
```typescript
export type TransactionCategory =
  | 'SALARY_START'
  | 'RENT_PAYMENT'
  | 'PROPERTY_PURCHASE'
  | 'PROPERTY_UPGRADE'
  | 'PROPERTY_DOWNGRADE'
  | 'PROPERTY_MORTGAGE'
  | 'PROPERTY_UNMORTGAGE'
  | 'TAX_PAYMENT'
  | 'BAIL_PAYMENT'
  | 'AUCTION_WIN'
  | 'TRADE_CASH'
  | 'CHAOS_EFFECT'
  | 'DEBT_SETTLEMENT';

export interface LedgerEntry {
  id: string;
  timestamp: number;
  roundNumber: number;
  fromPlayerId: string | 'BANK';
  toPlayerId: string | 'BANK';
  amount: number;
  category: TransactionCategory;
  memo: string;
}

export interface LedgerResult {
  success: boolean;
  entry: LedgerEntry | null;
  error?: string;
  newPlayers: PlayerState[];
}
```

### 2. Auction Subsystem (`src/game/auction/auctionEngine.ts`)
```typescript
export interface AuctionState {
  propertyId: number;
  highestBid: number;
  highestBidderId: string | null;
  currentTurnBidderId: string;
  activeBidderIds: string[]; // players who haven't folded
  consecutivePasses: number;
  turnTimerSeconds: number;
  status: 'ACTIVE' | 'RESOLVED' | 'NO_BIDS';
}
```

### 3. Trading Subsystem (`src/game/trade/tradeEngine.ts`)
```typescript
export interface TradeProposal {
  id: string;
  senderPlayerId: string;
  targetPlayerId: string;
  offeredCash: number;
  offeredPropertyIds: number[];
  offeredJailCards: number;
  requestedCash: number;
  requestedPropertyIds: number[];
  requestedJailCards: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
}
```

### 4. Storage Subsystem (`src/game/storage/matchStorage.ts`)
```typescript
export interface SavedMatchData {
  version: 2;
  savedAt: number;
  gameState: GameState;
  ledgerHistory: LedgerEntry[];
  activeAuction: AuctionState | null;
  activeTrade: TradeProposal | null;
}
```

---

## Code Layout
- `src/game/types/index.ts` — Shared domain types, FSM phases, actions, ledger and auction/trade schemas
- `src/game/economy/ledgerEngine.ts` — Central double-entry transaction handling and audit ledger
- `src/game/economy/economicModifiers.ts` — Pipeline applying Chaos modifiers to rents, salaries, taxes
- `src/game/auction/auctionEngine.ts` — Auction state machine, bid validation, timer, and resolution
- `src/game/trade/tradeEngine.ts` — Trade proposal lifecycle, unimproved district validation, atomic swaps
- `src/game/storage/matchStorage.ts` — LocalStorage persistence, versioning, refresh recovery
- `src/game/gameReducer.ts` — Core state reducer orchestrating all engine modules
- `src/components/modals/AuctionModal.tsx` — Auction bidding console
- `src/components/modals/TradeModal.tsx` — Bilateral trading console
- `src/components/modals/JailModal.tsx` — Detention decision interface
- `src/components/modals/DebtSettlementModal.tsx` — Emergency liquidation modal
- `src/components/modals/VictoryModal.tsx` — Full leaderboard & endgame stats
- `src/game/__tests__/e2e/` — Opaque-box E2E test suites (Tiers 1-4)
- `docs/` — CHANGELOG.md, KNOWN_ISSUES.md, TEST_REPORT.md, PROJECT_STATUS.md
