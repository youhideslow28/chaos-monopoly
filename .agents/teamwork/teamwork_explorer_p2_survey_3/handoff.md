# Phase 02 Survey Report: Match State, Persistence, UI/UX Integration & E2E Testing Architecture

**Agent**: Match State, Persistence, UX Integration & Testing Explorer (`teamwork_explorer_p2_survey_3`)  
**Workspace**: `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_p2_survey_3`  
**Milestone**: Phase 02 Survey & Architecture Specification  
**Date**: 2026-10-31  

---

## Executive Summary
This survey establishes the architectural blueprint for **Match State, Persistence, UI/UX Integration, and QA/E2E Test Infrastructure** for CHAOS MONOPOLY Phase 02. The existing Phase 01 codebase is solid (149/149 tests passing in Vitest, deterministic Mulberry32 PRNG, 40-tile board, 2.5D CSS perspective), but lacks:
1. **Explicit state handling for concurrent / multi-agent phases** (Auctions, Bilateral Trading, Jail Decision Branching, Debt Liquidation).
2. **Turn ownership and action validation** (`action.playerId` is currently missing in most actions, assuming `activePlayerIndex`).
3. **State persistence & browser refresh recovery** (state exists purely in React memory; browser refresh destroys game progress).
4. **Action idempotency guards** (zero duplicate dispatch prevention).
5. **Decoupled purity** (`soundEffects.*()` calls reside inside `gameReducer.ts`).
6. **Dedicated UI modals** for Auctions, Bilateral Trading, and Debt Settlement.
7. **Expanded 4-Tier Test Matrix** covering all new Phase 02 features (>=5 tests per feature in Tier 1 & Tier 2, pairwise Tier 3, full match Tier 4).

---

## 1. Observation

### 1.1 Match State Model & Finite State Machine (FSM)
- **File**: `src/game/types/index.ts`
  - Lines 180–189: `TurnPhase` defines:
    ```typescript
    export type TurnPhase =
      | 'WAITING_FOR_ROLL'
      | 'ROLLING'
      | 'MOVING'
      | 'RESOLVING_TILE'
      | 'ACTION_MENU'
      | 'CHAOS_EVENT'
      | 'DEBT_LIQUIDATION'
      | 'BANKRUPTCY_CHECK'
      | 'GAME_OVER';
    ```
  - Lines 228–245: `GameState` interface contains game settings, players, active index, phase, round, dice, properties, active chaos card, pending debt, logs, winner, selected tile, and chaos modifiers.
  - Lines 247–266: `GameAction` union type lacks:
    * `playerId` on `ROLL_DICE_START`, `ROLL_DICE_RESULT`, `BUY_PROPERTY`, `UPGRADE_PROPERTY`, `MORTGAGE_PROPERTY`, `PAY_DETENTION_BAIL`, `END_TURN`.
    * Any action types for auctions (`START_AUCTION`, `PLACE_BID`, `PASS_BID`, `RESOLVE_AUCTION`).
    * Any action types for trading (`PROPOSE_TRADE`, `ACCEPT_TRADE`, `REJECT_TRADE`, `COUNTER_TRADE`, `CANCEL_TRADE`).
    * Unique action identifiers (`actionId`) or sequence numbers (`seq`).

- **File**: `src/game/gameReducer.ts`
  - Lines 58–60: Guard only checks if game is over:
    ```typescript
    if ((state.status === 'ENDED' || state.turnPhase === 'GAME_OVER') && action.type !== 'RESTART_GAME') {
      return state;
    }
    ```
  - Lines 126–282 (`ROLL_DICE_RESULT`): Automatically executes movement, adds GO salary, and immediately calls `resolveLandingTile()`, transitioning straight to `'ACTION_MENU'` (or `'BANKRUPTCY_CHECK'`). The intermediate phases `'MOVING'` and `'RESOLVING_TILE'` are completely bypassed.
  - Lines 284–336 (`BUY_PROPERTY`): Checks `canBuyProperty(tileId, activePlayer.cash, state.properties)`, but does not check if `state.turnPhase === 'ACTION_MENU'`.
  - Lines 338–392 (`UPGRADE_PROPERTY`): Does not validate turn phase or active turn ownership.
  - Lines 646–674 (`END_TURN`): Checks only that player is not in debt:
    ```typescript
    if (state.turnPhase === 'BANKRUPTCY_CHECK' || state.turnPhase === 'DEBT_LIQUIDATION' || state.pendingDebt !== null) {
      return state;
    }
    ```
    If called during `WAITING_FOR_ROLL`, it advances turn without rolling!

