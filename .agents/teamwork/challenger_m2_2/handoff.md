# Milestone 2: Adversarial Empirical Challenger Report

**Agent**: Empirical Challenger M2-2 (`challenger_m2_2`)  
**Roles**: critic, specialist  
**Recipient**: Orchestrator (`4266557a-8c82-4969-a986-f539cb233009`)  
**Date**: 2026-10-31T17:12:00Z  
**Type**: Hard Handoff  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Direct Inspection of Implementation Artifacts
1. **`src/components/board/VolumetricBuilding.tsx`**:
   - Lines 25–67: World theme styling function `getWorldTheme(worldId, fallbackHex)` cleanly maps all 4 themes (`cyberpunk-city`, `mekong-delta`, `space-colony`, and default `modern-metropolis`).
   - Lines 84–233: Distinct structural tier renderers:
     - Tier 1 (Lines 84–106): Pitch gable roof with `clipPath: polygon(50% 0%, 100% 100%, 0% 100%)` and `translateZ(10px)`.
     - Tier 2 (Lines 109–140): Twin linked duplexes with offset eaves and `translateZ(14px)`.
     - Tier 3 (Lines 143–167): Mid-rise apartment block with HVAC rooftop unit, 4-window matrix, and `translateZ(20px)`.
     - Tier 4 (Lines 170–197): Corporate tower with helipad mark (`>H<`), 6-window matrix, and `translateZ(28px)`.
     - Tier 5 (Lines 200–233): Super skyscraper landmark with crown setback, glowing crown beacon (`👑`), 9-window matrix, and `translateZ(38px)`.
   - Lines 252–276: Mortgaged state renders grayscale filter (`grayscale-[0.85]`) and caution scaffolding barrier (`🚧`) without corrupting container dimensions.
   - Line 78: Gracefully returns `null` for `level <= 0` or non-`PROPERTY` tile types (`TRANSPORT`, `UTILITY`).

2. **`src/components/board/TileComponent.tsx`**:
   - Lines 210–222: Root tile element strictly removes `opacity-85` in mortgaged state (now using `bg-[#0b101d] border-slate-800/80`).
   - Line 211: Applies `is3DView ? 'preserve-3d' : 'overflow-hidden'`. In 3D isometric view, `overflow-hidden` is completely avoided on the tile plate, preserving CSS Transforms Level 2 rendering contexts for child 3D elements.
   - Lines 223–229: Inline style applies `transformStyle: is3DView ? 'preserve-3d' : 'flat'` and tactile Z elevation (`translateZ(4px)` base, `-4px` mortgaged, `+14px` highlighted).
   - Lines 242–257: Volumetric building embedded at `translateZ(6px)` with `preserve-3d`.
   - Lines 318–338: Volumetric tokens embedded with dynamic placements and `preserve-3d`.

3. **`src/components/board/VolumetricPlayerToken.tsx`**:
   - Lines 48–60: Absolute positioning with `transformStyle: isIsometric ? 'preserve-3d' : 'flat'` and deterministic `getTokenZIndex`.
   - Lines 61–75: Ground contact drop shadow at `translateZ(0px)`.
   - Lines 77–110: 3D cylinder pedestal with extruded sidewall slices at `translateZ(-6px)` and `translateZ(-3px)`.
   - Lines 128–137: Active levitating energy ring at `translateZ(10px)` with cyan pulse.
   - Lines 139–161: Detention jail cage overlay at `translateZ(12px)` featuring vertical metallic bars, padlock icon (`🔒`), and Vietnamese tooltip `"Đang bị Tạm Giam"`.
   - Lines 164–181: Companion pet satellite orbiting at `translateZ(10px)` with emoji lookup (`🐕`, `🦦`, `🛸`, `🔥`, fallback `🐾`), automatically suppressed for AI bots and `pet-none`.

4. **`src/components/dice/VolumetricDice3D.tsx`**:
   - Lines 17–24: `OPPOSITE_FACES` mapping satisfies $1+6=7$, $2+5=7$, $3+4=7$.
   - Lines 29–36: Euler rotation angles for all 6 faces.
   - Lines 51–102: Complete cosmetic skin palette definitions for `dice-cyber-gold`, `dice-obsidian-void`, `dice-starlight`, `dice-flame-ruby`, `dice-neon-cyan`, and standard fallback.
   - Lines 107–167: True pip layouts for 1..6 pips.
   - Lines 336–345: Doubles celebration ring (`ring-4 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.7)]`) and badge (`✨ ĐÔI! LẮC THÊM LƯỢT`).

