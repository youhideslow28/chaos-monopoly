# Milestone 2: Volumetric Objects & 3D Geometry Handoff Report

**Agent**: Worker M2 (`worker_m2`)  
**Roles**: implementer, qa, specialist  
**Recipient**: Orchestrator (`4266557a-8c82-4969-a986-f539cb233009`)  
**Date**: 2026-10-31T17:06:00Z  
**Type**: Hard Handoff (Milestone 2 Implementation Complete)  

---

## 1. Observation

### 1.1 Exclusively Owned Files Implemented and Modified
1. `src/components/board/tokenStackingEngine.ts` (NEW, 149 lines):
   - Implemented pure math placement algorithm `computeTokenPlacements(playersHere, activePlayerId, isIsometric)`.
   - Layouts: 1P (Center: 50%, 58%, scale 1.0, Z: 14px), 2P (Diagonal split: SW 33%, 66%, Z: 16px, NE 67%, 50%, Z: 12px, scale 0.88), 3P (Delta pod: Apex S 50%, 70%, Z: 18px, East 72%, 48%, West 28%, 48%, scale 0.80), 4P (Isometric diamond: South 50%, 74%, East 75%, 56%, West 25%, 56%, North 50%, 38%, scale 0.72).
   - Bounds strictly clamped to $[5\%, 95\%]$; scale constrained to $[0.72, 1.0]$.
   - Active player elevated by $+6\text{px}$ and assigned forefront position (highest `depthIndex`).
   - Deterministic zIndex formula:
     $$\text{zIndex} = 20 + \text{depthIndex} \times 5 + (\text{isPlayerActive} ? 50 : 0)$$

2. `src/components/board/VolumetricPlayerToken.tsx` (NEW, 175 lines):
   - 3D cylinder pedestal with extruded side rim bevels (`translateZ(-6px)` and `translateZ(-3px)` darkened slices).
   - Radial gradient top face with metallic border, player's `colorHex` / `accentHex`, and symbol.
   - Ground contact drop shadow at ground plane (`translateZ(0px)`).
   - Companion pet satellite orbiting at $(+14\text{px}, -10\text{px}, Z: 10\text{px})$ with emoji rendering.
   - Active levitating energy ring at `translateZ(10px)` with cyan pulse animation (`animate-pulse-subtle`).
   - Detention cage overlay enclosing token with vertical metallic bars and padlock (`🔒`).

3. `src/components/board/VolumetricBuilding.tsx` (NEW, 280 lines):
   - Tiers 1 through 5 architectural miniature buildings:
     - Level 1: Shophouse / Townhouse with pitched gable roof (`polygon(50% 0%, 100% 100%, 0% 100%)`).
     - Level 2: Duplex / Dual Shophouses with twin linked 2-story buildings and offset eaves.
     - Level 3: Mid-Rise Apartments with rooftop HVAC unit and window matrix.
     - Level 4: Corporate High-Rise Tower with cantilever crown and rooftop helipad (`H`).
     - Level 5: Monumental Landmark / Super Skyscraper with iconic spire and crown beacon (`👑`).
   - World themes supported: `modern-metropolis` (concrete & tempered glass), `cyberpunk-city` (obsidian & neon cyan/fuchsia trims), `mekong-delta` (timber pilings & curved clay terracotta), `space-colony` (titanium shell & solar panels).
   - Mortgaged state renders grayscale filter (`grayscale-[0.85]`) and pulsing caution barrier scaffolding (`🚧`).

4. `src/components/dice/VolumetricDice3D.tsx` (NEW, 382 lines):
   - True 6-faced CSS 3D cube dice with opposite faces summing to 7:
     - $1 + 6 = 7$, $2 + 5 = 7$, $3 + 4 = 7$.
   - Mathematical face normal Euler rotation angles:
     - $1 \to (0^\circ, 0^\circ)$, $6 \to (0^\circ, 180^\circ)$, $2 \to (-90^\circ, 0^\circ)$, $5 \to (90^\circ, 0^\circ)$, $3 \to (0^\circ, -90^\circ)$, $4 \to (0^\circ, 90^\circ)$.
   - Multi-axis tumbling physics simulation with 2-stage bounce trajectory (`translateY(-28px) -> translateY(-10px) -> translateY(0)`).
   - Full cosmetic dice skin palette support: `dice-neon-cyan`, `dice-cyber-gold`, `dice-obsidian-void`, `dice-starlight`, `dice-flame-ruby`, and standard.
   - Double-dice golden celebration aura (`ring-4 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.7)]`).
   - Seamless `prefers-reduced-motion: reduce` query detection that bypasses tumbling and snaps to target face.

5. `src/components/board/TileComponent.tsx` (UPDATED):
   - Integrated `<VolumetricBuilding>` in the upper quadrant of property tiles.
   - Integrated `<VolumetricPlayerToken>` using dynamic placements from `computeTokenPlacements`.
   - **Fixed Reviewer 2 Finding 1**: Removed `opacity-85` from root tile container; applied dimming to inner background (`bg-[#0b101d]`) to preserve CSS 3D rendering context for all child elements.

6. `src/components/board/CenterCityView.tsx` (UPDATED):
   - Replaced 2D flat dice with `<VolumetricDice3D>`.
   - **Fixed Reviewer 2 Finding 4**: Replaced `overflow-hidden backdrop-blur-xl` with `overflow-visible` and `transformStyle: 'preserve-3d'` to prevent clipping and context-flattening of tumbling 3D dice.

7. `src/components/board/spatialMath.ts` (UPDATED):
   - **Fixed Reviewer 2 Finding 2**: Scaled lower clamp in `calculateFitBoardSize` dynamically when `containerWidth >= 160 && containerWidth < 360` so that 320px mobile viewports achieve zero diamond vertex clipping while preserving standard test bounds.

