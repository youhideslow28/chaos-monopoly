# Technical Survey & Architectural Blueprint: Spatial UI, Interactive Camera Controls, Environmental Integration & Test Suite Safety

**Author**: Spatial UI & Camera Systems Explorer (`explorer_survey_spatial_ui`)  
**Target Milestone**: Survey & 2.5D Visual Architecture Blueprint  
**Status**: COMPLETE  

---

## 1. Observations

### 1.1 Existing Board Presentation & 3D CSS Transformations
* **`src/index.css` (lines 35–54)**:
  ```css
  /* 3D Board Perspective Viewport */
  .perspective-board {
    perspective: 1400px;
    perspective-origin: 50% 60%;
  }

  /* 2.5D Isometric Tilt Mode */
  .isometric-view {
    transform: rotateX(24deg) rotateZ(-4deg);
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
    box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(6, 182, 212, 0.15);
  }

  /* 2D Flat Mode */
  .flat-view {
    transform: rotateX(0deg) rotateZ(0deg);
    transform-style: flat;
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
    box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.8);
  }
  ```
  The current "isometric" view is merely a `24deg` X-tilt with a `-4deg` Z-twist. It is not true isometric (which requires ~`54.7deg` or `60deg` pitch with `45deg` yaw), lacks extruded Z-slab geometry, and flattens all internal elements.

* **`src/components/board/TileComponent.tsx` (lines 145–277)**:
  - All tile content (icon, label, price tag, house upgrade stars, mortgage overlay, player tokens) is laid out in a flat flex column on the same 2D plane:
    ```tsx
    className={`relative w-full h-full flex flex-col justify-between p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer overflow-hidden border select-none ...`}
    ```
  - When tilted in 3D, text (`text-[8px] sm:text-[10px]`) and price readouts (`${tile.property.basePrice}M`) are distorted and undergo subpixel blur.
  - Player tokens are packed horizontally in the bottom corner with `-space-x-1` (lines 244–272). In a tilted 3D perspective, this causes tokens to look like flat stickers pasted on the floor rather than standing pieces.
  - Hover effect is simply `hover:scale-[1.02]` on the flat tile (line 162), which does not provide any 3D physical lift or tactile depth.

* **`src/components/board/BoardView.tsx` (lines 98–118)**:
  - Outer container wraps the board in `perspective-board overflow-visible`.
  - The board container has a fixed 11x11 grid (`grid grid-cols-11 grid-rows-11 gap-0.5 sm:gap-1`).
  - Active turn highlighting is a 2D ring on the active tile (`ring-2 ring-cyan-400 z-20 scale-[1.03]`), with no elevated aura, spotlight, or vertical billboard.

### 1.2 Camera Controls & View Toggling
* **`src/App.tsx` (lines 91, 730–740)**:
  - Camera control is currently a single boolean state: `const [is3DView, setIs3DView] = useState<boolean>(true);`.
  - There are no controls for pan/drag, zoom in/out, rotating camera angles, or focusing on active players or chaos events.
* **`src/components/common/HeaderBar.tsx` (lines 152–166)**:
  - Contains a single toggle button switching between `is3DView` true and false:
    ```tsx
    <button onClick={onToggle3D} title="Chuyển góc nhìn 2.5D Isometric / 2D Phẳng">
      <Eye className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{is3DView ? 'Góc 2.5D' : 'Góc 2D'}</span>
    </button>
    ```

### 1.3 Environmental Effects & Chaos Visuals
* **`src/components/worlds/WorldEnvironment.tsx` (lines 6–34)**:
  - Environment is implemented via full-screen fixed 2D overlays (`fixed inset-0 z-0`):
    ```tsx
    {kind === 'rain' && <div className="world-env-rain absolute inset-0" style={{ opacity: 0.35 * o }} />}
    {kind === 'stars' && <div className="world-env-stars absolute inset-0" style={{ opacity: 0.8 * o }} />}
    {kind === 'fireflies' && ...}
    ```
  - Rain, stars, and fireflies are strictly 2D CSS background animations completely detached from the 3D board plane.