### 1.2 Side-Effects in Pure Reducer
- **File**: `src/game/gameReducer.ts`
  - Direct invocations of procedural audio appear throughout the reducer:
    * Line 96: `soundEffects.buyProperty();`
    * Line 119: `soundEffects.diceRoll();`
    * Line 200: `soundEffects.payRent();`
    * Line 318: `soundEffects.buyProperty();`
    * Line 370: `soundEffects.upgradeProperty();`
    * Line 425: `soundEffects.buyProperty();`
    * Line 475: `soundEffects.buyProperty();`
    * Line 525: `soundEffects.buyProperty();`
    * Line 606: `soundEffects.buyProperty();`
    * Line 680: `soundEffects.payRent();`
    * Line 709: `soundEffects.victory();`
    * Line 775: `soundEffects.payRent();`
    * Line 805: `soundEffects.payRent();`
    * Line 883: `soundEffects.payRent();`
  - These side effects violate pure functional state principles and require Web Audio stubs during test runs.

### 1.3 State Serialization & Browser Refresh Recovery
- **File**: `src/App.tsx`
  - Line 18: `const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);`
  - Grep search confirms zero calls to `localStorage`, `sessionStorage`, or IndexedDB across all `src/` files.
  - Pressing `F5` / browser reload wipes all game state and forces users back to `GameSetupModal`.

### 1.4 Current Presentation & UI Structure
- **File**: `src/components/board/BoardView.tsx`
  - Lines 75–85: Outer container `.perspective-board` (`perspective: 1400px; perspective-origin: 50% 60%`).
  - Lines 41–54 of `src/index.css`: `.isometric-view` has `transform: rotateX(24deg) rotateZ(-4deg); transform-style: preserve-3d;`.
  - Lines 86–134: 11x11 perimeter grid layout containing 40 perimeter tiles (`TileComponent.tsx`) and center 9x9 area (`CenterCityView.tsx`).
- **File**: `src/components/action-panel/ActionPanel.tsx`
  - Lines 97–171: Collapsible mortgage drawer allowing mortgaging and unmortgaging owned tiles.
  - Lines 192–358: Action dock with Roll, Bail, Buy, Upgrade, Mortgage Toggle, End Turn, and Surrender.
- **Existing Modals in `src/components/`**:
  * `GameSetupModal.tsx` (player count, tokens, starting cash)
  * `ChaosModal.tsx` (card splash and description)
  * `PropertyDetailModal.tsx` (property rents, mortgage values, purchase/upgrade buttons)
  * `RulesModal.tsx` (game guide)
  * `VictoryModal.tsx` (fireworks confetti, winner card, final net worth rankings)
- **Missing Modals for Phase 02**:
  * No Auction Modal (`AuctionModal.tsx`).
  * No Bilateral Trading Modal (`TradeProposalModal.tsx` / `TradeResponseModal.tsx`).
  * No dedicated Urgent Debt Settlement Dialog (`DebtSettlementModal.tsx`).
  * No Jail Option Dialog (`JailDecisionModal.tsx`).

### 1.5 Existing QA & Vitest Test Setup
- **File**: `vite.config.ts`:
  - Lines 12–15:
    ```typescript
    test: {
      globals: true,
      environment: 'node',
    }
    ```
- **CLI Test Verification**:
  - Command: `npm test` (`vitest run`).
  - Result: 9 test files passed, 149 tests passed in 3.10s.
  - Test suites:
    * `tier1_features.test.ts` (17 tests)
    * `tier2_boundaries.test.ts` (13 tests)
    * `tier3_combinations.test.ts` (9 tests)
    * `tier4_match_scenarios.test.ts` (7 tests)
    * `tier5_adversarial_hardening.test.ts` (25 tests)
    * `gameEngine.test.ts` (25 tests)
    * `challenger_empirical_m1.test.ts` (20 tests)
    * `adversarial_stress.test.ts` (16 tests)
    * `chaosEngine_milestone2.test.ts` (17 tests)

