# Milestone 1: 2.5D Board Slab & Spatial Foundation — Independent Review & Adversarial Audit Report

**Author**: Reviewer M1 (`reviewer_m1_1`)  
**Roles**: reviewer, critic  
**Recipient**: Orchestrator (`4266557a-8c82-4969-a986-f539cb233009`)  
**Date**: 2026-10-31T16:44:30Z  
**Verdict**: **APPROVE**  
**Type**: Hard Handoff (Milestone 1 Quality Review & Adversarial Stress-Test Complete)

---

## 1. Observation

Direct observations and evidence independently collected from the codebase, tool executions, and artifacts:

1. **Test Execution (`npm test`)**:
   - Command: `npm test` (running `vitest run`)
   - Exit code: 0
   - Result: 27 test files passed (27/27), 486 unit tests passed (486/486), duration 5.70s.
   - Specific suite: `src/game/__tests__/spatialMath.test.ts` passed all 17 tests in 14ms.
   - Zero regressions across existing game engine, ledger, multiplayer, AI, worlds, cosmetics, and boundaries test suites.

2. **Production Build Execution (`npm run build`)**:
   - Command: `npm run build` (`tsc && vite build`)
   - Exit code: 0
   - Result: 2130 modules transformed, 0 TypeScript errors, 0 bundling warnings. Generated clean production assets in `dist/` in 11.97s.

3. **Codebase Inspection**:
   - `src/components/board/spatialMath.ts`:
     - Line 32-49: `DEFAULT_CAMERA` (`pitch: 55`, `yaw: 45`, `zoom: 1.0`) and `TOP_DOWN_CAMERA` (`pitch: 0`, `yaw: 0`).
     - Line 53-56: `getTileGridPosition` uses `((tileId % 40) + 40) % 40` guaranteeing valid cyclic modulo lookup.
     - Line 96-98: `calculateDepthIndex(col, row, layerOffset)` returns `(row + col) * 100 + layerOffset`, correctly elevating foreground isometric vertices.
     - Line 130-137: `getBillboardTransform` generates `translateZ(${elevationPx}px) rotateZ(${-yaw}deg) rotateX(${-pitch}deg)`.
     - Line 144-174: `calculateFitBoardSize` accounts for $\sqrt{2}$ diamond expansion and tilt compression with `Math.SQRT2` and `Math.cos(radPitch)`, clamping to safe $[240, 760]\text{px}$.
     - Line 180-233: `screenToTileId` implements inverse rotation, boundary check `Math.abs(norm) > 1.05`, and nearest-tile Euclidean distance minimization.
   - `src/components/board/BoardSlab.tsx`:
     - Line 40-48: Ground contact shadow positioned at `translateZ(-${slabThickness + 14}px) scale(1.08)` with soft radial gradient and `blur(16px)`.
     - Line 51-61: South-West vertical wall extruded downward with `transformOrigin: 'bottom center'`, `rotateX(-90deg) translateZ(0px)`, and ambient occlusion gradient `#060911`.
     - Line 63-74: South-East vertical wall extruded downward with `transformOrigin: 'center right'`, `rotateY(90deg) translateZ(0px)`, and directional keylighting gradient `#141d2e`.
     - Line 76-98: North-West and North-East rear walls with `rotateY(-90deg)` and `rotateX(90deg)`, styled in dark substrate `#04070d`.
     - Line 103-115: Top surface plane with `transformStyle: is3DView ? 'preserve-3d' : 'flat'`, LED cyan accent rim, and volumetric drop shadows.
   - `src/components/board/SpatialBillboard.tsx`:
     - Line 19-47: Applies inverse camera transform, `preserve-3d`, `backfaceVisibility: 'hidden'`, and `WebkitFontSmoothing: 'antialiased'`.
   - `src/components/board/BoardView.tsx`:
     - Line 147: Viewport container wrapped with `.perspective-board` (3200px orthographic emulation).
     - Line 150-156: Stage element toggles `.isometric-view` (`rotateX(55deg) rotateZ(45deg)`) and `.flat-view` with smooth cubic-bezier transitions.
     - Line 168-169: Grid layout applies authentic Monopoly proportional corner scaling: `gridTemplateColumns: '1.35fr repeat(9, 1fr) 1.35fr'`, `gridTemplateRows: '1.35fr repeat(9, 1fr) 1.35fr'`.
     - Line 50-77: Responsive fit sizing using `ResizeObserver` with unmount cleanup and window event fallback.
     - Line 195-208: Deterministic depth sorting per tile using `calculateDepthIndex(col, row, 10)` in 3D view.
     - Line 84-143: Hopping intervals tracked per player in `hopIntervalsRef`, with full teardown on unmount to prevent timer leaks.
   - `src/components/board/TileComponent.tsx`:
     - Line 152-165: Tactile plate elevations: base $Z = 4\text{px}$, hover lift $Z = 12\text{px}$, active lift $Z = 14\text{px}$, mortgaged sunken $Z = -4\text{px}$.
     - Line 248-261: Price and tax readouts enclosed in `<SpatialBillboard elevation={4} camera={camera} is3D={is3DView}>`.
     - Line 193-200: Keyboard accessibility with `role="button" tabIndex={0}` and Enter/Space handlers.
     - Line 215-216: Compliant minimum interactive target size: `minHeight: '44px'`, `minWidth: '44px'`.
   - `src/index.css`:
     - Line 35-39: `.perspective-board` calibrated to `3200px`.
     - Line 42-47: `.isometric-view` calibrated to `rotateX(55deg) rotateZ(45deg)`.
     - Line 113-128: `@keyframes tokenHop3D` lifting along surface normal $+Z$ (`translateZ(6px)` to `translateZ(28px)`).
     - Line 181-199: `@media (prefers-reduced-motion: reduce)` disabling isometric tilt and hopping animations.

