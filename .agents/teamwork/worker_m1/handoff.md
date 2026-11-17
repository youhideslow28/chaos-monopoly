# Milestone 1: Spatial Math & Core 2.5D Board Infrastructure — Handoff Report

**Author**: Worker M1 (`worker_m1`)  
**Roles**: implementer, qa, specialist  
**Recipient**: Orchestrator (`4266557a-8c82-4969-a986-f539cb233009`)  
**Date**: 2026-10-31T16:40:00Z  
**Type**: Hard Handoff (Milestone 1 Complete)

---

## 1. Observation

Direct observations and evidence from the codebase before and after implementation:

1. **Previous Presentation Flaws**:
   - In `src/index.css`, the former `.isometric-view` used `rotateX(24deg) rotateZ(-4deg)` with `perspective: 1400px`. This was a shallow square forward tilt rather than an axonometric isometric diamond.
   - In `src/components/board/BoardView.tsx`, the board grid used `repeat(11, minmax(0, 1fr))`, giving corner tiles identical square fractions rather than traditional Monopoly proportional scaling.
   - The board was a single flat 2D `div` with zero thickness, no extruded vertical sidewalls, no ambient occlusion, and no ground contact shadow.
   - In `src/components/board/TileComponent.tsx`, all tiles sat on a flat 2D plane ($Z = 0$), hover was a simple 2D scale, mortgaged tiles did not recess, and text readouts warped under 3D projection without camera billboarding.
   - In `src/index.css`, `@keyframes tokenHop` moved along `translateY(-14px)`, which in tilted 3D space slid tokens across the surface rather than lifting vertically along the surface normal ($+Z$).

2. **Milestone 1 Files Implemented & Modified**:
   - `src/components/board/spatialMath.ts` (NEW, 185 lines): Pure TypeScript engine for 3D coordinates, screen projection, depth sorting (`depth = (row + col) * 100 + layerOffset`), container-fit board sizing (`calculateFitBoardSize`), and camera-facing billboarding transforms (`getBillboardTransform`).
   - `src/components/board/BoardSlab.tsx` (NEW, 114 lines): 6-faced volumetric 3D cuboid pedestal with 28px extruded South-West and South-East sidewalls, ambient occlusion gradient shading, beveled LED accent rim, and ground contact shadow (`translateZ(-42px)`).
   - `src/components/board/SpatialBillboard.tsx` (NEW, 46 lines): Camera-facing 3D container applying inverse camera rotation (`rotateZ(-yaw) rotateX(-pitch)`) to keep text crisp and unwarped.
   - `src/components/board/BoardView.tsx` (MODIFIED, 240 lines): Wrapped in calibrated 2.5D stage (`perspective: 3200px`), integrated `BoardSlab`, applied proportional corner scaling (`gridTemplateColumns: '1.35fr repeat(9, 1fr) 1.35fr'`), responsive fit sizing with `ResizeObserver`, deterministic depth index per tile, and clean 2D toggle fallback.
   - `src/components/board/TileComponent.tsx` (MODIFIED, 335 lines): Added tactile 3D plate depth (`translateZ(4px)`), hover lift (`translateZ(12px)` with dynamic drop shadow), mortgaged sunken state (`translateZ(-4px)` with hazard overlay), elevated tokens (`translateZ(8px)`), and `SpatialBillboard` for price and tax readouts.
   - `src/index.css` (MODIFIED, 227 lines): Calibrated `.perspective-board` to `3200px` for orthographic emulation, `.isometric-view` to `rotateX(55deg) rotateZ(45deg)`, added `.preserve-3d` and `.backface-hidden`, added `@keyframes tokenHop3D` and `.animate-token-hop-3d` along $+Z$ axis, and updated `prefers-reduced-motion`.
   - `src/game/__tests__/spatialMath.test.ts` (NEW, 153 lines): 17 unit tests verifying all math engine functions.

3. **Tool Invocations & Verification Commands**:
   - `npx vitest run src/game/__tests__/spatialMath.test.ts`: 17 passed (17 tests) in 10ms.
   - `npm test`: 27 passed (27 test files), 486 passed (486 tests) in 6.25s. Zero failures, zero regressions across all existing game engine, ledger, multiplayer, and world suites.
   - `npm run build` (`tsc && vite build`): Succeeded in 7.20s with zero TypeScript compilation errors or bundling warnings.

---

## 2. Logic Chain

The step-by-step reasoning linking observations to implementation:

1. **Axonometric Diamond Geometry**:
   - Rotating the board by 45 degrees (`rotateZ(45deg)`) aligns the board edges along diagonal axes, creating the classic isometric diamond presentation.
   - Pitching by 55 degrees (`rotateX(55deg)`) with high-perspective distance (`3200px`) emulates true axonometric projection without noticeable trapezoidal keystoning, ensuring distant tiles remain legible.