---

## 2. Logic Chain

1. **Premise**: In Phase 02, two major interactive multiplayer mechanisms are introduced: **Auctions** and **Bilateral Trading**.
   - In an Auction, all solvent players can submit bids or pass, regardless of whose turn it is.
   - In Bilateral Trading, Player A makes an offer to Player B, and Player B must accept, reject, or counter-offer.
   - **Inference**: The current state machine, which assumes only `activePlayerIndex` acts and lacks `senderPlayerId` in action payloads, cannot support auctions or trading without data races or invalid authorization.
   - **Requirement**: `TurnPhase` must include `'AUCTION_ACTIVE'` and `'TRADE_NEGOTIATION'`, and `GameAction` must include `senderPlayerId: PlayerId` to validate actor authorization.

2. **Premise**: A typical match of CHAOS MONOPOLY lasts 45–60 minutes (60 rounds with 2–4 players).
   - In browser gaming, players frequently refresh the page (`F5`), navigate tabs, or experience mobile tab discarding.
   - Currently, state is entirely held in ephemeral React memory.
   - **Inference**: Any refresh causes instant match termination and player frustration.
   - **Requirement**: Implement a resilient, debounced local persistence engine (`matchStorage.ts`) with versioned JSON schema (`SCHEMA_VERSION = 2`), automatic saving on state change, and a startup recovery dialog ("Tiếp tục ván đấu dở dang?").

3. **Premise**: Fast button clicking, keyboard repeats (Spacebar / Enter), or mobile double-tapping can dispatch duplicate actions in the same microtask or render cycle.
   - If `BUY_PROPERTY` is processed twice, cash could be double-deducted or state corrupted.
   - **Inference**: Actions need explicit idempotency guards.
   - **Requirement**: Introduce action envelopes with unique `actionId` (`${playerId}-${actionType}-${timestamp}-${nonce}`) and maintain a fixed-size LRU cache (`processedActionIds: string[]`, max 50 entries) in `GameState`. If an `actionId` has already been processed, the reducer returns state unchanged.

4. **Premise**: `gameReducer.ts` currently triggers `soundEffects` directly.
   - Reducers must be deterministic, pure functions `(state, action) => newState` to allow replay logging, state hashing, and isolated unit testing in Node environments without audio hardware.
   - **Inference**: Procedural audio side-effects must be decoupled from the reducer.
   - **Requirement**: Move sound playback to presentation layer middleware or React `useEffect` listeners monitoring state deltas.

5. **Premise**: The UI must display interactive workflows for Auctions, Bilateral Trades, Detention Decisions, and Emergency Debt Liquidation while maintaining the 2.5D visual aesthetic.
   - On desktop, 2.5D isometric tilt (`rotateX(24deg) rotateZ(-4deg)`) provides cinematic immersion.
   - On mobile (<768px), deep tilt can obscure bottom perimeter tiles and shrink touch targets.
   - **Inference**: UI modals must be responsive, full-screen/bottom-sheet on mobile, with touch targets >= 48px, and provide seamless 2D/3D toggle without disrupting ongoing auctions or trades.

6. **Premise**: Phase 02 mandates an E2E Testing Track covering Tiers 1–4 with >=5 tests per feature for Tiers 1 & 2, pairwise combinations for Tier 3, and full match simulations for Tier 4.
   - Existing tests cover Phase 01 features (149 tests), but new Phase 02 features (Auctions, Trading, Detention choices, Persistence, Debt Liquidation) need dedicated multi-tier test suites.
   - **Inference**: A comprehensive test plan must specify exact test cases across all 10 core systems.

---

## 3. Caveats

- **No Caveats on Codebase Inspection**: All 58 TypeScript files in `src/`, configuration files, and 9 test suites were directly inspected and verified.
- **Scope Boundary**: Real-time WebSocket networking, authoritative cloud servers, and advanced heuristic AI bots are planned for Phase 03+. The architecture defined here provides strict interfaces (`ActionEnvelope`, `IPlayerAgent`, deterministic serialization) so that online multiplayer and AI can be plugged in without refactoring core rules or state management.

