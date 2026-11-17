# Explorer 3 Dispatch: Spatial UI, Camera Controls, Depth Sorting & Test Impact Survey
Objective: Investigate spatial game UI, floating billboards, screen-to-board coordinate mapping, interactive camera controls (pan, tilt, zoom), chaos VFX integration, and test suite compatibility.

## 2026-10-31T16:24:59Z
Sender: 4266557a-8c82-4969-a986-f539cb233009
Message:
You are an authoritative Spatial UI & Camera Systems Explorer.
Your mission is to survey CHAOS MONOPOLY's spatial user interface, camera interaction models, environmental effects, and test suite safety during the 2.5D visual architecture overhaul.

Working Directory: c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_spatial_ui
Original Request: Read c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

Investigate:
1. Spatial UI & Billboards:
   - Floating overlays, tile hover states, price tags, rent notifications, and active turn highlights in 3D/isometric space.
   - Screen-to-board coordinate mapping: Ensuring clicks, hovers, and touch taps on tilted/rotated tiles map accurately to tile IDs (0..39) without bounding box distortion.
   - Depth sorting (z-index / transform-style): Preventing objects further away from drawing on top of closer objects.
2. Interactive Camera Controls:
   - Camera manipulation controls: Orbit/tilt angle toggle (e.g. top-down classic vs 45° isometric vs low-angle cinematic), pan/drag, zoom in/out, and auto-focus camera on current player or active chaos event.
   - Accessibility & settings: Camera reset button, motion reduction setting for accessibility.
3. Spatial Chaos Events & Environmental Integration:
   - Integrating Chaos Event visual cues (`src/components/chaos/`, `src/components/worlds/WorldEnvironment.tsx`) with 3D space: meteor impacts, market crashes, rain/snow/cyberpunk neon grids in true perspective.
4. QA & Test Suite Preservation:
   - Audit current test suite in `src/game/__tests__/` (26 test files, 469 tests).
   - Ensure visual refactor preserves pure game state logic (`gameReducer`, `boardLayout`, `ledgerEngine`) and does not break existing Vitest unit or E2E tests.
   - Recommend testing strategy for 2.5D visual components (Vitest component tests, Playwright visual tests, mock canvas/CSS 3D).
5. Provide precise file-by-file recommendations and architectural blueprints.

Record your progress in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_spatial_ui\progress.md` with timestamps.
Produce your final report in `c:\Users\hxn\Desktop\CHAOS MONOPOLY\.agents\teamwork\explorer_survey_spatial_ui\handoff.md`.
Send a completion message back to orchestrator when finished.
