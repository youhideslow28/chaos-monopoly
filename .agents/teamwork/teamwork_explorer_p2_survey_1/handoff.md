# Handoff Report — Core Rules Survey (Phase 02)

**Author**: Core Rules Explorer (`teamwork_explorer_p2_survey_1`)  
**Mission**: Comprehensive Survey of Core Rules & Mechanics Continuity for CHAOS MONOPOLY Phase 02  
**Target Recipient**: Lead Orchestrator (`dfdc5340-0019-4b2e-8180-5f5d8ae40b15`)  
**Date**: 2026-10-31  

---

## 1. Observation

### 1.1 Baseline Test Suite & Build Status
- Ran command: `npx vitest run`
- Output verbatim:
  ```
  Test Files  9 passed (9)
       Tests  149 passed (149)
    Duration  3.30s
  ```
- All 9 test suites (`tier1_features`, `tier2_boundaries`, `tier3_combinations`, `tier4_match_scenarios`, `tier5_adversarial_hardening`, `gameEngine`, `adversarial_stress`, `challenger_empirical_m1`, `chaosEngine_milestone2`) are 100% green.

### 1.2 Documentation Assets
- `docs/` folder: Currently does not exist in workspace root (`directory docs does not exist`).
- Required by user request (ORIGINAL_REQUEST.md lines 203–207): `docs/CHANGELOG.md`, `docs/KNOWN_ISSUES.md`, `docs/TEST_REPORT.md`, `docs/PROJECT_STATUS.md`.
- Legacy Phase 01 reports exist in `PROJECT.md`, `TEST_READY.md`, `TEST_INFRA.md`, and `.agents/teamwork/`.

### 1.3 Core Rules Subsystems in Source Code (`src/game/`)

#### A. Turn Lifecycle & State Machine
- `src/game/types/index.ts`:
  - `TurnPhase`: `'WAITING_FOR_ROLL' | 'ROLLING' | 'MOVING' | 'RESOLVING_TILE' | 'ACTION_MENU' | 'CHAOS_EVENT' | 'DEBT_LIQUIDATION' | 'BANKRUPTCY_CHECK' | 'GAME_OVER'` (lines 180–190).
  - Unused phases: `MOVING` and `RESOLVING_TILE` exist in the union but are never transitioned to in `gameReducer.ts`.
  - Missing phases: No phase for Auctions (`AUCTION_ACTIVE`, `AUCTION_BIDDING`) or Player-to-Player Trading (`TRADE_OFFERED`).
- `src/game/turn-manager/turnManager.ts`:
  - `advanceTurn(state)` (lines 24–119): Evaluates win condition, rotates to next non-bankrupt player (`getNextActivePlayerIndex`), increments `roundNumber` when round wraps, decrements round-based `chaosModifiers`.
  - Turn duration / turn timer: No timer enforcement or auto-turn timeout exists in engine or reducer.

#### B. Two-Dice Movement & Double-Roll Rules
- `src/game/dice/diceEngine.ts`:
  - `rollTwoDice(customValues?)` (lines 11–19): Returns `{ dice: [d1, d2], sum: d1 + d2, isDouble: d1 === d2 }`.
  - `calculateNewPosition(currentPos, steps, boardSize)` (lines 21–42): Returns `{ newPosition, passedStart }` where `passedStart = rawTarget >= boardSize` when `steps > 0`.
- `src/game/gameReducer.ts`:
  - Speeding to jail (lines 198–229): `isDouble ? activePlayer.consecutiveDoubles + 1 : 0`. If `consecutiveDoubles >= 3`, player is jailed at tile 10 (`inDetention = true`, `detentionTurns = 2`, `consecutiveDoubles = 0`, `isDouble = false`). No movement occurs on the 3rd roll.
  - Normal doubles extra turn (lines 652–671): In `END_TURN`, if `state.isDouble && !activePlayer.inDetention && activePlayer.consecutiveDoubles < 3`, phase resets to `WAITING_FOR_ROLL` for active player.
  - Reverse direction bug: In `ROLL_DICE_RESULT` (line 232), position calculation hardcodes `calculateNewPosition(activePlayer.position, sum, BOARD_SIZE)`. It never checks `chaosModifiers.reverseDirectionTurns > 0`.
  - Curfew cap gap: `chaosModifiers.curfewTurns` is tracked but never caps dice steps in `ROLL_DICE_RESULT`.