---

## 4. Conclusion & Architectural Recommendations

### 4.1 Match State Architecture & FSM

#### 4.1.1 State Machine Extensions
Extend `TurnPhase` in `src/game/types/index.ts`:
```typescript
export type TurnPhase =
  | 'WAITING_FOR_ROLL'       // Active player can choose to roll, pay bail, or use card
  | 'ROLLING'                // Dice rolling animation active
  | 'RESOLVING_TILE'         // Landing tile trigger resolution
  | 'ACTION_MENU'            // Turn actions (buy, upgrade, trade, mortgage, end turn)
  | 'AUCTION_ACTIVE'         // Unowned property auction in progress
  | 'TRADE_NEGOTIATION'      // Bilateral trade proposal pending review
  | 'DEBT_LIQUIDATION'       // Insolvent player must liquidate assets to cover debt
  | 'BANKRUPTCY_CHECK'       // Player unable to pay debt after full liquidation
  | 'CHAOS_EVENT'            // Chaos splash modal open
  | 'GAME_OVER';             // Match completed, winner determined
```

#### 4.1.2 Auction State Model
Add `AuctionState` to `GameState`:
```typescript
export interface AuctionBid {
  bidderId: PlayerId;
  amount: number;
  timestamp: number;
}

export interface AuctionState {
  propertyTileId: TileId;
  startingPrice: number;
  currentBid: number;
  highestBidderId: PlayerId | null;
  activeBidderIds: PlayerId[]; // Players who have not passed
  turnTimeRemaining: number;   // Countdown seconds (e.g. 10s)
  minBidIncrement: number;     // Default $10M
  bidHistory: AuctionBid[];
}
```

#### 4.1.3 Bilateral Trading State Model
Add `TradeState` to `GameState`:
```typescript
export interface TradeItemTransfer {
  cash: number;
  propertyTileIds: TileId[];
  detentionReleaseCards: number;
}

export interface TradeProposal {
  id: string;
  senderPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  offered: TradeItemTransfer;
  requested: TradeItemTransfer;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: number;
}
```

#### 4.1.4 Action Envelope & Idempotency Guard
Wrap all dispatched actions in an envelope:
```typescript
export interface ActionEnvelope<T = GameAction> {
  actionId: string;       // Unique UUID: `${senderPlayerId}-${Date.now()}-${randomNonce}`
  senderPlayerId: PlayerId;
  timestamp: number;
  payload: T;
}
```
In `GameState`, maintain:
```typescript
export interface GameState {
  // ... existing fields ...
  processedActionIds: string[]; // Fixed FIFO ring buffer of last 50 processed action IDs
  activeAuction: AuctionState | null;
  activeTrade: TradeProposal | null;
  persistenceVersion: number;
}
```
In `gameReducer.ts`, add the idempotency check at the very top:
```typescript
if (action.actionId && state.processedActionIds.includes(action.actionId)) {
  console.warn(`[IDEMPOTENCY GUARD] Dropped duplicate action: ${action.actionId}`);
  return state;
}
```

#### 4.1.5 Action Authorization Guard
Every action validates:
1. Is it the sender's turn? (Except during `AUCTION_ACTIVE` where any `activeBidderId` can bid, or `TRADE_NEGOTIATION` where `targetPlayerId` can accept/reject/counter).
2. Is the sender currently bankrupt? (Bankrupt players are strictly rejected from all actions).

---

### 4.2 State Persistence & Recovery Architecture