* **`src/components/chaos/ChaosModal.tsx` (lines 87–186)**:
  - Chaos cards trigger a static 2D centered modal popup. There are no spatial indicators, shockwaves, laser grids, or crater effects on the board itself when calamities strike specific tiles.

### 1.4 Test Suite & Architectural Decoupling
* **`package.json` & `vite.config.ts`**:
  - `vite.config.ts` (lines 31–34):
    ```ts
    test: {
      globals: true,
      environment: 'node',
    },
    ```
  - All Vitest tests run in a pure Node.js headless environment.
* **`src/game/__tests__/` (26 test files, 469 tests)**:
  - Verified: Every single test file in `src/game/__tests__/` (`gameEngine.test.ts`, `ledgerEngine.test.ts`, `phase03_ai_and_chaos.test.ts`, `phase04_multiplayer.test.ts`, `phase05_worlds.test.ts`, `phase06_cosmetics_ui.test.ts`, `phase07_*`, `tier1`–`tier5`, and `e2e/tier*`) tests headless pure business logic:
    - Finite State Machine state transitions (`gameReducer.ts`)
    - Double-entry accounting invariants (`ledgerEngine.ts`)
    - Multi-world data schemas (`validate.ts`, `catalog.ts`)
    - Authoritative server security & multiplayer protocols (`roomManager.ts`, `protocol.ts`)
  - **Zero tests import UI components, DOM elements, or CSS transforms.**

---

## 2. Logic Chain

### 2.1 Spatial UI & Billboarding
1. *Premise*: When a DOM element undergoes 3D rotation (`rotateX(50deg) rotateZ(-35deg)`), all child elements are projected into the tilted plane. Small typography (8px–10px) suffers heavy aliasing and becomes illegible.
2. *Deduction*: Information elements that require readability (price tags, floating rent popups, tile hover tooltips, active turn player banners) must not stay flat on the tile. They must stand upright facing the camera.
3. *Mechanism*: In CSS 3D with `transform-style: preserve-3d`, a child element at elevation $Z$ can achieve camera-facing billboarding by applying an inverse rotation:
   $$\text{transform} = \text{translateZ}(Z) \times \text{rotateZ}(-\text{yaw}) \times \text{rotateX}(-\text{pitch})$$
   This guarantees that regardless of camera tilt or pan, the billboard text is rendered parallel to the camera sensor, eliminating perspective distortion and maintaining font clarity.
4. *Depth Sorting & Z-fighting*:
   - Co-planar layers (e.g. tile face and district color bar) cause flickering (Z-fighting) in GPU rasterization.
   - Assigning discrete Z-elevation offsets resolves Z-fighting deterministically:
     - Board slab top: $Z = 0\text{px}$
     - Tile surface plate: $Z = 4\text{px}$
     - District color band & decals: $Z = 6\text{px}$
     - Property volumetric buildings: $Z = 8\text{px} \dots 36\text{px}$
     - Standing tokens: $Z = 10\text{px}$ (hopping up to $42\text{px}$)
     - Floating price tags / rent billboards: $Z = 48\text{px}$
   - Furthermore, perimeter tiles further away in perspective (North edges: tiles 15–25) must have lower DOM stacking index than foreground tiles (South edges: tiles 0–5, 35–39) using the formula:
     $$\text{depth}(r, c) = (r + c) \times 100 + \text{layerOffset}$$

### 2.2 Screen-to-Board Coordinate Mapping & Precision Pointer Hit-Testing
1. *Premise*: In tilted CSS 3D containers, clicks and hovers are raycast by the browser engine.
2. *Threats to Click Accuracy*:
   - If a parent container has `overflow: hidden`, `clip-path`, `opacity < 1`, or `filter`, CSS Transforms Level 2 specification mandates that the 3D rendering context is **flattened**, breaking 3D pointer accuracy.
   - If adjacent tile containers expand beyond their grid cell or drop shadows intercept pointer events, clicking a tile may hit an adjacent tile.
   - If high-elevation floating billboards ($Z = 48\text{px}$) cover the tile, they intercept clicks intended for the tile plate.