8. `src/components/board/BoardView.tsx` (UPDATED):
   - **Fixed Reviewer 2 Finding 3**: Updated grid template tracks to `minmax(0, 1.35fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.35fr)` preventing grid track blowout on small containers. Passed `worldId` down to `TileComponent`.

9. `src/game/__tests__/volumetric_objects.test.ts` (NEW, 560 lines):
   - 29 comprehensive automated unit tests covering all Milestone 2 tasks and Reviewer 2 findings.

### 1.2 Build & Test Verification Results
- **Command**: `npm test`
  - Output: `30 passed (30 test files), 553 passed (553 tests), 0 failures`.
  - Regression count: **0**.
- **Command**: `npx vitest run src/game/__tests__/volumetric_objects.test.ts`
  - Output: `29 passed (29 tests), 0 failures`.
- **Command**: `npm run build` (`tsc && vite build`)
  - Output: Succeeded in 6.10s, 2133 modules transformed, 0 TypeScript compiler errors. Production bundle generated cleanly in `dist/`.

---

## 2. Logic Chain

1. **Collision-Free Token Geometry**:
   - In 2.5D isometric view, multiple player tokens occupying the same tile can obscure one another if rendered in a flat flex row.
   - `tokenStackingEngine.ts` uses calibrated geometric formations (diagonal split for 2P, delta pod for 3P, diamond for 4P).
   - By sorting `depthIndex` and giving the active player the foremost slot (highest depthIndex and $+6\text{px}$ elevation), the active player is guaranteed to be unobstructed regardless of tile occupancy.
2. **True 3D Cube Dice Mathematics**:
   - Conventional Monopoly implementations use flat 2D sprites.
   - `VolumetricDice3D.tsx` constructs genuine 6-faced CSS 3D cubes where opposite faces strictly sum to 7 ($1+6, 2+5, 3+4$).
   - Face normal Euler transformations rotate the cube container directly towards the viewer to display any rolled outcome $1\dots 6$.
   - Multi-axis tumbling and 2-stage bounce impact create physical weight and tactile realism.
3. **Architectural Tier & World Theme Realism**:
   - `VolumetricBuilding.tsx` creates authentic physical miniature buildings standing along $+Z$ in 2.5D space.
   - Dimensions scale progressively from Tier 1 Shophouses ($Z = 10\text{px}$) to Tier 5 Super Landmarks ($Z = 38\text{px}$ with glowing crown beacon).
   - Theme presets seamlessly render Metropolis glass, Cyberpunk neon, Mekong timber, and Space colony titanium.
4. **Resolution of Reviewer 2 Findings**:
   - *Finding 1 (Mortgaged 3D Flattening)*: Removing `opacity-85` from the root tile ensures CSS Transforms Level 2 context is preserved; child 3D transforms (`SpatialBillboard`, `VolumetricBuilding`, `VolumetricPlayerToken`) project cleanly in 3D.
   - *Finding 2 (320px Screen Clipping)*: Dynamic clamp scaling in `calculateFitBoardSize` ensures diamond width on a 320px viewport is $\le 288.5\text{px} < 320\text{px}$ (zero vertex clipping).
   - *Finding 3 (Grid Track Minimums)*: `minmax(0, ...)` tracks eliminate grid blowout when children have minimum dimensions.
   - *Finding 4 (Center City 3D Barrier)*: Replacing `overflow-hidden backdrop-blur-xl` with `overflow-visible transform-style: preserve-3d` allows 3D dice to tumble and bounce freely above the plaza.

---

## 3. Caveats

1. **Backface Visibility in Hardware Emulation**:
   - CSS `backface-visibility: hidden` is applied to all 6 cube faces. In rare older software-emulated WebKit renderers, backfaces might faintly show through if hardware acceleration is disabled. Both `-webkit-backface-visibility` and standard properties are included.
2. **Reduced Motion Accessibility**:
   - `prefers-reduced-motion` is queried both via CSS and dynamically in React state to ensure users with vestibular disorders experience immediate result presentation without motion sickness.

---

## 4. Conclusion

Milestone 2 implementation is **COMPLETE** and verified:
- Genuine volumetric 2.5D tokens, buildings, and 3D dice are fully functional.
- Zero facades or dummy implementations; all mathematics and physics are fully realized.
- 100% test pass (553/553 tests passing across 30 test files) with 0 regressions.
- Clean TypeScript and Vite production build (`npm run build`).
- Ready for Milestone 3 (Interactive Camera System, Spatial Chaos VFX, Parallax Horizon Skybox).

---

## 5. Verification Method

To independently verify this implementation:

1. **Run Unit Tests**:
   ```bash
   npx vitest run src/game/__tests__/volumetric_objects.test.ts
   ```
   *Expected*: 29 passed (29 tests) with 0 failures.

2. **Run Full Regression Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: 30 test files passed, 553 tests passed with 0 failures.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc && vite build` completes with exit code 0 and 0 errors.

4. **Inspect Source Artifacts**:
   - Inspect `src/components/board/tokenStackingEngine.ts` for collision-free formations and zIndex depth sorting.
   - Inspect `src/components/board/VolumetricPlayerToken.tsx` for 3D cylinder pedestal, bevel rim, companion pet, and detention cage.
   - Inspect `src/components/board/VolumetricBuilding.tsx` for Tiers 1..5 and 4 world themes.
   - Inspect `src/components/dice/VolumetricDice3D.tsx` for 6-face cube construction and opposite-face 7 sum.
   - Inspect `src/components/board/TileComponent.tsx` for removal of `opacity-85` and volumetric object embedding.