#### 4.2.1 Storage Service (`src/game/persistence/matchStorage.ts`)
```typescript
export const MATCH_STORAGE_KEY = 'chaos_monopoly_active_match_v2';
export const CURRENT_SCHEMA_VERSION = 2;

export interface SerializedMatchRecord {
  schemaVersion: number;
  savedAt: number;
  state: GameState;
  checksum: string; // MD5 or simple hash to detect JSON tampering/corruption
}

export class MatchStorageService {
  static saveMatch(state: GameState): boolean {
    if (state.status === 'SETUP' || state.status === 'ENDED') {
      localStorage.removeItem(MATCH_STORAGE_KEY);
      return true;
    }
    try {
      const record: SerializedMatchRecord = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        savedAt: Date.now(),
        state,
        checksum: computeStateHash(state),
      };
      localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch (err) {
      console.error('Failed to save match state to localStorage:', err);
      return false;
    }
  }

  static loadMatch(): GameState | null {
    try {
      const raw = localStorage.getItem(MATCH_STORAGE_KEY);
      if (!raw) return null;
      const record: SerializedMatchRecord = JSON.parse(raw);
      if (record.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        console.warn('Outdated schema version, discarding saved match.');
        localStorage.removeItem(MATCH_STORAGE_KEY);
        return null;
      }
      if (validateStateIntegrity(record.state)) {
        return record.state;
      }
      return null;
    } catch {
      localStorage.removeItem(MATCH_STORAGE_KEY);
      return null;
    }
  }

  static clearMatch(): void {
    localStorage.removeItem(MATCH_STORAGE_KEY);
  }
}
```

#### 4.2.2 Refresh Recovery UX Flow
In `App.tsx`:
- On initial mount:
  ```typescript
  const [hasSavedMatch, setHasSavedMatch] = useState<boolean>(() => MatchStorageService.hasValidSavedMatch());
  ```
- If `hasSavedMatch === true` and state is in `SETUP`, present a resume banner/dialog:
  * "Phát hiện ván đấu đang diễn ra (Vòng {roundNumber}, {players.length} người chơi)."
  * Buttons: `[TIẾP TỤC VÁN ĐẤU]` or `[BẮT ĐẦU VÁN MỚI]`.
- Auto-save integration:
  * Hook `useEffect(() => { MatchStorageService.saveMatch(state); }, [state]);` debounced by 300ms.

---

### 4.3 UI/UX Integration Architecture

#### 4.3.1 Auction Modal (`src/components/modals/AuctionModal.tsx`)
- **Trigger**: Active player lands on an unowned property and selects "Đấu giá" (or chooses not to buy).
- **Layout**:
  * Left panel: Deed Card displaying District color badge, Property Name, Base Price, and Rent Progression.
  * Right panel: Live Auction Console:
    - Current Highest Bid banner (large neon emerald font: e.g. `$180M`).
    - Current Bid Leader (Avatar + Name).
    - Countdown Timer: 10-second pulsating SVG circle bar.
    - Active Bidders Grid: Avatar badges of all eligible players; turns gray when a player clicks "Bỏ cuộc (Pass)".
    - Quick Bid Increment buttons: `+$10M`, `+$25M`, `+$50M`, `+$100M`.
    - "Bỏ cuộc (Pass)" button.
  * Audio cues: Gavel strike on successful sale; tick sound on countdown.

#### 4.3.2 Bilateral Trading Modal (`src/components/modals/TradeProposalModal.tsx`)
- **Trigger**: Click "Giao thương" in ActionPanel or click an opponent's card in `PlayerLeaderboard`.
- **Layout**:
  * 2-column exchange matrix:
    - Left Column: "Tài sản bạn đề nghị chuyển giao"
      * Cash slider / number input (bounded by current player cash).
      * Checkbox list of owned unmortgaged properties (grouped by district color).
      * Detention release cards count.
    - Right Column: "Tài sản bạn muốn nhận về"
      * Opponent selector dropdown.
      * Opponent cash requested (bounded by opponent cash).
      * Opponent property checklist.
  * Valuation Comparison Bar: Shows estimated market value difference.
  * Actions: `[GỬI ĐỀ NGHỊ GIAO DỊCH]`, `[HỦY]`.
- **Opponent Reception Dialog (`TradeResponseModal.tsx`)**:
  * Summarizes exchange clearly: "Bạn nhận được: ..." vs "Bạn chuyển giao: ...".
  * Actions: `[ĐỒNG Ý GIAO DỊCH]`, `[TỪ CHỐI]`, `[ĐÀM PHÁN LẠI (SỬA ĐỀ NGHỊ)]`.