2. **Container-Fit Sizing & Vertex Clearance**:
   - A square rotated 45 degrees expands in bounding width by $\sqrt{2} \approx 1.414$. An 860px board expands to 1216px, which would clip outside standard viewport widths.
   - `calculateFitBoardSize(containerWidth, containerHeight, camera)` divides available container width by $\sqrt{2} \times \text{zoom}$ and available container height by $\sqrt{2} \times \cos(\text{pitch}) \times \text{zoom}$ with safety factors.
   - Integrated with `ResizeObserver` in `BoardView.tsx`, the board dynamically resizes to fit comfortably on desktop, laptop, tablet, and mobile screens without horizontal or vertical clipping.
3. **Volumetric Cuboid Extrusion**:
   - A physical board game has tangible slab depth. By positioning 4 vertical perimeter walls rotated 90 degrees around their respective attachment edges, the board forms a true 6-faced 3D solid cuboid.
   - Shading the South-West wall with ambient occlusion (`#060911`) and illuminating the South-East wall (`#141d2e`) creates directional keylighting that accentuates the 3D volume.
4. **Camera-Facing Billboarding**:
   - Projecting flat text onto a surface rotated by `rotateX(55deg) rotateZ(45deg)` causes font distortion and subpixel blurring.
   - By applying the inverse sequence `rotateZ(-yaw) rotateX(-pitch)` inside `SpatialBillboard.tsx`, the child text element cancels out the camera rotation and remains parallel to the user's viewport screen, preserving crisp anti-aliased font rendering.
5. **Tactile Elevation & Depth Hierarchy**:
   - Tiles are elevated to $Z = 4\text{px}$ to establish plate depth above the slab.
   - Hover lifts tiles to $Z = 12\text{px}$ with expanded drop shadow, providing immediate tactile feedback.
   - Mortgaged properties sink to $Z = -4\text{px}$ with inner shadow and caution stripes.
   - Deterministic depth sorting $\text{depth} = (\text{row} + \text{col}) \times 100 + \text{layerOffset}$ guarantees that foreground tiles (higher row and column) always render on top of background tiles.

---

## 3. Caveats

1. **Subpixel GPU Rendering on High DPR Displays**:
   On Windows with non-integer display scaling (e.g. 125% or 150%), CSS 3D transforms can occasionally show hairline subpixel gaps between adjacent grid cells. Mitigated by applying `backface-visibility: hidden` and dark under-slab styling so gaps do not bleed light.
2. **2D vs 3D Coordinate Mapping**:
   In 2D mode (`is3DView = false`), `BoardSlab` omits extruded walls and `TileComponent` returns to flat plate mode. The transition smoothly animates over 0.6s.
3. **Upstream Milestone 2 Hand-off**:
   `SpatialBillboard` is ready for consumption by Milestone 2 for 3D volumetric player tokens, tier 1..5 buildings, and dice.

---

## 4. Conclusion

Milestone 1 is completely implemented, verified, and hardened.
- The CHAOS MONOPOLY board now features an authentic 2.5D isometric diamond presentation (`rotateX(55deg) rotateZ(45deg)`), a true 6-faced volumetric 3D cuboid slab, proportional 1.35fr corner scaling, responsive container-fit sizing preventing vertex clipping, tactile tile plate depth and hover lifts, camera-facing unwarped spatial billboarding, and 3D token hopping along $+Z$.
- Zero regressions: All 27 test files and 486 tests pass (100% success rate), and production build passes cleanly.

---

## 5. Verification Method

To independently verify Milestone 1:

1. **Run Unit Tests**:
   ```bash
   npx vitest run src/game/__tests__/spatialMath.test.ts
   ```
   **Expected**: 17 tests passed in ~10ms.

2. **Run Full Regression Test Suite**:
   ```bash
   npm test
   ```
   **Expected**: 27 test files passed, 486 tests passed with 0 failures.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   **Expected**: `tsc && vite build` succeeds with exit code 0 and bundles chunks in `dist/`.

4. **Code Inspection**:
   - Inspect `src/components/board/spatialMath.ts` for pure math functions.
   - Inspect `src/components/board/BoardSlab.tsx` for 6-face cuboid geometry and ground shadow.
   - Inspect `src/components/board/SpatialBillboard.tsx` for inverse camera transform.
   - Inspect `src/components/board/BoardView.tsx` for isometric stage, proportional corners, and fit sizing.
   - Inspect `src/components/board/TileComponent.tsx` for tactile depth ($4\text{px}$, $12\text{px}$, $-4\text{px}$) and billboarding.
   - Inspect `src/index.css` for `3200px` perspective and `tokenHop3D`.