4. **Forensic Integrity Check**:
   - Zero hardcoded mock results in `spatialMath.ts`.
   - Zero dummy or facade implementations; all 6 faces of the cuboid slab exist in DOM with valid transform geometry.
   - Zero shortcuts bypassing the architectural requirements.
   - Verification logs and test outputs verified independently via tool execution.

---

## 2. Logic Chain

1. **Axonometric Geometric Accuracy**:
   - Observation 3 shows the camera stage rotated by `rotateX(55deg) rotateZ(45deg)` within a `perspective: 3200px` container.
   - In 3D projective geometry, rotating 45° around Z aligns grid axes symmetrically along visual diagonals. Pitching 55° with a large focal distance (3200px) creates an orthographically-emulated 2:1 dimetric presentation, eliminating trapezoidal distortion.
   - Therefore, the 2.5D visual foundation matches the project blueprint and design standard.

2. **Volumetric Cuboid Extrusion & Lighting**:
   - Observation 3 details the four sidewalls attached to each boundary edge with 90° rotations along their respective axes (`rotateX(-90deg)`, `rotateY(90deg)`, `rotateY(-90deg)`, `rotateX(90deg)`), anchoring into negative Z by 28px.
   - The South-East wall is shaded with `#141d2e` while South-West is shaded with `#060911`, and the ground shadow sits at $Z = -42\text{px}$ with a 16px blur.
   - This produces a genuine 6-faced volumetric solid with directional keylighting and soft ambient occlusion.

3. **Proportional Corner Scaling & Grid Symmetry**:
   - Observation 3 shows `gridTemplateColumns: '1.35fr repeat(9, 1fr) 1.35fr'`.
   - The corner-to-edge ratio of $1.35 / 1.0$ matches the authentic Monopoly board layout, affording proper breathing room for multi-token occupancy and landmark icons on corner tiles (Start, Detention, Free Parking, Go To Detention).

4. **Billboard Readability**:
   - Observation 3 shows `SpatialBillboard` applying `rotateZ(-yaw) rotateX(-pitch)`.
   - Because the parent isometric stage applies $R_X(pitch) \cdot R_Z(yaw)$, multiplying by $R_Z(-yaw) \cdot R_X(-pitch)$ cancels the rotation to identity ($I$).
   - This keeps text, price readouts, and badge icons strictly coplanar with the camera screen, preventing distortion or font blur.

5. **Test Preservation & Build Hygiene**:
   - Observations 1 and 2 prove that all 486 unit tests pass with zero failures and the production build compiles with zero errors or warnings.
   - Headless engine logic, multiplayer synchronization, and existing test suites are 100% intact.

---

## 3. Adversarial Review & Challenge Report

### Overall Risk Assessment: LOW

### Stress-Test Scenarios & Counter-Examples

1. **Challenge 1: Viewport Boundary Clipping on Small Mobile Screens**:
   - *Assumption*: The diamond-oriented board ($W \times \sqrt{2}$) might exceed mobile viewport boundaries (e.g. 375px width).
   - *Attack Scenario*: Screen width is 375px. An 860px board would be 1216px wide, causing horizontal scrolling and HUD breakage.
   - *Evaluation*: Tested with `calculateFitBoardSize(375, 667, DEFAULT_CAMERA)`. The function outputs a clamped size of 240px; its diamond width is $240 \times 1.414 = 339\text{px}$, which comfortably fits within 375px with 18px padding on each side.
   - *Result*: **PASS**.