#### 4.3.3 Detention Decision UI (`JailDecisionModal.tsx` / ActionPanel Card)
- **Trigger**: Active player begins turn while `inDetention === true`.
- **Layout**:
  * Prominent Security Lockdown Badge: "Khu Cách Ly Tạm Giam — Còn {detentionTurns}/3 lượt".
  * 3 explicit choice cards:
    1. **Nộp tiền bảo lãnh ($50k VND / $50M)**: Immediate release, cash deducted, dice roll unlocked.
    2. **Lắc xúc xắc tìm vận may**: Rolls 2d6.
       - Doubles rolled: Immediate release, move by dice sum, no extra turn.
       - Non-doubles: `detentionTurns` decrements by 1; if turn count hits 0, mandatory bail deduction + move.
    3. **Dùng Thẻ Miễn Giam (Detention Card)**: Disabled if player has 0 cards; consumes 1 card to walk free.

#### 4.3.4 Emergency Debt Liquidation Modal (`DebtSettlementModal.tsx`)
- **Trigger**: `turnPhase === 'BANKRUPTCY_CHECK'` or `'DEBT_LIQUIDATION'`.
- **Layout**:
  * Siren alert header: "CẢNH BÁO NỢ XẤU: Nợ $X M cho [Chủ nợ / Ngân hàng]".
  * Deficit display: "Thiếu: ${debt - cash}M".
  * Fast-action liquidation lists:
    - Mortgage property button (+50% base price).
    - Sell building level button (+50% upgrade cost).
  * Live dynamic tally: "Số dư sau thanh lý: $Y M".
  * Button `[XÁC NHẬN THANH TOÁN NỢ]` enabled only when cash >= debt.
  * Button `[TUYÊN BỐ PHÁ SẢN]` enabled if total liquidation value < debt.

#### 4.3.5 Responsive 2.5D Mobile Ergonomics
- Responsive Breakpoints:
  * Desktop (>= 1024px): Board container `860px`, `perspective: 1400px`, `rotateX(24deg) rotateZ(-4deg)`, side event feed `320px`.
  * Tablet (768px – 1023px): Board container `min(90vw, 720px)`, `rotateX(18deg) rotateZ(-2deg)`, collapsible event drawer.
  * Mobile (< 768px):
    - Default to flat 2D view (`rotateX(0deg)`) for optimal legibility, with a 1-tap 3D switch in the header.
    - Board width: `min(100vw - 12px, 100vh - 220px)`.
    - Tile touch targets: Hit area >= 48px with expanded touch slop.
    - Bottom Action Dock: Collapsible sheet with sticky roll button.

---

### 4.4 QA & E2E Testing Architecture (Tiers 1–4)

To satisfy the mandatory testing framework with >=5 tests per feature:

| Tier | Test Scope | Target Coverage | Planned Test Suites | Test Count Target |
|:---|:---|:---|:---|:---:|
| **Tier 1** | **Core Feature Coverage** | Every game feature tested in isolation under valid inputs (Happy Path). Minimum 5 test cases per feature. | 1. `tier1_rules_lifecycle.test.ts`<br>2. `tier1_properties_upgrades.test.ts`<br>3. `tier1_auction_system.test.ts`<br>4. `tier1_trading_system.test.ts`<br>5. `tier1_detention_system.test.ts`<br>6. `tier1_persistence_storage.test.ts` | **>= 50 tests** (10 features x >=5 tests) |
| **Tier 2** | **Boundary & Corner Cases** | Edge cases, thresholds, zero/negative bounds, invariant violations. Minimum 5 test cases per feature. | 1. `tier2_financial_invariants.test.ts`<br>2. `tier2_auction_boundaries.test.ts`<br>3. `tier2_trading_validation.test.ts`<br>4. `tier2_detention_limits.test.ts`<br>5. `tier2_persistence_corruption.test.ts` | **>= 50 tests** (10 features x >=5 tests) |
| **Tier 3** | **Cross-Feature Combinations** | Pairwise interactions between systems (e.g. Auction during Chaos modifier, Trade during Debt Liquidation, Bankruptcy during Trade proposal). | 1. `tier3_auction_chaos_interactions.test.ts`<br>2. `tier3_trade_mortgage_interactions.test.ts`<br>3. `tier3_debt_liquidation_cascades.test.ts`<br>4. `tier3_persistence_resume_in_auction.test.ts` | **>= 30 tests** |
| **Tier 4** | **Real-World Scenarios** | Full match simulations from setup to victory across 2, 3, and 4 players with realistic multi-turn action flows. | 1. `tier4_2p_full_auction_trade_match.test.ts`<br>2. `tier4_3p_elimination_persistence_match.test.ts`<br>3. `tier4_4p_round_cap_networth_match.test.ts`<br>4. `tier4_adversarial_stress_simulation.test.ts` | **>= 15 full scenarios** |