### 1.2 Tool Execution & Test Results
- **Command**: `npx vitest run src/game/__tests__/challenger_m2_volumetric_adversarial.test.tsx`
  - Output: `1 passed (1 test file), 58 passed (58 tests), 0 failures`.
  - Execution time: 1.77s.
- **Command**: `npm test`
  - Output: `31 passed (31 test files), 611 passed (611 tests), 0 failures`.
  - Duration: 8.07s.
  - Regressions: **0**.
- **Command**: `npm run build` (`tsc && vite build`)
  - Output: `built in 7.49s`, 2133 modules transformed, production assets generated cleanly in `dist/`, exit code 0.

---

## 2. Logic Chain

1. **Adversarial Building Stress Matrix**:
   - We constructed an automated stress test across all 5 architectural tiers, all 4 world themes, and both mortgaged/unmortgaged states ($5 \times 4 \times 2 = 40$ permutations).
   - In all 40 cases, the rendered DOM was verified with an empirical regex oracle: zero occurrences of `NaN`, `undefined`, or `[object Object]`.
   - Structural landmarks (gable roofs, twin eaves, HVAC units, helipads, and spire crown beacons) render at strictly increasing Z elevations ($10\text{px} \to 14\text{px} \to 20\text{px} \to 28\text{px} \to 38\text{px}$).
   - Edge cases (level $\le 0$, negative levels, transport/utility tile types) return empty markup (`null`) safely.

2. **CSS 3D Context Preservation (No Opacity-85 Flattening)**:
   - Under the W3C CSS Transforms Module Level 2 specification, applying `opacity < 1` or `overflow: hidden` to an element forces that element to flatten its 3D rendering context into a single 2D plane, destroying 3D projection for all nested children.
   - In Milestone 1, `TileComponent` used `opacity-85` for mortgaged tiles, which flattened child 3D objects.
   - Inspection and automated tests confirm that `opacity-85` has been completely eliminated from the tile container. Instead, dimming is achieved via inner background styling (`bg-[#0b101d]`).
   - The tile container explicitly sets `transformStyle: 'preserve-3d'` and avoids `overflow-hidden` when `is3DView` is active. Nested components (`SpatialBillboard`, `VolumetricBuilding`, `VolumetricPlayerToken`) retain full independent 3D parallax without flattening.

3. **Detention Cages, Companion Pets & Cosmetic Dice**:
   - Detention cages only render when `player.inDetention === true`, displaying vertical bars and padlock `🔒` at `translateZ(12px)`.
   - Companion pets render their respective emoji satellites at `translateZ(10px)` for human players, and are reliably hidden when unequipped (`pet-none`, `null`) or when occupied by AI players.
   - Volumetric 3D dice verify the opposite-face 7 sum theorem across all 36 combinations of dice rolls ($[1..6] \times [1..6]$), correctly triggering doubles celebrations and applying skin palettes without markup corruption.

4. **Production Build & Test Suite Stability**:
   - Full regression suite increased from 553 to 611 passing tests (+58 new adversarial tests).
   - TypeScript compilation and Vite production bundling completed with zero warnings/errors.

---

## 3. Caveats

- **No Caveats**: All Milestone 2 requirements and Reviewer 2 findings have been directly tested, verified against the DOM, and confirmed with zero defects.

---

## 4. Conclusion

Milestone 2 implementation is **APPROVED**:
- `VolumetricBuilding.tsx`, `VolumetricPlayerToken.tsx`, `VolumetricDice3D.tsx`, and `TileComponent.tsx` are mathematically sound, cosmetically complete, and free of CSS context-flattening or NaN/undefined bugs.
- All 611 automated tests pass cleanly with 0 regressions.
- The project is fully cleared to advance to Milestone 3 (Interactive Camera System, Spatial Chaos VFX, and Parallax Horizon Skybox).

---

## 5. Verification Method

To independently verify these findings:

1. **Run the Adversarial Stress Suite**:
   ```bash
   npx vitest run src/game/__tests__/challenger_m2_volumetric_adversarial.test.tsx
   ```
   *Expected*: 58 passed (58 tests), 0 failures.

2. **Run Full Project Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: 31 test files passed, 611 tests passed, 0 failures.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc && vite build` completes with exit code 0.
