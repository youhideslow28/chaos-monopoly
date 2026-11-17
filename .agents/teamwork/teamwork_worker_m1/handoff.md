# Handoff Report — Milestone 1: Core Game Engine & 40-Tile Board Migration

**Agent**: `teamwork_worker_m1` (implementer / qa / specialist)  
**Date**: 2026-10-31  
**Milestone**: Milestone 1 (M1) — Core Game Engine & 40-Tile Board Migration  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

Direct observations from the codebase, tools, and execution outputs:

1. **40-Tile Vietnamese Board Geometry & Data**:
   - Location: `src/game/board/boardData.ts` (lines 3–390).
   - Configured `BOARD_SIZE = 40`.
   - All 40 tiles (0 to 39) from Section 2.1 of `game_and_chaos_spec.md` implemented with exact Vietnamese names, types, and descriptions:
     - Tile 0 (`START`): Cổng Khởi Hành (GO - Nhận $200k)
     - Tiles 1, 3 (`PROPERTY`, Nâu / Cần Thơ): Bến Ninh Kiều (60k), Chợ Nổi Cái Răng (60k)
     - Tiles 6, 8, 9 (`PROPERTY`, Lam Nhạt / Biển Đông): Bãi Sau Vũng Tàu (100k), Đường Trần Phú (100k), Tháp Trầm Hương (120k)
     - Tiles 11, 13, 14 (`PROPERTY`, Tím Hồng / Cố Đô): Đại Nội Huế (140k), Cầu Tràng Tiền (140k), Phố Cổ Hội An (160k)
     - Tiles 16, 18, 19 (`PROPERTY`, Cam / Công Nghiệp): Phố Cảng Lạch Tray (180k), Bán Đảo Đồ Sơn (180k), Bến Du Thuyền Tuần Châu (200k)
     - Tiles 21, 23, 24 (`PROPERTY`, Đỏ / Kỳ Quan Biển): Bãi Biển Mỹ Khê (220k), Bán Đảo Sơn Trà (220k), Cầu Vàng Bà Nà Hills (240k)
     - Tiles 26, 27, 29 (`PROPERTY`, Vàng / Đảo Ngọc): Bãi Sao (260k), Thị Trấn Hoàng Hôn (260k), Grand World (280k)
     - Tiles 31, 32, 34 (`PROPERTY`, Lục / Thủ Đô): Phố Cổ Tạ Hiện (300k), Bờ Hồ Hoàn Kiếm (300k), Bán Đảo Tây Hồ (320k)
     - Tiles 37, 39 (`PROPERTY`, Lam Thẫm / Kinh Tế Vàng): Phố Tài Chính Nguyễn Huệ (350k), Landmark 81 & Thủ Thiêm (400k)
     - 4 Transport Hubs (`TRANSPORT`, Trục Vận Tải): Ga Hà Nội (5), Cảng Hải Phòng (15), Cảng Sài Gòn (25), Sân Bay Quốc Tế Nội Bài - TSN (35)
     - 2 Utilities (`UTILITY`, Hạ Tầng Năng Lượng): Cấp Nước Chợ Lớn SAWACO (12), Điện Lực Quốc Gia EVN (28)
     - Special Corner Tiles: Cổng Khởi Hành (0), Khu Cách Ly Tạm Giam (10), Trạm Nghỉ Chân Miễn Phí (20), Lệnh Giam Giữ Vào Tù (30)
     - Event & Tax Tiles: Lễ Hội Sông Nước (2), Thuế TN Đô Thị (4), Cổng Chaos α (7), Khí Vận Doanh Nhân (17), Cổng Chaos β (22), Lễ Hội Thăng Long (33), Cổng Chaos Ω (36), Thuế Tài Sản (38).
   - Layout coordinates: Explicit 11×11 perimeter coordinates mapped in `TILE_GRID_POSITIONS_40` and embedded within each tile's `gridPosition` property.
   - Tokens: 4 Vietnamese tokens configured in `DEFAULT_PLAYER_TOKENS` (VinFast VF9, Metro Express, Mèo Thần Tài Cyber, Vệ Tinh Vinasat).