3. *Mitigations*:
   - Ensure the board container maintains `transform-style: preserve-3d` and avoids `overflow: hidden` on intermediate wrappers.
   - Set `pointer-events: none` on all decorative billboards, drop shadows, and VFX particles.
   - Implement `useBoardRaycaster` / `spatialMath.ts` providing an affine inverse matrix transformation from screen `(clientX, clientY)` to tile index `0..39`, ensuring touch taps on mobile have mathematical fallback precision.

### 2.3 Interactive Camera Control Model
1. *Premise*: Different players have different ergonomic and visual preferences: strategic analysis benefits from top-down 2D; immersive play benefits from 2.5D isometric; cinematic observation benefits from low-angle perspective.
2. *Deduction*: The binary `is3DView` must be elevated to a robust `CameraState` managing:
   - Presets: `TOP_DOWN` (0° pitch), `ISOMETRIC` (50° pitch, -35° yaw), `CINEMATIC` (65° pitch, -20° yaw), `TACTICAL` (35° pitch, -45° yaw).
   - Dynamic Pan: Mouse drag / 2-finger drag with bounded limits ($\pm 250\text{px}$).
   - Smooth Zoom: Wheel / pinch scaling between $0.6\times$ and $1.6\times$.
   - Auto-Focus: Automatically smooth-lerping to the active player's tile or targeted chaos tile.
   - Reset Button: One-click restoration to default framing.
3. *Accessibility (`prefers-reduced-motion`)*:
   - Query `window.matchMedia('(prefers-reduced-motion: reduce)')`.
   - When active, all camera transitions must be instantaneous (0ms duration), auto-focus lerps disabled, and wobbles disabled.

### 2.4 Spatial Chaos & Environmental Integration
1. *Premise*: World atmosphere currently feels detached because it is a flat 2D viewport overlay.
2. *Deduction*:
   - World background should feature a distant 3D horizon (skybox) that rotates with camera yaw to provide parallax depth.
   - Atmospheric effects (rain, snow, embers) should fall at the 3D angle of perspective onto the board surface.
   - Chaos events should spawn localized 3D VFX at the target tile's exact coordinates $(x, y, z)$:
     - Meteor Strike: Descending fiery projectile down the Z-axis with ground shockwave.
     - Market Crash: Red holographic grid descending on affected district with downward arrows.
     - Economic Boom: Gold particle fountain rising from the center plaza.

### 2.5 QA & Test Suite Preservation
1. *Premise*: The existing codebase has 26 test files with 469 tests passing in Vitest's Node.js environment.
2. *Deduction*:
   - All 469 tests test pure, headless game reducers, ledger accounting, and server protocols.
   - The visual refactoring must NEVER store visual/camera states inside `GameState`.
   - As long as the public interface of `BoardView` and `TileComponent` remains clean and all camera/visual states live strictly within React component state and custom hooks, **zero test regressions will occur**.
   - New unit tests for 2.5D coordinate math (`spatialMath.test.ts`) can run directly in Vitest's `node` environment with 100% deterministic mathematical assertions.

---

## 3. Caveats
1. **CSS 3D vs WebGL**:
   - The project currently uses React + Tailwind CSS without Three.js. This survey leverages CSS 3D transforms (`perspective`, `transform-style: preserve-3d`).
   - CSS 3D performs exceptionally well across mobile and desktop without requiring a large 500KB+ Three.js bundle, but it requires strict discipline with CSS properties: any accidental `overflow: hidden`, `backdrop-filter`, or `opacity < 1` on an intermediate parent will flatten the 3D context.
2. **Mobile Touch Conflict**:
   - Board pan dragging on touchscreens must avoid conflicting with mobile browser page scrolling. The board viewport must apply `touch-action: none` while dragging, and camera controls should provide explicit `[+]` `[-]` buttons so users do not rely solely on pinch gestures.
