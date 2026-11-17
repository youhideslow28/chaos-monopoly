# Handoff Report — Game Rules & Chaos Engine Specification
**Agent**: `teamwork_explorer_survey_2`  
**Parent Conversation ID**: `5a96e09c-9d3f-4485-a785-45777085b755`  
**Date**: 2026-10-31T10:00:00Z  
**Primary Deliverable**: `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md`

---

## 1. Observation

1. **Original User Request** (`c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md`, lines 48–103):
   - Mandated: 2–4 players hot-seat, Vietnamese default language, 2 six-sided dice, 45–60 min target match duration, Monopoly-inspired property trading foundation with original extensions, continuous Chaos events across 6 categories (Positive, Negative, Personal, Global, Economic, Rare Legendary).
   - Testable random generator required; no visual animation randomness altering gameplay outcomes.
2. **Current Codebase Inspection**:
   - `src/game/board/boardData.ts` (lines 3–5):
     ```typescript
     export const BOARD_SIZE = 24;
     export const BOARD_TILES: BoardTile[] = [ ... ];
     ```
     The existing workspace has an initial 24-tile prototype with generic futuristic names (e.g., "Phố Ẩm Thực Chợ Đêm", "Tòa Tháp Metropolis Apex") and only 3 upgrade levels.
   - `src/game/chaos-engine/chaosCards.ts` (lines 3–126): Contains only 12 cards, relying on `Math.random()` in `chaosEngine.ts` (line 7), which is non-deterministic and lacks seedability.
   - `src/game/economy/economyEngine.ts` (lines 26–41): `executeCashTransaction` allows cash to drop below zero, returning `isSolvent: newCash >= 0` without entering an explicit Debt Liquidation phase.
   - `src/game/__tests__/gameEngine.test.ts` (lines 10–20): Tests currently assume `boardSize: 24` and maximum 3 upgrade levels.
3. **Parent Dispatch Directive**:
   - Demanded complete, authoritative Game Rules & Chaos Engine Specification:
     - 40 tiles standard Monopoly-inspired board themed after modern Vietnamese economic centers (Hà Nội, TP Hồ Chí Minh, Đà Nẵng, Hải Phòng, Cần Thơ, Nha Trang, Huế, Vũng Tàu, Phú Quốc, 4 Transport Hubs, 2 Utilities, Special Tiles).
     - Full game mechanics: 2–4 hot-seat, $1,500k starting cash, 2d6 rolling, 3 consecutive doubles Jail rule, full color-set bonus (x2 base rent), 5 upgrade tiers (Level 1–4, Landmark), rent math, mortgage, unmortgage, trade, liquidation, bankruptcy, 45–60 min pacing, victory conditions.
     - Seedable PRNG, 4 dynamic triggers, >= 30 distinct Chaos events with explicit data models and state invariants.

---

## 2. Logic Chain

1. *From Observation 1 & 2*: The existing code in `src/game` demonstrates a functioning 24-tile proof-of-concept, but it falls short of the user's explicit requirement for a 40-tile standard board layout themed after modern Vietnamese economic powerhouses and an enterprise-grade Chaos Engine.
2. *From Observation 3*: To transition the project cleanly into implementation, workers need an exact, authoritative reference specification defining all 40 tiles, complete financial tables (prices, upgrades, rents at all 5 tiers, mortgages), formal state machine transitions, and explicit mathematical formulas for transport hubs and utilities.
3. *From Game Design & Economy Balancing Principles* (`.agents/skills/game-design/SKILL.md`):
   - A $1,500k starting balance combined with a $200k GO salary provides initial liquidity for 15–20 rounds of acquisition.
   - Escalating rents up to $1,500k–$2,000k for Landmark 5★ properties ensures that once monopolies are developed, single-rent landings create existential financial pressure.
   - Setting a 60-round hard cap with a Net Worth tie-breaker guarantees matches cleanly conclude within the 45–60 minute window.
4. *From Determinism & Anti-Corruption Invariants* (`.agents/skills/typescript-architecture/SKILL.md`):
   - Using a seedable Mulberry32 PRNG eliminates unrepeatable bugs and enables 100% deterministic unit and replay testing.
   - Requiring a strict Debt Liquidation state before bankruptcy guarantees cash balances never persist in negative states.
5. *From Chaos Engine Design*:
   - Defining 36 distinct Chaos events across all 6 categories (Positive, Negative, Personal, Global, Economic, Rare Legendary) with explicit TypeScript schemas, triggers, durations, and mutation payloads fulfills and exceeds the requirement for >= 30 events.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with the Explorer archetype constraints, no application source code files (`src/**/*.ts`) were modified. All architectural definitions, schemas, and catalogs are provided in `game_and_chaos_spec.md`.
2. **Existing Test Compatibility**: Existing unit tests in `src/game/__tests__/gameEngine.test.ts` test against the 24-tile prototype. Downstream workers must update test assertions to target the 40-tile layout and 5 upgrade tiers as specified in Section 5 and 6 of `game_and_chaos_spec.md`.
3. **Hot-Seat Trade UI**: Bilateral trading mechanics are fully specified in logic, but the exact UI modal interaction is left to the UI/UX Engineer (Survey 3).

---

## 4. Conclusion

The complete, authoritative **Game Rules & Chaos Engine Specification** has been delivered to:
`c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md`

### Core Deliverables in Specification:
1. **Complete 40-Tile Board Layout Table**: All 40 tiles indexed 0 to 39, with Vietnamese landmark names, types, districts, purchase prices, upgrade costs, 5-tier rent structures (Base, 1★, 2★, 3★, 4★, Landmark 5★), and mortgage values.
2. **Full Core Game Mechanics**: Hot-seat 2–4 players, 2d6 dice, doubles rules (3 doubles = Jail), monopoly doubling, 5-tier construction rules, mortgage/unmortgage math, bilateral trading, and emergency debt liquidation prior to bankruptcy.
3. **Pacing & Victory Balance**: Tuned for a 45–60 minute match duration with a 60-round cap and Net Worth valuation formula.
4. **Chaos Engine Architecture**: Seedable deterministic Mulberry32 PRNG, 4 trigger pathways (`TILE_LANDED`, `DOUBLE_DICE`, `ROUND_INTERVAL`, `CRISIS_DESPERATION`), and a complete catalog of **36 distinct Vietnamese-themed Chaos events**.
5. **State Validation Invariants & Event Log Schema**: Formalized rules protecting non-negative cash, single active players, ownership integrity, and effect expiry.

---

## 5. Verification Method

To independently verify this specification:
1. **Inspect Specification Artifact**:
   - Check file existence and integrity: `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_2\game_and_chaos_spec.md`.
   - Verify Section 2 contains exactly 40 tiles (0 to 39) with 8 color districts (22 street properties), 4 transport hubs, 2 utilities, and 12 special/action tiles.
   - Verify Section 4 contains all 36 distinct Chaos events with explicit data payloads across 6 categories.
2. **Implementation Verification (Downstream Workers)**:
   - Run existing Vitest tests: `npm test` or `npx vitest run`.
   - Implement board migration to 40 tiles as outlined in Section 5.2 and verify against the 9 test criteria in Section 6.