#### Detailed Test Case Matrix Specification:

##### 1. Tier 1: Core Feature Coverage (>=5 tests per feature)
- **Feature 1: Turn Lifecycle & Movement** (5 tests):
  1. Forward 2d6 movement advances position by exact sum.
  2. Passing START (Tile 0) awards exact salary ($200k VND / $200M).
  3. Landing exactly on START awards salary.
  4. Rolling doubles grants an immediate extra turn.
  5. Rolling 3 consecutive doubles sends player to Detention (Tile 10) and clears double turn.
- **Feature 2: Property Acquisition & Upgrades** (5 tests):
  1. Buying unowned street property deducts base price and sets ownerId.
  2. Monopoly detection doubles base rent when all district streets are owned.
  3. Upgrades from 1★ to 4★ increment rent according to property deed table.
  4. Upgrading to Landmark 5★ (Sky Tower) applies maximum rent formula.
  5. Utility & Transport rent scales based on total count owned (1, 2, 3, or 4).
- **Feature 3: Mortgage & Demolition** (5 tests):
  1. Mortgaging unencumbered property yields 50% base price cash.
  2. Mortgaged property yields 0 rent when opponents land on it.
  3. Unmortgaging deducts mortgage value plus 10% interest.
  4. Demolishing building level refunds 50% upgrade cost.
  5. Cannot mortgage property while buildings still stand on district.
- **Feature 4: Detention / Jail System** (5 tests):
  1. Paying $50M bail upfront releases player immediately and enables movement.
  2. Rolling doubles while detained releases player immediately without extra turn.
  3. Rolling non-doubles decrements detention turns and keeps player detained.
  4. Reaching turn 3 in detention forces bail payment and moves player by roll sum.
  5. Using a "Get out of Jail Free" card releases player with zero cash penalty.
- **Feature 5: Auction System** (5 tests):
  1. Declining to buy unowned property triggers auction for all solvent players.
  2. Valid bid increments must meet or exceed minimum bid increment ($10M).
  3. Bidding by an eligible player updates `currentBid` and `highestBidderId`.
  4. When all players pass except highest bidder, property is awarded and cash deducted.
  5. If all players pass without bidding, property remains unowned with bank.
- **Feature 6: Bilateral Trading System** (5 tests):
  1. Proposing cash-for-property validates sender cash and target property ownership.
  2. Proposing property-for-property validates dual property ownership.
  3. Target player accepting proposal atomically transfers assets and cash.
  4. Target player rejecting proposal cancels trade without state change.
  5. Proposing player can cancel pending trade before response is submitted.
- **Feature 7: State Persistence & Refresh Recovery** (5 tests):
  1. Saving match writes versioned JSON with schemaVersion = 2 to localStorage.
  2. Loading saved match restores exact player cash, positions, and owned properties.
  3. Refresh recovery detects active saved match and resumes at identical turnPhase.
  4. Clearing saved match wipes localStorage key cleanly.
  5. Game Over / Restart automatically purges saved match from storage.
- **Feature 8: Action Idempotency & Guards** (5 tests):
  1. Duplicate `BUY_PROPERTY` with same `actionId` is ignored (no double charge).
  2. Duplicate `UPGRADE_PROPERTY` with same `actionId` is ignored.
  3. Duplicate `PAY_DETENTION_BAIL` with same `actionId` is ignored.
  4. Non-active player dispatching `ROLL_DICE_START` is rejected.
  5. Bankrupt player dispatching any action is rejected.
