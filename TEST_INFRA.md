# E2E Test Infra: CHAOS MONOPOLY

## Test Philosophy
- **Opaque-box & Requirement-driven**: Tests interact with CHAOS MONOPOLY exclusively through the user-facing interface, DOM interactions, standard browser APIs, WebSocket network events, and system Playwright automation.
- **Strict Independence from Internal Code**: Verification does not rely on private component state or internal reducer hooks, only observable outcomes: DOM elements, ARIA attributes, canvas presence, network messages, visual metrics, and console/error logs.
- **Methodology**: Systematic 4-tier design utilizing Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Realistic Multi-Turn Workload Simulations.

---

## Feature Inventory
| # | Feature Area | Source Requirement | Tier 1 (Features) | Tier 2 (Boundaries) | Tier 3 (Interactions) |
|---|--------------|-------------------|:-----------------:|:-------------------:|:---------------------:|
| 1 | Dice Rolling & Turn Progression | ORIGINAL_REQUEST §R1, R2, R4 | ≥ 5 | ≥ 5 | ✓ |
| 2 | Property Acquisition & Upgrades | ORIGINAL_REQUEST §R1, R2, R4 | ≥ 5 | ≥ 5 | ✓ |
| 3 | Board Raycasting & 3D Tile Selection | ORIGINAL_REQUEST §R1 (Double 3D projection) | ≥ 5 | ≥ 5 | ✓ |
| 4 | Secondary Modals & Warm Theme System | ORIGINAL_REQUEST §R1, R2 | ≥ 5 | ≥ 5 | ✓ |
| 5 | Viewport Responsiveness & Touch Targets | ORIGINAL_REQUEST §R1 (4 viewports, ≥44px CTA) | ≥ 5 | ≥ 5 | ✓ |
| 6 | Visual VFX, Confetti & Animations | ORIGINAL_REQUEST §R2 | ≥ 5 | ≥ 5 | ✓ |
| 7 | Multiplayer Room Lifecycle & Sync | ORIGINAL_REQUEST §R3 | ≥ 5 | ≥ 5 | ✓ |
| 8 | Network Reconnection & State Recovery | ORIGINAL_REQUEST §R3 | ≥ 5 | ≥ 5 | ✓ |

---

## Test Architecture

### Directory Layout
```
tests/e2e/
├── runner.js                         # Unified CLI test runner & reporter
├── tier1-features/                   # Tier 1: Feature Coverage tests (≥ 5 per feature)
│   ├── dice_and_turns.spec.js        # Dice roll, doubles, end turn, turn transition
│   ├── property_and_board.spec.js    # Buy property, house upgrades, tile hover/raycast
│   ├── modals_and_theme.spec.js      # Rules, Auction, Debt, Trade, Profile, Shop modals & theme
│   └── multiplayer_lifecycle.spec.js # Room create, join, player ready, state sync
├── tier2-boundaries/                 # Tier 2: Boundary & Corner Cases (≥ 5 per feature)
│   ├── cash_and_bankruptcy.spec.js   # Zero cash, exact bail, debt modal, bankruptcy forfeit
│   ├── interaction_stress.spec.js    # Rapid CTA button clicks, spamming rolls, modal interleaving
│   └── network_hazards.spec.js       # Unclean socket drop, malformed room codes, timeout watchdog
├── tier3-combinations/               # Tier 3: Cross-Feature Interactions (Pairwise coverage)
│   ├── auction_debt_trade.spec.js    # Auction trigger under debt, trade request during active roll
│   └── reconnect_during_ai.spec.js   # Reconnecting precisely during an automated AI turn
└── tier4-scenarios/                  # Tier 4: Real-World Multi-Turn Simulation & Viewport Matrix
    ├── game_simulation.spec.js       # Full 10+ turn automated game loop with 0 console errors
    └── viewport_matrix.spec.js       # 4-viewport responsiveness audit (375x812, 390x844, 768x1024, 812x375)
```

### Test Runner Invocation
- Executed via Node using the Playwright skill environment (`.agents/skills/playwright-e2e/`):
  ```bash
  node tests/e2e/runner.js
  ```
  Or targeting specific tiers:
  ```bash
  node tests/e2e/runner.js --tier=1
  node tests/e2e/runner.js --tier=2
  node tests/e2e/runner.js --tier=3
  node tests/e2e/runner.js --tier=4
  ```
- **Browser Channel**: Launches installed Google Chrome (`{ channel: 'chrome' }`) or Microsoft Edge (`{ channel: 'msedge' }`).
- **Pass/Fail Semantics**: Clean exit code 0 indicates 100% pass across all assertions. Non-zero exit code indicates assertion or execution failure with structured test failure summaries.

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Description & Acceptance Goal |
|---|----------|--------------------|--------------------------------|
| 1 | Full Multi-Turn Game Simulation | Dice, Properties, Upgrades, Modals, Audio/VFX | 10+ turns played end-to-end; validates turn progression, tile purchases, zero console errors, zero unhandled rejections. |
| 2 | Mobile Portrait Responsiveness (`375x812`) | Viewports, Touch Targets, HeaderBar | iPhone mini viewport: 0px horizontal overflow (`scrollWidth <= innerWidth`), all primary CTAs ≥ 44px min height. |
| 3 | Modern Mobile Portrait Responsiveness (`390x844`) | Viewports, Touch Targets, Modals | iPhone 12-15 viewport: HeaderBar button strip correctly collapsed/wrapped, full board fits without clipping. |
| 4 | Tablet Portrait Responsiveness (`768x1024`) | Viewports, Board 3D Stage, CenterCity | iPad portrait: clean 3D canvas stage, CenterCityHUD layout intact, no negative margin clipping. |
| 5 | Mobile Landscape Responsiveness (`812x375`) | Viewports, Touch Targets, Camera Controls | Compact landscape: UI panels adjust, action buttons visible and touch-accessible (≥44px), 0px horizontal overflow. |
| 6 | Mid-Game Session Reconnect & State Restoration | Multiplayer, Storage, Reconnect | Player active in room refreshes browser tab; auto-reconnect hook restores player seat, cash, and board state seamlessly. |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 40 tests across 8 feature areas (≥ 5 per feature).
- **Tier 2 (Boundary & Corner Cases)**: ≥ 40 boundary tests (zero cash, bail limits, maximum mortgages, rapid double-clicks, abrupt socket disconnects).
- **Tier 3 (Cross-Feature Combinations)**: ≥ 10 pairwise scenario tests covering complex interleavings.
- **Tier 4 (Real-World Simulations)**: ≥ 6 realistic full-game simulation and viewport audit suites.
- **Total Suite**: ≥ 96 automated tests with strict zero-console-error policy.