#### C. Start Tile Rewards (Passing vs Landing)
- `src/game/board/boardData.ts` (lines 57–66): Tile 0 (`Cổng Khởi Hành`), `type: 'START'`.
- `src/game/gameReducer.ts` (lines 234–236):
  ```typescript
  let earnedSalary = 0;
  if (passedStart) {
    earnedSalary = state.config.salaryOnStart; // default 200
  }
  ```
- `src/game/gameReducer.ts` (lines 764–944 `resolveLandingTile`):
  - No case for `landingTile.type === 'START'`.
  - Result: Passing START gives $200k VND, and landing directly on START gives the exact same $200k VND (no landing bonus).
- Golden Hour modifier bug: In `chaosEngine.ts` (line 593), `GOLDEN_HOUR` sets `goldenHourTurns = 1` and logs "Lương Cổng Khởi Hành tăng gấp đôi ($400M)". However, in `gameReducer.ts` line 235, `earnedSalary = state.config.salaryOnStart` never checks `chaosModifiers.goldenHourTurns`, so the bonus is never actually awarded.

#### D. Property Purchase, Ownership, Groups/Color Sets, Building & Upgrades (5 Tiers), Monopoly Rent Multiplier
- `src/game/board/boardData.ts`:
  - 40 tiles total: 22 color properties across 8 districts, 4 transport hubs (`district-transport`), 2 utilities (`district-utility`), and 12 special/corner tiles.
- `src/game/property/propertyEngine.ts`:
  - Purchase check (`canBuyProperty`, lines 117–141): Validates buyable type, unowned, sufficient funds.
  - Monopoly check (`hasDistrictMonopoly`, lines 12–20): All properties in district owned by player.
  - Rent calculation (`calculateRent`, lines 41–115):
    - Mortgaged: 0 rent.
    - Transport Hubs: scaled by count owned: 1 hub = $25k, 2 hubs = $50k, 3 hubs = $100k, 4 hubs = $200k.
    - Utilities: 1 utility = 4x dice sum; 2 utilities = 10x dice sum.
    - Color street level 0 unimproved: baseRent (or baseRent * 2 if full monopoly).
    - Color street level 1–5: `houseRent[level - 1]` (5 tiers up to Landmark 5★).
  - Even Building Rule (`canUpgradeProperty`, lines 184–196): Cannot upgrade property to level N + 1 until all siblings in the district are at least level N.
  - Even Downgrading Rule (`canDowngradeProperty`, lines 226–238): Cannot downgrade property if any sibling in the district is at a higher level. Refund is 50% upgrade cost.
  - Mortgage / Unmortgage (`canMortgageProperty`, `canUnmortgageProperty`, lines 244–308): Mortgage value = 50% basePrice; unmortgage cost = mortgage value * 1.10 (10% interest). Cannot mortgage if any property in district has buildings.
- Gaps in Property System:
  - Decline-to-buy Auction: When a player lands on unowned property and declines or cannot purchase, no auction is triggered; the turn simply continues.
  - Boom Modifiers ignored: `transportBoomTurns`, `utilityBoomTurns`, `districtBoomTurns` are recorded in `chaosModifiers` but never passed into or used by `calculateRent`.
  - UI Upgrade Limitation: `ActionPanel.tsx` only offers buttons for current tile and `allUpgradeableTiles[0]`. Players cannot freely pick which property in their monopoly to upgrade from the dock.

#### E. Special Tiles
- Jail Detention (`Tile 10` & `Tile 30`):
  - Double-decrement bug: In `gameReducer.ts` line 780, entering jail sets `detentionTurns = 2`. In `turnManager.ts` lines 71–83, advancing turn to that player decrements `detentionTurns` to 1. In `ROLL_DICE_RESULT` line 168, failing doubles decrements `detentionTurns` to 0. When turn rotates back to them, `turnManager.ts` releases them. Net detention duration is only 1 turn instead of 3.
  - Escape on doubles: In `ROLL_DICE_RESULT` lines 137–165, rolling doubles releases player but resets phase to `WAITING_FOR_ROLL` without moving by the rolled amount.
  - Missing 3-turn limit force bail: On the 3rd failed turn, standard rules force bail payment ($50/$100k) and move by dice sum.
  - Missing "Get Out of Detention" card inventory: `PlayerState` has no `jailFreeCards: number` field. Drawing cards `DETENTION_RELEASE` or `DETENTION_IMMUNITY` in `chaosEngine.ts` (lines 499–503) only logs a message with no state mutation.