3. **Subpixel Grid Gaps in Browser Engines**:
   - At certain zoom levels and screen DPRs (Device Pixel Ratio, e.g. 1.25x or 1.5x on Windows), CSS grids with 3D rotation can exhibit micro subpixel gaps between tiles. Using a solid dark under-slab with matching bevel styling prevents visible seam bleeding.

---

## 4. Conclusion & Architectural Blueprints

### 4.1 Recommended System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Presentation Root)                     │
│  - useCameraState() -> { cameraState, setPreset, zoom, pan, focus }   │
│  - WorldEnvironment (3D Horizon Parallax + 3D Particle Volume)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BoardView.tsx (3D Stage)                         │
│  - Viewport: perspective: 1200px                                      │
│  - Camera Stage: transform: translate(pan) rotateX(pitch) rotateZ(yaw) │
│  - BoardSlab: 6-faced volumetric board pedestal                       │
│  - CameraControls: Floating glassmorphic camera HUD                   │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│      TileComponent.tsx            │ │      CenterCityView.tsx          │
│ - Tactile 3D plate (translateZ)   │ │ - Sunken 3D plaza basin          │
│ - Elevated hover (translateZ 12px)│ │ - 3D dice rolling arena          │
│ - SpatialBillboard (price, rent)  │ │ - Active player 3D banner        │
│ - Spatial token pedestal          │ │ - World landmark hologram        │
└───────────────────┬───────────────┘ └──────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SpatialChaosVFX.tsx                               │
│ - Anchored at tile 3D coordinates (x, y, z)                            │
│ - Meteor descent down Z-axis / Market Crash red grid / Gold fountains  │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 File-by-File Implementation Plan

#### 1. New Math Engine: `src/components/board/spatialMath.ts`
* **Purpose**: Pure mathematical coordinate transformations, depth sorting, and inverse raycasting.
* **Exports**:
  - `getTile3DPosition(tileId: number, boardSizePx: number, slabHeightPx: number): { x: number; y: number; z: number }`
  - `project3DToScreen(pos: { x: number; y: number; z: number }, camera: CameraState, origin: { x: number; y: number }): { x: number; y: number; depth: number }`
  - `screenToTileId(screenX: number, screenY: number, boardRect: DOMRect, camera: CameraState): number | null`
  - `calculateDepthIndex(col: number, row: number, layerOffset: number): number`
  - `getBillboardTransform(camera: CameraState, elevationPx: number): string`

#### 2. New Camera System: `src/components/camera/useCameraState.ts` & `CameraControls.tsx`
* **`useCameraState.ts`**:
  - State: `{ preset, pitch, yaw, zoom, panX, panY, isDragging, focusedTileId }`.
  - Presets:
    - `TOP_DOWN`: `pitch: 0, yaw: 0, zoom: 1.0`
    - `ISOMETRIC`: `pitch: 50, yaw: -35, zoom: 1.0`
    - `CINEMATIC`: `pitch: 65, yaw: -20, zoom: 1.2`
    - `TACTICAL`: `pitch: 35, yaw: -45, zoom: 0.9`
  - Methods:
    - `setPreset(preset)`
    - `zoomIn()`, `zoomOut()`, `resetCamera()`
    - `focusTile(tileId, options)`: Lerps camera `panX, panY` to center on tile with bounding limits.
    - `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleWheel`
  - Accessibility: Detects `prefers-reduced-motion` and disables animation durations and auto-pan.
* **`CameraControls.tsx`**:
  - Floating minimal glassmorphism HUD bar docked to the board perimeter.
  - Buttons: `[2D]` `[Iso]` `[Cine]`, `[+]` `[-]`, `[🎯 Focus Player]`, `[↺ Reset]`.
  - Accessible ARIA labels and keyboard navigation.