2. **Types Modernization**:
   - Location: `src/game/types/index.ts`.
   - `DistrictColor`: includes 8 Vietnamese districts + `district-transport` + `district-utility` + legacy variants.
   - `TileType`: includes `'START' | 'PROPERTY' | 'TRANSPORT' | 'UTILITY' | 'CHAOS' | 'CHEST' | 'CHANCE' | 'DETENTION' | 'TAX' | 'REST_ZONE' | 'GO_TO_JAIL' | 'WARP' | 'CASINO'`.
   - `PropertyData`: includes `houseRent: number[]` (5 upgrade tiers), `mortgageValue?: number`, `maxLevel: number`.
   - `PropertyOwnership`: includes `isMortgaged?: boolean; level: number; ownerId: PlayerId | null`.
   - `TurnPhase`: includes `'DEBT_LIQUIDATION' | 'BANKRUPTCY_CHECK' | 'GAME_OVER'`.
   - `GameAction`: includes `DOWNGRADE_PROPERTY`, `MORTGAGE_PROPERTY`, `UNMORTGAGE_PROPERTY`, `RESOLVE_DEBT`.

3. **5-Tier Property & Rent Logic**:
   - Location: `src/game/property/propertyEngine.ts`.
   - `calculateRent`:
     - Mortgaged property yields $0 rent.
     - Unimproved property with full district monopoly yields `baseRent * 2`.
     - 5 upgrade tiers: Level 1 (1★), Level 2 (2★), Level 3 (3★), Level 4 (4★), Level 5 (Landmark 5★) using `houseRent[level - 1]`.
     - Transport Hubs: 1 hub = $25k, 2 hubs = $50k, 3 hubs = $100k, 4 hubs = $200k.
     - Utilities: 1 utility = 4 × diceSum, 2 utilities = 10 × diceSum.
   - Even Building Rule: `canUpgradeProperty` prevents building level `N + 1` if any sibling property in the district is `< N`.
   - Reverse Even Building Rule: `canDowngradeProperty` allows selling a building for 50% refund only if no sibling property is at a higher level.
   - Mortgage & Unmortgage:
     - `getMortgageValue(tileId)` = 50% basePrice.
     - `getUnmortgageCost(tileId)` = 55% basePrice (50% + 10% interest).
     - `canMortgageProperty` verifies all buildings in the district have been sold to level 0.
     - `canUnmortgageProperty` verifies owner and sufficient cash.

4. **Solvency & Economy Engine**:
   - Location: `src/game/economy/economyEngine.ts`.
   - `calculatePlayerNetWorth`: `Cash + sum(Base Prices) + sum(level * upgradeCost) - sum(Mortgage debts)`.
   - `calculateMaxLiquidationValue`: evaluates total cash potentially raised from selling buildings (50%) and mortgaging unmortgaged properties (50%).
   - `liquidateBankruptPlayer`: transfers properties to creditor (retaining mortgage flags) or returns to bank (clearing owner, buildings, mortgage).

5. **Dice & Jail Engine**:
   - Location: `src/game/dice/diceEngine.ts` and `src/game/turn-manager/turnManager.ts`.
   - `calculateNewPosition`: computes position wrap-around modulo 40 and accurately flags `passedStart`.
   - `rollTwoDice`: 2d6 dice rolls, sum, and doubles detection.
   - Doubles rule: consecutive doubles counter tracked in player state; rolling doubles awards an extra roll.
   - 3 consecutive doubles in a single turn triggers immediate detention penalty: `position: 10`, `inDetention: true`, `detentionTurns: 2`, `consecutiveDoubles: 0`.
   - Landing on Tile 30 (`GO_TO_JAIL`) teleports player to Tile 10 (`DETENTION`), `inDetention: true`, `detentionTurns: 2`.
   - Detention release: rolling doubles releases player immediately; paying bail ($100k) releases player to `WAITING_FOR_ROLL`; 3-turn countdown auto-release in `advanceTurn`.

6. **60-Round Cap & Win Evaluation**:
   - Location: `src/game/win-condition/winCondition.ts`.
   - `evaluateWinCondition`:
     - If only 1 solvent player remains: `LAST_MAN_STANDING`.
     - When `currentRound >= maxRounds` (default 60): `MAX_ROUNDS_REACHED`, selects player with highest Net Worth (tie-broken by cash balance).

7. **Game Reducer**:
   - Location: `src/game/gameReducer.ts`.
   - Implements pure state transitions for all 17 action types without in-place state mutation.
   - Enforces strict non-negative cash invariant: transfers up to available cash, and transitions to `BANKRUPTCY_CHECK` / `DEBT_LIQUIDATION` when debt exceeds cash.