- Tax Tiles (`Tile 4` $200k & `Tile 38` $100k):
  - Fully implemented with strict solvency preservation: Insufficient cash drains player to 0 and transitions to `BANKRUPTCY_CHECK` with `pendingDebt` (creditor: null).
- Chance / Chaos / Chest Tiles (`Tiles 2, 7, 17, 22, 33, 36`):
  - Fully implemented with 36 Vietnamese cards, PRNG Mulberry32, 4 trigger pathways, and modal rendering.
- Rest Zone (`Tile 20`):
  - Neutral safe rest zone.

#### F. Bankruptcy Flow & Triggers
- Invariant: Player cash never drops below 0 (`executeCashTransaction`, `transferCash`).
- Debt Trigger: Excess debt sets cash = 0, enters `turnPhase: 'BANKRUPTCY_CHECK'`, populates `pendingDebt: { creditorPlayerId, amount, reason }`.
- Liquidation: Player can sell buildings (downgrade) and mortgage properties via ActionPanel drawer. Once cash >= debt amount, `RESOLVE_DEBT` pays debt and returns to `ACTION_MENU`.
- Surrender / Bankruptcy (`DECLARE_BANKRUPTCY`): Liquidates assets to creditor (player) or bank. Sets `isBankrupt = true`.
- Gaps in Bankruptcy:
  - Missing automatic insolvency detection: `calculateMaxLiquidationValue` is defined in `economyEngine.ts` (lines 81–107), but never used to check if `maxLiquidationValue < pendingDebt.amount` to alert or auto-declare bankruptcy.
  - Insolvent asset trading: Players facing bankruptcy cannot offer properties to third-party players to raise funds.

#### G. Victory Conditions & Match Completion
- `src/game/win-condition/winCondition.ts`:
  - `LAST_MAN_STANDING`: Exactly 1 active solvent player remains.
  - `MAX_ROUNDS_REACHED`: Round >= 60. Evaluates `calculatePlayerNetWorth` = cash + basePrice + (level * upgradeCost) - mortgageDebt. Tie-breaker: cash.
- Immediate evaluation in `DECLARE_BANKRUPTCY` and `advanceTurn`.
- `VictoryModal` displays winner, net worth, and celebration confetti.
- `RESTART_GAME` resets to `INITIAL_GAME_STATE`.
- Gaps: No full leaderboard table (ranks 1–4) or post-match statistics breakdown.

---

## 2. Logic Chain

1. **Test Continuity**: The workspace contains 149 passing tests in Vitest across 9 files (Observation 1.1). Any changes to Core Rules must maintain 100% pass rate on these baseline tests while adding comprehensive new test suites.
2. **Missing Files In Workspace**: The dispatch specifically asked to inspect `docs/CHANGELOG.md`, `docs/KNOWN_ISSUES.md`, etc. (Observation 1.2). Since `docs/` is absent, Phase 02 must create `docs/` with all 4 required status tracking documents.
3. **Detention Logic Correction**: From Observation 1.3.E, `detentionTurns` is currently decremented twice per turn cycle, reducing detention to 1 turn instead of the required 3-turn limit. Furthermore, rolling doubles to escape jail forces a re-roll rather than moving by the escaped roll, and "Get Out of Detention" cards are no-ops due to lack of a `jailFreeCards` counter.
4. **Start Tile Polish**: Observation 1.3.C shows that landing directly on START currently provides the same reward as passing ($200k). Adding a dedicated landing bonus ($400k) and fixing `goldenHourTurns` in `ROLL_DICE_RESULT` satisfies the "Start tile rewards (passing vs landing)" requirement.
5. **Auction & Trading System Gaps**: Observations 1.3.A and 1.3.D reveal that Auctions and Trading are completely missing from `GameAction`, `GameState`, and the UI. These are explicitly required by Section 5 and Section 6 of `ORIGINAL_REQUEST.md`.
6. **Economic Modifiers Wiring**: Observation 1.3.D shows that `chaosModifiers` (`transportBoomTurns`, `utilityBoomTurns`, `districtBoomTurns`) are already generated by the Chaos engine but omitted from `calculateRent`. Wiring them completes the economic model continuity.