- **Feature 9: Bankruptcy & Debt Liquidation** (5 tests):
  1. Debt exceeding cash triggers `BANKRUPTCY_CHECK` phase with `pendingDebt`.
  2. Mortgaging properties raises cash to clear debt and return to `ACTION_MENU`.
  3. Creditor receives all remaining cash and bankrupt player's mortgaged properties.
  4. Bank debt bankruptcy returns all properties unmortgaged to the bank.
  5. Bankrupt player is marked `isBankrupt: true` and skipped in turn rotation.
- **Feature 10: Dual Victory Evaluation** (5 tests):
  1. Last remaining solvent player wins immediately by elimination.
  2. Reaching round 60 triggers net worth evaluation across all active players.
  3. Net worth calculation accurately tallies cash + properties + buildings - mortgages.
  4. Tie in net worth is broken by highest cash balance.
  5. Catastrophic simultaneous 0-player solvency handles game over gracefully.

##### 2. Tier 2: Boundary & Corner Cases (>=5 tests per feature)
- Minimum 5 corner cases per feature testing exact $0 thresholds, $1 deficits, 40-tile wrap boundaries, maximum building caps, auction timer expirations, stale trade offers, and corrupt storage schemas.

##### 3. Tier 3: Cross-Feature Combinations (Pairwise)
- Pairwise integration testing:
  * Auction initiated while Chaos rent multiplier modifier is active.
  * Bilateral trade proposed to player in debt liquidation.
  * Trade involving mortgaged properties transferring debt obligations.
  * Player eliminated by rent while having an active trade proposal pending.
  * Consecutive doubles speeding to jail on the final tile before START (Tile 39).
  * Storage serialization and restoration mid-auction with 5 seconds on clock.

##### 4. Tier 4: Real-World Match Simulations
- Full match end-to-end simulations:
  * 2-Player match from setup through auctions, trades, and decisive bankruptcy.
  * 3-Player match with early player elimination, turn rotation skipping, and final duel.
  * 4-Player 60-round endurance match with multiple trades, auctions, and net worth victory.
  * Browser refresh simulation: serializing at round 15 mid-trade, restoring, and playing to victory.

---

## 5. Verification Method

To verify these observations and architectural specifications:

1. **Verify Existing Baseline Tests**:
   ```bash
   npm test
   ```
   *Expected output*: 9 test files passed, 149 tests passed.

2. **Verify Multi-Tier Test Suites**:
   ```bash
   npx vitest run src/game/__tests__/tier
   ```
   *Expected output*: 4 test files passed (Tiers 1, 2, 3, 4), 46 tests passed.

3. **Verify Build & Type Safety**:
   ```bash
   npm run build
   ```
   *Expected output*: Clean `tsc` compilation with zero TypeScript errors and Vite bundle generated in `dist/`.

4. **Verify Persistent Storage Invalidation**:
   Inspect localStorage in browser dev tools:
   - Check key `chaos_monopoly_active_match_v2`.
   - Verify state schema version conforms to `schemaVersion: 2`.

---

## 6. Integration Boundaries & Handoff to Lead Architect

| Domain | Responsible Agent / Worker | Recommended Interface Contract |
|:---|:---|:---|
| **Core Game Rules & Board** | Worker M1 / Rules Engineer | Pure reducer handling turn FSM, movement, properties, detention choices. |
| **Economy, Auctions & Trading** | Worker M2 / Economy Engineer | Standalone domain engines (`auctionEngine.ts`, `tradeEngine.ts`, `ledgerEngine.ts`). |
| **Match State & Persistence** | Worker M3 / State & UX Engineer | `matchStorage.ts`, action envelope with idempotency cache, recovery modal. |
| **UI/UX Integration** | Worker M3 / Frontend Engineer | `AuctionModal.tsx`, `TradeModal.tsx`, `DebtSettlementModal.tsx`, 2.5D responsive mobile controls. |
| **E2E QA Verification** | Worker M4 / QA Engineer | Multi-tier test harness implementing Tiers 1–4 matrix with >=5 tests per feature. |

*Handoff complete. Report ready for integration by Lead Architect.*