8. **Test Execution & Build Verification**:
   - Command: `npm test`
     ```
     Test Files  5 passed (5)
          Tests  71 passed (71)
       Duration  1.85s
     ```
     - `src/game/__tests__/gameEngine.test.ts`: 25 passed (covers all 40 tiles, 5 upgrade tiers, doubles, mortgage, rent, jail, bankruptcy, round cap)
     - `src/game/__tests__/tier1_features.test.ts`: 17 passed
     - `src/game/__tests__/tier2_boundaries.test.ts`: 13 passed
     - `src/game/__tests__/tier3_combinations.test.ts`: 9 passed
     - `src/game/__tests__/tier4_match_scenarios.test.ts`: 7 passed
   - Command: `npm run build` (`tsc && vite build`)
     ```
     ✓ 2080 modules transformed.
     dist/index.html                   1.05 kB │ gzip:  0.63 kB
     dist/assets/index-CZUxjyxH.css   39.55 kB │ gzip:  7.37 kB
     dist/assets/index-DXij8RE0.js   276.65 kB │ gzip: 82.43 kB
     ✓ built in 6.51s
     Exit code: 0
     ```

---

## 2. Logic Chain

1. **Premise 1**: The original game prototype had a 24-tile board with 3-tier upgrades and missing rules (mortgage, transport hub math, utility formula, debt liquidation).
2. **Observation 1**: Section 2.1 of `game_and_chaos_spec.md` establishes the authoritative 40-tile modern Vietnamese board, 8 color districts, 4 transport hubs, 2 utilities, 5-tier upgrade levels, even building rule, 2d6 doubles rules, and 60-round cap.
3. **Inference 1**: Upgrading `types/index.ts` with branded/discriminated union types and optional `isMortgaged?: boolean` satisfies the full 40-tile feature specification while preserving backward compatibility for existing code and newly written E2E test suites.
4. **Observation 2**: Property rent scaling requires distinct mathematical branches depending on tile type (`TRANSPORT` uses owned hub count, `UTILITY` uses dice multiplier, `PROPERTY` uses 5-tier upgrade array and monopoly doubling).
5. **Inference 2**: Centralizing this logic in `propertyEngine.ts` guarantees deterministic, pure rent evaluation called by `gameReducer.ts` and verified by unit tests.
6. **Observation 3**: The non-negative cash balance invariant requires that cash never drop below zero.
7. **Inference 3**: In `gameReducer.ts`, when rent or tax exceeds current cash, `transferCash` pays all available funds and the state transitions to `BANKRUPTCY_CHECK` or `DEBT_LIQUIDATION` with structured `pendingDebt`, preventing negative balances in stable states.
8. **Observation 4**: Vitest test runner reported 71/71 passing tests across all 5 test files, and `tsc && vite build` compiled 2,080 modules into a production bundle (< 280 kB JS) with zero errors.
9. **Conclusion**: Milestone 1 core game engine and 40-tile Vietnamese board migration is complete, verified, and ready for integration.

---

## 3. Caveats

- Presentation layer adaptation (`src/components/board/BoardView.tsx` from 7x7 grid to 11x11 grid) is assigned to Milestone 3 (UI/UX & Presentation). The board data exports `TILE_GRID_POSITIONS_40` and assigns `gridPosition` to every tile so Milestone 3 can seamlessly bind the 11x11 layout.
- The 36 Vietnamese Chaos cards catalog is assigned to Milestone 2 (Chaos Engine). The Core Engine includes full dispatch compatibility (`applyChaosCard`, `activeChaosCard`, and tile triggers on Tiles 7, 22, 36, 2, 17, 33).

---

## 4. Conclusion

Milestone 1 is **100% complete**. All 8 objectives specified in the dispatch have been implemented cleanly, adhering to strict TypeScript functional architecture, genuine game state invariants (zero cheating, zero dummy implementations), 71 passing automated tests, and a clean production build.

---

## 5. Verification Method

To independently verify the deliverables:

```powershell
# 1. Run all unit and integration test suites
npm test

# 2. Run TypeScript check and production bundle compilation
npm run build
```

Expected result:
- Tests: `5 passed (5)`, `71 passed (71)`, duration < 2.5s.
- Build: `tsc && vite build` exits with code 0, bundle size ~277 kB JS, ~39 kB CSS in `dist/`.