---

## 3. Caveats

1. **Scope Boundary**: As Core Rules Explorer, this report focuses on rules logic, state transitions, and engine mechanics. Subsystems like Auction bidding algorithms, UI modal designs, and online network serialization are addressed in parallel surveys (Survey 2 and Survey 3).
2. **Backwards Compatibility**: All additions to `GameState` (such as `jailFreeCards`, `activeAuction`, `activeTradeOffer`) must have safe defaults (e.g. `0`, `null`) so existing test fixtures and saved states do not break.
3. **No Code Modified**: This investigation was strictly read-only. No source files were edited.

---

## 4. Conclusion & Recommendations

### 4.1 Feature Implementation Matrix

| Subsystem | Feature | Current Status | Required Action in Phase 02 |
|:---|:---|:---:|:---|
| **Turn System** | Turn rotation & round counter | COMPLETE | Keep intact; add optional turn timer |
| **Turn System** | Double-roll extra turns | COMPLETE | Keep intact; fix post-escape double handling |
| **Turn System** | Speeding (3 doubles to jail) | COMPLETE | Keep intact; verify telemetry logging |
| **Movement** | 40-tile wrap-around & GO pass | COMPLETE | Keep intact |
| **Movement** | Reverse direction & curfew modifiers | PARTIAL | Wire `reverseDirectionTurns` and `curfewTurns` into `ROLL_DICE_RESULT` |
| **Start Tile** | Passing START reward ($200k) | COMPLETE | Keep intact |
| **Start Tile** | Landing on START distinct reward | MISSING | Add landing bonus ($400k) & wire `goldenHourTurns` |
| **Properties** | Acquisition & unowned check | COMPLETE | Keep intact |
| **Properties** | 5-Tier upgrades & rent progression | COMPLETE | Keep intact |
| **Properties** | Even building & downgrading rules | COMPLETE | Keep intact |
| **Properties** | Monopoly rent doubling | COMPLETE | Keep intact |
| **Properties** | Mortgage & 10% unmortgage fee | COMPLETE | Keep intact |
| **Properties** | Economic Chaos boom multipliers | PARTIAL | Wire `transportBoomTurns`, `utilityBoomTurns`, `districtBoomTurns` into `calculateRent` |
| **Special Tiles** | Detention 3-turn limit & forced bail | PARTIAL | Fix double-decrement bug, enforce 3 turns max, auto-bail on turn 3 |
| **Special Tiles** | Detention double escape movement | PARTIAL | Allow escaping roll to move player immediately |
| **Special Tiles** | "Get Out of Jail" card inventory | MISSING | Add `jailFreeCards` to `PlayerState`, handle card grant & `USE_DETENTION_CARD` action |
| **Special Tiles** | Tax & Fees (Tiles 4 & 38) | COMPLETE | Keep intact |
| **Special Tiles** | Chaos / Chance / Chest tiles | COMPLETE | Keep intact |
| **Special Tiles** | Rest Zone (Tile 20) | COMPLETE | Keep intact |
| **Bankruptcy** | Solvency preservation & debt phase | COMPLETE | Keep intact |
| **Bankruptcy** | Liquidation & creditor settlement | COMPLETE | Keep intact |
| **Bankruptcy** | Mathematical insolvency auto-check | PARTIAL | Connect `calculateMaxLiquidationValue` to alert insolvency |
| **Victory** | Elimination & 60-round net worth | COMPLETE | Keep intact |
| **Victory** | Full leaderboard & match stats | PARTIAL | Expand victory modal with ranks 1–4 and player metrics |
| **Auctions** | Property auction initiation & bidding | MISSING | Implement Milestone CR-2 (Auction State Machine) |
| **Trading** | Bilateral property/cash trading | MISSING | Implement Milestone CR-3 (Trading Engine) |

### 4.2 Recommended Milestone Decomposition for Core Rules

We recommend structuring Core Rules delivery across 4 sequential, test-gated milestones:

- **Milestone CR-1: Movement, Start Tile & Detention Overhaul**
  - Fix detention turn decrementing (strict 3-turn tracking).
  - Enable moving immediately on double-roll jail escape.
  - Implement "Get Out of Detention" card inventory (`jailFreeCards`) and `USE_DETENTION_CARD` action.
  - Implement distinct Start Tile landing bonus ($400k vs $200k pass).
  - Wire `goldenHourTurns`, `reverseDirectionTurns`, and `curfewTurns` into `ROLL_DICE_RESULT`.