#### 3. New Spatial Billboard Component: `src/components/board/SpatialBillboard.tsx`
* **Purpose**: Renders child elements that stand upright facing the camera in 3D perspective space.
* **Transform**:
  ```tsx
  transform: `translateZ(${elevation}px) rotateZ(${-camera.yaw}deg) rotateX(${-camera.pitch}deg)`
  ```
* **Use Cases**: Floating price tags, rent notifications, hover inspection cards, player nameplates.

#### 4. Refactored `TileComponent.tsx`
* **Tactile 3D Slab**:
  - Each tile is a 3D plate with physical thickness (`translateZ(4px)`).
  - Hover state: physically lifts upward `translateZ(12px)` with dynamic drop shadow.
  - Mortgaged state: sinks downward `translateZ(-6px)` with darker metallic texture.
* **Billboarding Overlays**:
  - Price tags and rent callouts use `SpatialBillboard` for crystal-clear readability.
  - Player tokens sit on the elevated plate surface (`translateZ(8px)`).

#### 5. Refactored `BoardView.tsx`
* Wraps the board inside an outer 3D stage with `perspective: 1200px`.
* Integrates `useCameraState` to apply dynamic camera transforms:
  ```tsx
  style={{
    transform: `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.zoom}) rotateX(${camera.pitch}deg) rotateZ(${camera.yaw}deg)`,
    transformStyle: 'preserve-3d',
  }}
  ```
* Includes extruded `BoardSlab` pedestal and docks the `CameraControls` HUD.

#### 6. Refactored `WorldEnvironment.tsx` & Spatial Chaos VFX
* **`WorldEnvironment.tsx`**:
  - Adds 3D parallax horizon skybox behind the tilted board that moves with camera yaw.
  - Rain/snow streaks and fireflies projected in true 3D perspective.
* **New `src/components/chaos/SpatialChaosVFX.tsx`**:
  - Visualizes calamities at target tile coordinates:
    - Meteor strike descending down Z-axis.
    - Market crash red laser grid.
    - Economic boom golden particle fountain.

#### 7. CSS Enhancements in `src/index.css`
* Add 3D helper utilities:
  ```css
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
  }
  ```
* Ensure `@media (prefers-reduced-motion: reduce)` resets transforms to flat and disables camera transitions.

---

## 5. Verification Method

### 5.1 Independent Vitest Test Suite Execution
Run the project's standard test suite to verify 100% preservation of pure game logic:
```bash
npm test
```
* **Success Condition**: All 26 test suites pass with 469/469 tests passing and zero regressions.
* **Invalidation Condition**: Any failure in `gameEngine.test.ts`, `ledgerEngine.test.ts`, `phase04_multiplayer.test.ts`, or `phase06_cosmetics_ui.test.ts`.

### 5.2 Mathematical & Component Unit Tests
Add and run new unit tests for 2.5D math:
```bash
npx vitest run src/components/board/__tests__/spatialMath.test.ts
```
* **Verifications**:
  1. `getTile3DPosition`: Confirms exact coordinates for all 40 tiles.
  2. `project3DToScreen` & `screenToTileId`: Confirms bidirectional round-trip mapping accuracy.
  3. `calculateDepthIndex`: Confirms South-facing foreground tiles strictly have higher depth indices than North-facing background tiles.
  4. Camera bounds clamping: Confirms zoom clamped to `[0.6, 1.6]`, pitch clamped to `[0, 70]`.

### 5.3 Playwright E2E & Visual Verification
Run browser-based validation:
1. Start dev server: `npm run dev`.
2. Inspect the board in Chromium:
   - Click camera preset buttons (`2D`, `2.5D Iso`, `Cinematic`). Verify smooth transition and correct camera angle.
   - Click tile #1, #3, #15, #39. Verify that clicking tilted 3D tiles opens the correct `PropertyDetailModal`.
   - Drag to pan the board. Scroll wheel to zoom. Click `[↺ Reset View]` to verify return to default center.
   - Turn on "Reduce motion" in OS/browser. Verify instant switching without motion sickness.
