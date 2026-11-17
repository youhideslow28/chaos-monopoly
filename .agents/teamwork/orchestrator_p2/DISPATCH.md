## 2026-10-31T11:20:18Z

# CHAOS MONOPOLY — PHASE 02
# COMPLETE GAME SYSTEMS
## Autonomous End-to-End Execution

You are continuing the existing CHAOS MONOPOLY project.

This is Phase 02 of a 7-phase development roadmap. The user authorizes autonomous execution of the entire phase without intermediate approval checkpoints.

IMPORTANT: This is an existing project. Do not restart it, replace its architecture, or discard existing working features.
(Context: Phase 01 was completed in this workspace. The workspace contains a working 40-tile modern Vietnamese board, 2d6 movement, 5-tier upgrades, 36-card Chaos PRNG engine with Mulberry32, 2.5D GPU-accelerated CSS board and UI in `src/`, 9 automated test suites with 149 passing tests in Vitest, and clean build in `dist/`).

## 1. FIRST: PROJECT CONTINUITY
Inspect:
- AGENTS.md and project instructions.
- Project Charter.
- Existing source code.
- Current game architecture.
- Existing gameplay systems.
- Test results.
- Known issues.
- Previous phase reports.

Identify implemented, partially implemented and missing features.
Preserve all working functionality.

Create or update:
- docs/CHANGELOG.md
- docs/KNOWN_ISSUES.md
- docs/TEST_REPORT.md
- docs/PROJECT_STATUS.md

## 2. AGENT ORGANIZATION
Use specialist agents or independent workstreams:
A. Game Systems Architect
B. Gameplay Rules Engineer
C. Economy & Balance Engineer
D. Trading & Auction Engineer
E. Game State & Persistence Engineer
F. UI/UX Integration Engineer
G. QA & Test Engineer

The Lead Architect owns integration and conflict resolution.
If parallel agents are unavailable, execute sequentially.
Do not stop for ordinary decisions or intermediate approvals.

## 3. COMPLETE THE CORE GAME RULES
Build a coherent and internally consistent original property-trading game.
Implement and validate:
- Turn lifecycle.
- Two-dice movement.
- Double-roll rules.
- Start tile rewards.
- Property purchase.
- Property ownership.
- Rent calculations.
- Property groups.
- Building and upgrades.
- Special tiles.
- Jail or equivalent detention mechanics.
- Tax and fees.
- Chance/event tiles.
- Auctions.
- Player-to-player trading.
- Bankruptcy.
- Victory conditions.
- Match completion.

Use configurable rules where possible.
Do not copy proprietary Monopoly content or branding.

## 4. ECONOMY SYSTEM
Create a consistent economic model.
Requirements:
- Centralized transaction handling.
- Server-independent deterministic game calculations.
- Validated balance changes.
- No negative balances caused by implementation bugs.
- Rent and upgrade formulas.
- Property valuation.
- Economic event modifiers.
- Bankruptcy asset settlement.
- Transaction history.
Add unit tests for all important financial calculations.

## 5. AUCTION SYSTEM
Implement:
- Property auction initiation.
- Eligible participants.
- Bid validation.
- Minimum bid.
- Bid updates.
- Auction completion.
- Winner payment.
- Property transfer.
- No-bid handling.
- Tie handling.
Make sure an auction cannot result in duplicate ownership or invalid transactions.

## 6. TRADING SYSTEM
Implement:
- Cash-for-property.
- Property-for-property.
- Cash plus property.
- Trade proposals.
- Acceptance and rejection.
- Cancellation.
- Validation of ownership and affordability.
- Atomic transaction resolution.
Prevent stale or invalid offers from executing.

## 7. MATCH STATE AND PERSISTENCE
Implement reliable match state management.
Requirements:
- Explicit game states.
- Valid transitions.
- Turn ownership validation.
- State serialization.
- Save and restore where appropriate.
- Recovery from browser refresh if feasible.
- Prevent duplicate action processing.
- Maintain event and transaction history.
Do not introduce unnecessary backend infrastructure if the existing MVP remains local-only.
Design persistence so online multiplayer can be added later.

## 8. GAME BALANCING
Review:
- Starting cash.
- Board size.
- Property pricing.
- Rent progression.
- Upgrade costs.
- Event frequency.
- Economic recovery.
- Match duration.
Target average match duration: 45–60 minutes.
Do not merely choose arbitrary values. Provide reasoning and test simulations where practical.

## 9. USER EXPERIENCE
Integrate all new systems into the existing UI.
Every action must provide:
- Clear available actions.
- Validation feedback.
- Transaction confirmation.
- Meaningful error messages.
- Clear current-turn indication.
Support desktop and mobile.
Maintain the established 2.5D premium/playful/cinematic art direction.
Do not regress existing visual quality.

## 10. QA REQUIREMENTS
Test:
- Two-player matches.
- Three-player matches.
- Four-player matches.
- Complete turn sequences.
- Property purchase.
- Rent.
- Upgrades.
- Auctions.
- Trading.
- Bankruptcy.
- Match victory.
- Refresh and recovery.
- Chaos event interactions.
- Invalid actions.
- Duplicate transactions.
Fix discovered defects before completion.
Run the complete production build.

## 11. FUTURE COMPATIBILITY
Maintain clean interfaces for:
- AI players.
- Online multiplayer.
- Private rooms.
- Multiple maps.
- Cosmetics.
- English localization.
Do not implement unrelated future features in this phase.

## 12. DEFINITION OF DONE
Phase 02 is complete only when:
1. Core rules are implemented.
2. Economy is consistent.
3. Auctions and trading work.
4. Match lifecycle is coherent.
5. State handling is reliable.
6. Tests pass.
7. Production build succeeds.
8. Existing functionality still works.
9. Documentation is updated.
10. Final report clearly distinguishes completed and deferred work.