- **Milestone CR-2: Property Modifiers & Full Auction System**
  - Trigger Auction when a player declines or cannot afford an unowned property.
  - Implement `AuctionState` with turn-based bidding, minimum increments, pass bid, and winner transfer.
  - Integrate `transportBoomTurns`, `utilityBoomTurns`, and `districtBoomTurns` into `calculateRent`.
- **Milestone CR-3: Bilateral Trading & Enhanced Bankruptcy Settlement**
  - Implement `TradeOffer` domain model (cash-for-property, property-for-property, cash + property).
  - Implement `OFFER_TRADE`, `ACCEPT_TRADE`, `REJECT_TRADE`, `CANCEL_TRADE` actions with atomic verification.
  - Enable trading proposals during `BANKRUPTCY_CHECK` before final declaration.
  - Display automatic insolvency warning if `maxLiquidationValue < pendingDebt.amount`.
- **Milestone CR-4: Match Lifecycle, Full Leaderboard & Regression Hardening**
  - Expand end-game screen with 1st to 4th place rankings and detailed match statistics.
  - Create `docs/` suite (`CHANGELOG.md`, `KNOWN_ISSUES.md`, `TEST_REPORT.md`, `PROJECT_STATUS.md`).
  - Add comprehensive Vitest test coverage for all new mechanics, verifying baseline 149 + all new tests pass.

### 4.3 Precise Interface Contracts for Core Rules

#### Contract 1: `PlayerState` Extensions
```typescript
export interface PlayerState {
  // Existing fields (id, name, token, cash, position, inDetention, detentionTurns, isBankrupt, consecutiveDoubles, stats)
  jailFreeCards: number; // Defaults to 0
}
```

#### Contract 2: Core Rules `GameAction` Additions
```typescript
export type GameAction =
  // Existing actions...
  // Detention Card:
  | { type: 'USE_DETENTION_CARD' }

  // Auction Actions:
  | { type: 'START_AUCTION'; tileId: TileId }
  | { type: 'PLACE_BID'; playerId: PlayerId; amount: number }
  | { type: 'PASS_BID'; playerId: PlayerId }
  | { type: 'RESOLVE_AUCTION' }

  // Trading Actions:
  | {
      type: 'OFFER_TRADE';
      targetPlayerId: PlayerId;
      offeredCash: number;
      offeredPropertyIds: TileId[];
      requestedCash: number;
      requestedPropertyIds: TileId[];
    }
  | { type: 'ACCEPT_TRADE'; offerId: string }
  | { type: 'REJECT_TRADE'; offerId: string }
  | { type: 'CANCEL_TRADE'; offerId: string };
```

#### Contract 3: `AuctionState` & `TradeOffer` Data Models
```typescript
export interface AuctionState {
  tileId: TileId;
  currentBid: number;
  highestBidderId: PlayerId | null;
  activeBidders: PlayerId[];
  currentBidderIndex: number;
  minIncrement: number;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  offeredCash: number;
  offeredPropertyIds: TileId[];
  requestedCash: number;
  requestedPropertyIds: TileId[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: number;
}

// Added to GameState:
export interface GameState {
  // Existing fields...
  activeAuction: AuctionState | null;
  activeTradeOffer: TradeOffer | null;
}
```

---

## 5. Verification Method

1. **Baseline Invariant Verification**:
   ```bash
   npx vitest run
   ```
   Must yield 149 passed tests across 9 test files.
2. **Production Bundle Verification**:
   ```bash
   npm run build
   ```
   Must succeed with zero TypeScript or bundling errors.
3. **Inspect Key Source Files**:
   - `src/game/gameReducer.ts`: Check lines 136–195 (detention), lines 232–237 (START salary), lines 652–671 (extra turn).
   - `src/game/property/propertyEngine.ts`: Check `calculateRent` (lines 41–115), `canUpgradeProperty` (lines 143–205).
   - `src/game/turn-manager/turnManager.ts`: Check `advanceTurn` (lines 24–119).
4. **Invalidation Conditions**:
   - Any modification that causes existing Vitest tests to fail invalidates the continuity guarantee.
   - Any implementation of auctions or trades that allows duplicate property ownership or negative cash invalidates the economic invariants.