2. **Challenge 2: Negative and Cyclical Index Lookups in Pure Math Functions**:
   - *Assumption*: Out-of-bounds or negative tile IDs passed to `getTileGridPosition` or `getTileBoardCoords` could throw an exception or return undefined.
   - *Attack Scenario*: Passing `tileId = -1`, `40`, `80`, or `NaN`.
   - *Evaluation*: `((tileId % 40) + 40) % 40` correctly resolves $-1 \to 39$, $40 \to 0$, $80 \to 0$. For `NaN`, fallback `{ col: 11, row: 11 }` is returned.
   - *Result*: **PASS**.

3. **Challenge 3: Rapid State Transitions & Unmount Timer Leaks**:
   - *Assumption*: Triggering rapid successive dice rolls while tokens are actively hopping could spawn orphaned `setInterval` timers updating unmounted state.
   - *Attack Scenario*: Player rolls, position updates, component quickly receives new props or unmounts.
   - *Evaluation*: Inspected `BoardView.tsx` lines 102-106 and 137-141. Active intervals are keyed by player ID in `hopIntervalsRef.current[p.id]`. Any subsequent update clears the previous interval, and the `useEffect` cleanup hook iterates over all intervals and executes `clearInterval`.
   - *Result*: **PASS**.

4. **Challenge 4: Division by Zero in Screen Projection / Inverse Raycasting**:
   - *Assumption*: Extreme camera angles (pitch = 90°) or zero-sized containers could trigger `NaN` or `Infinity`.
   - *Attack Scenario*: Pitch = 90° ($\cos(90^\circ) = 0$), zoom = 0, containerWidth = 0.
   - *Evaluation*: Handled via `if (Math.abs(cosPitch) < 0.01) return null;` in `screenToTileId`, `Math.max(0.1, camera.zoom || 1.0)` and `if (containerWidth <= 0 || containerHeight <= 0) return 360;` in `calculateFitBoardSize`.
   - *Result*: **PASS**.

---

## 4. Caveats

1. **Subpixel Hairlines on High-DPI Displays**:
   - On certain GPU architectures with non-integer Windows scaling (e.g. 125% or 150%), hairline seams can occasionally appear between CSS 3D transformed grid cells. This is an inherent browser rasterization limitation mitigated by dark under-slab styling and `backface-visibility: hidden`.
2. **Milestone 2 Consumption Readiness**:
   - Milestone 1 provides the spatial slab, depth indexing, billboarding, and proportional grid. Volumetric 3D player tokens, multi-player stacking, 3D buildings (Tiers 1..5), and 3D tumbling dice will be implemented in Milestone 2 atop this infrastructure.

---

## 5. Conclusion

**Verdict: APPROVE**

Milestone 1 satisfies all requirements of the CHAOS MONOPOLY 2.5D Visual Architecture Overhaul:
1. Complete mathematical foundation with coordinate projections, depth sorting, and inverse billboarding.
2. Authentic 6-faced volumetric board slab with 28px extruded sidewalls, ambient occlusion, directional lighting, and ground shadow.
3. Proportional 1.35fr corner scaling and responsive container-fit sizing preventing vertex clipping.
4. Tactile tile elevation ($Z = 4\text{px}$, $12\text{px}$, $14\text{px}$, $-4\text{px}$) with camera-facing billboarding.
5. 100% test pass rate (27/27 test files, 486/486 tests) and zero-error production build.
6. Zero integrity violations or facades.

---

## 6. Verification Method

To independently verify this verdict:

1. **Run Unit Tests**:
   ```bash
   npx vitest run src/game/__tests__/spatialMath.test.ts
   ```
   *Expected Output*: 17 passed (17) in < 50ms.

2. **Run Full Regression Suite**:
   ```bash
   npm test
   ```
   *Expected Output*: 27 test files passed, 486 tests passed, 0 failures.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected Output*: `tsc && vite build` completes with exit code 0.

4. **Verify Milestone Deliverable Files**:
   - `src/components/board/spatialMath.ts`
   - `src/components/board/BoardSlab.tsx`
   - `src/components/board/SpatialBillboard.tsx`
   - `src/components/board/BoardView.tsx`
   - `src/components/board/TileComponent.tsx`
   - `src/index.css`
   - `src/game/__tests__/spatialMath.test.ts`
