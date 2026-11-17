# Dispatch for Explorer 3: UI/UX, 2.5D Presentation & QA Verification Survey
Target directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_3\

## 2026-10-31T09:53:07Z
Sender: 5a96e09c-9d3f-4485-a785-45777085b755
Priority: MESSAGE_PRIORITY_HIGH

You are a teamwork_explorer.
Your working directory is: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_3\
Please create progress.md in your working directory to log your heartbeat.

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md

Objective:
Formulate the UI/UX, 2.5D Presentation Architecture & QA Verification Test Matrix for CHAOS MONOPOLY:
1. UI/UX & Visual Direction:
   - Visual Style: Premium, playful, cinematic, modern city theme with cyberpunk/neon flair.
   - 2.5D Simulated-3D Board:
     * Lightweight CSS 3D transforms (`transform: rotateX(45deg) rotateZ(-15deg)` or isometric perspective with depth layers and hover lift) or HTML5 Canvas rendering. Must be smooth 60fps across mobile and desktop.
     * Board layout: 10x10 square perimeter (40 tiles) or responsive square with center stage for Chaos Portal / Event Announcer / 3D Dice Arena.
     * Player tokens: distinctive 3D-styled tokens/avatars (Xe VinFast, Tàu Cao Tốc, Mèo Thần Tài, Phi Thuyền...) with smooth hopping animations along tile paths.
     * Interactive tiles: visual highlight when landed, house/hotel level badges, ownership color borders.
   - Cinematic HUD & Responsive Design:
     * Header/Top Bar: Round counter, Chaos Meter, Global Event banner, Audio toggle, Settings, Speed control (1x, 2x).
     * Player Dashboard: Sidebar or bottom bar showing 2-4 players with cash, net worth, owned properties list, jail status, bankruptcy badge.
     * Action Panel: Big tactile Roll Dice button, Buy Property modal, Upgrade modal, Trade button, End Turn button.
     * Chaos Event Splash Modal: Dramatic screen overlay with event card, icon, animation, effect description in Vietnamese, and sound effects.
     * Audio System: Synthesized procedural Web Audio API SFX (dice rattle, cash register chime, siren/police jail sound, chaos portal explosion, victory fanfare).
     * Mobile Responsiveness: Touch-friendly targets (min 44px), scrollable/zoomable board view or vertical adaptive view, bottom sheet controls.
     * Reduced motion support via CSS `@media (prefers-reduced-motion)`.
2. QA Verification & Test Architecture:
   - Complete test coverage for all 13 QA requirements in ORIGINAL_REQUEST.md:
     1. Full game setup to victory.
     2. 2, 3, and 4 player counts.
     3. Dice rolling and piece movement.
     4. Property buying and rent payment.
     5. Chaos event triggering and resolution.
     6. Insufficient funds and bankruptcy liquidation.
     7. Turn progression and invalid action rejection.
     8. Match restart and state reset.
     9. Responsive layouts (desktop + mobile viewports).
     10. Unit and integration tests.
     11. Production build cleanly bundles with 0 errors.
     12. Defect resolution.
     13. Launch verification.
   - Define test tiers: Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-feature Combinations), Tier 4 (Real-World E2E Scenarios).
   - Test framework: Vitest + Playwright/Testing Library.

Output: Write comprehensive specification to c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\teamwork_explorer_survey_3\ui_ux_and_qa_spec.md and complete handoff.md.
Then send parent a message with summary and file path.
