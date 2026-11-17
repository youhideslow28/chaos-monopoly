# Genuine 2.5D Isometric Board Architecture Blueprint

**Author**: Isometric Board Architecture Explorer (`explorer_survey_board`)  
**Mission**: Survey the CHAOS MONOPOLY board rendering architecture and deliver a definitive technical plan for transforming the board into an authentic 2.5D isometric presentation.  
**Target Audience**: Orchestrator & Implementation Workers (Milestone 3: Isometric Board Projection & Grid Mathematics Engine).

---

## 1. Observation

Direct observations from inspecting the codebase:

### 1.1 Viewport Perspective and Board Transform
- In `src/index.css` (lines 34–46):
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
- **Observed**: The current "isometric view" is merely a forward tilt of 24 degrees and a 4 degree counter-clockwise roll with a 1400px perspective camera. It is oriented square-on to the user (facing North-South) rather than an isometric diamond, and perspective foreshortening introduces trapezoidal distortion.

### 1.2 Board Container and Slab Geometry
- In `src/components/board/BoardView.tsx` (lines 98–118):
  ```tsx
  <div className="w-full flex items-center justify-center p-1 sm:p-3 perspective-board overflow-visible">
    <div
      className={`w-full max-w-[860px] aspect-square p-1.5 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-[#0a0e17] border-2 border-slate-800 shadow-2xl transition-all duration-600 ${
        is3DView ? 'isometric-view' : 'flat-view'
      }`}
      style={{
        background: worldConfig?.pack.background.boardGradient || '#0a0e17',
        borderColor: worldConfig?.palette.border || '#1e293b',
        boxShadow: is3DView
          ? `0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px ${worldConfig?.palette.accent || 'rgba(6, 182, 212, 0.15)'}25`
          : '0 15px 30px -10px rgba(0, 0, 0, 0.8)',
      }}
      data-world-id={worldConfig?.id || state.config.worldId || 'modern-metropolis'}
    >
      <div
        className="w-full h-full grid grid-cols-11 grid-rows-11 gap-0.5 sm:gap-1"
        style={{
          gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(11, minmax(0, 1fr))',
        }}
      >
  ```
- **Observed**:
  1. The board slab is a single 2D `div` plane with rounded borders (`rounded-2xl`). It has zero physical thickness ($Z = 0$), no vertical side faces (extruded drop walls), no beveled chamfers, and no ground-plane depth.
  2. The perimeter track and center plaza share a flat 11x11 CSS grid.
  3. Every grid cell has identical dimensions (`repeat(11, minmax(0, 1fr))`), giving corners and edge tiles identical fractions ($1/11 \approx 9.09\%$).

### 1.3 Tile Surface & Token Hopping Animation
- In `src/components/board/TileComponent.tsx` (lines 145–169):
  Each tile is a flat `div` with `rounded-lg border select-none`. Highlight is applied via `ring-2 ring-cyan-400 scale-[1.03]`.
- In `src/index.css` (lines 83–99):
  ```css
  @keyframes tokenHop {
    0% { transform: translateY(0) scale(1); }
    40% {
      transform: translateY(-14px) scale(1.25);
      box-shadow: 0 14px 18px rgba(0, 0, 0, 0.5);
    }
    100% { transform: translateY(0) scale(1); }
  }
  ```
- **Observed**:
  Token hopping translates along the planar Y-axis (`translateY(-14px)`), which in 3D tilted space slides the token backwards across the surface rather than lifting vertically along the surface normal ($+Z$ axis) into spatial 3D.

### 1.4 Main Layout & Viewport Clipping Risk
- In `src/App.tsx` (lines 727–748):
  ```tsx
  <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 gap-4 max-w-7xl mx-auto w-full relative z-10">
    <div className="flex-1 w-full flex items-center justify-center overflow-x-hidden">
      <BoardView ... />
    </div>
    <aside className="w-full lg:w-80 shrink-0 h-auto lg:h-[600px] flex flex-col">
      <EventFeed logs={state.logs} />
    </aside>
  </main>
  ```
- **Observed**:
  When a square of width $W$ is rotated by $45^\circ$ into an isometric diamond, its bounding width expands by a factor of $\sqrt{2} \approx 1.414$. An $860\text{px}$ board expands to $1216\text{px}$ wide. Inside a flex container with `overflow-x-hidden` alongside a 320px sidebar on a standard 1080p display ($1920 \times 1080$, or laptop $1366 \times 768$ / $1440 \times 900$), the left and right diamond vertices will be clipped if not dynamically scaled.

### 1.5 Test Suite Status
- Command `npm test` executed:
  `26 passed (26 test files), 469 passed (469 tests)`.
  No tests currently assert on strict CSS transform strings of `BoardView`, ensuring that visual upgrades to transforms will not break existing gameplay logic or regressions.

---

## 2. Logic Chain

From these direct observations, we deduce the step-by-step technical requirements for the 2.5D visual transformation:

1. **Why Current Presentation is Semi-3D Rather than Genuine 2.5D**:
   - Genuine 2.5D isometric presentation in gaming requires two core principles:
     a) **Axonometric Diamond Orientation**: The coordinate axes are projected such that the two ground axes ($X, Y$) project at equal angles ($\pm 30^\circ$ for true isometric, or $\pm 26.565^\circ$ for classic 2:1 dimetric) relative to the horizontal, with the $Z$ axis (height) pointing strictly upward.
     b) **Volumetric Solid Slab**: A physical tabletop board has tangible depth thickness (front-left and front-right vertical sidewalls) that catches light and casts a soft ground shadow.
   - The current setup violates both: `rotateX(24deg) rotateZ(-4deg)` produces a slightly tilted square table viewed through a 1400px perspective frustum, causing perspective warping instead of parallel isometric projection, and the slab is a single 0-thickness flat layer.

2. **Mathematical Choice of Projection**:
   - **Classic 2:1 Dimetric Projection** (`rotateX(60deg) rotateZ(45deg)` or affine ratio 2:1):
     - Compresses vertical distances by exactly $\cos(60^\circ) = 0.5$.
     - One step in $X$ or $Y$ moves screen coordinates by $(\Delta x \pm \Delta y, (\Delta x \mp \Delta y) / 2)$.
     - Extremely clean for game UI, pixel alignment, and tile clarity.
   - **True Isometric Projection** (`rotateX(54.736deg) rotateZ(45deg)`):
     - Compresses vertical distances by $1/\sqrt{3} \approx 0.577$. All three axes are foreshortened identically.
   - **Recommendation**:
     Support a default calibrated viewing angle of `rotateX(55deg) rotateZ(45deg)` with `perspective: none` (or high orthographic-emulation `3000px`), accompanied by a dedicated interactive camera state allowing user tilt ($\theta \in [30^\circ, 70^\circ]$), yaw rotation ($\phi \in [0^\circ, 360^\circ]$ or $45^\circ$ quadrant snapping), zoom ($0.6\times$ to $1.8\times$), and pan.

3. **Volumetric Extrusion Architecture**:
   - To make the board feel like a luxurious, tactile physical slab:
     - Board slab depth: $H_{slab} = 28\text{px}$ ($1.75\text{rem}$) on desktop, $20\text{px}$ on mobile.
     - Extrude 4 vertical sidewalls using CSS 3D (`transform-style: preserve-3d`):
       - Front-Left Wall (South-West): shaded darker with ambient occlusion (`#060911`).
       - Front-Right Wall (South-East): illuminated with directional rim lighting (`#141d2e`).
       - Back Walls (North-West & North-East): rendered for $360^\circ$ camera orbit.
     - Top rim: 2px illuminated beveled chamfer inheriting world accent color.
     - Center Metropolis Plaza: recessed by $Z = -6\text{px}$ with beveled inner basin walls.
     - Ground shadow: multi-layered elliptical ambient shadow positioned $40\text{px}$ beneath the slab.

4. **Tile Geometry & Grid Mathematics**:
   - Transitioning from `repeat(11, 1fr)` to proportional corner scaling:
     `grid-template-columns: 1.35fr repeat(9, 1fr) 1.35fr;`
     `grid-template-rows: 1.35fr repeat(9, 1fr) 1.35fr;`
   - Gives corners the classic Monopoly prominence ($1.35\times$ width of regular tiles).
   - Each tile receives an elevated top plate ($Z = +2\text{px}$), an active lift state ($Z = +10\text{px}$ with glowing under-tile projection), and mortgaged recessed state ($Z = -2\text{px}$).

5. **Responsive Viewport Containment**:
   - Because rotating $45^\circ$ increases width by $\sqrt{2} \approx 1.414$, the base board width must be scaled to fit within the available flex container:
     $$W_{board} = \min\left(W_{base}, \frac{W_{container}}{\sqrt{2} \cdot 1.08}\right)$$
   - Responsive base widths:
     - Ultrawide (>= 1920px): $640\text{px}$ (diamond width $\approx 905\text{px}$)
     - Desktop (1280px - 1919px): $560\text{px}$ (diamond width $\approx 792\text{px}$)
     - Laptop (1024px - 1279px): $480\text{px}$ (diamond width $\approx 678\text{px}$)
     - Tablet (768px - 1023px): $420\text{px}$ (diamond width $\approx 594\text{px}$)
     - Mobile (< 768px): $\text{clamp}(280\text{px}, 62\text{vw}, 360\text{px})$ (diamond width $\approx 395\text{px} - 509\text{px}$)

---

## 3. Caveats

1. **Browser CSS 3D Sub-Pixel Jitter**:
   On certain older GPU drivers or Firefox versions, rotating DOM elements with `preserve-3d` at high zoom levels can exhibit sub-pixel border gaps between grid cells. Mitigated by setting `backface-visibility: hidden; transform: translate3d(0,0,0);` and adding a 0.5px subtle overlap on tile borders.
2. **Text Readability in Diamond Orientation**:
   When the board is rotated $45^\circ$, text oriented parallel to the tile track is rotated at $\pm 45^\circ$ on screen. For primary gameplay information (property price, tile name, player badges), text should either be counter-rotated (billboarded) or typeset with bold high-contrast fonts (`text-slate-100`, `font-extrabold`) to guarantee readability at a glance.
3. **No Code Modification During Phase 0**:
   As a read-only Explorer, no source code in `src/` has been modified during this survey. Complete implementation blueprints and code structures are provided below for downstream implementation workers.

---

## 4. Conclusion & Architectural Blueprints

### 4.1 System Architectural Blueprint Overview

```
                                [ Viewport Container ]
                      (Responsive width, overflow-visible, aspect-ratio)
                                        │
                                        ▼
                           [ Isometric Stage & Camera ]
                (CSS 3D preserve-3d, tilt: 55°, yaw: 45°, zoom: 1.0, pan: 0, 0)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     [ Ground Shadow Quad ]                                [ 3D Volumetric Slab ]
 (Z = -H_slab, blur: 40px)                               (preserve-3d, depth: 32px)
                                                                   │
                                  ┌────────────────────────────────┼────────────────────────────────┐
                                  ▼                                ▼                                ▼
                          [ Top Face (Z = 0) ]            [ Front-Left Wall ]             [ Front-Right Wall ]
                       (Chamfered LED Accent Rim)          (rotateX: -90deg,               (rotateY: 90deg,
                                  │                        ambient occlusion)               specular keylight)
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
    [ 40 Perimeter Tiles ]                 [ Recessed Metropolis Plaza ]
(Corner-scaled grid: 1.35fr : 1fr)              (Z = -6px sunken basin)
 - Base tile plate                               - Animated Dice Stage
 - Property district band                        - Active Player Ribbon
 - Z-axis token hop (Z = +28px)                  - World City Skyline
 - Active tile lift (Z = +10px)                  - Chaos Modifiers Banner
```

---

### 4.2 File-by-File Technical Recommendations

#### Component 1: `src/components/board/isometricCoordinates.ts` (NEW MODULE)
A pure TypeScript mathematics engine for board geometry, tile spatial coordinates, diamond projections, and token interpolation.

```ts
/**
 * Mathematical engine for 2.5D Isometric Board coordinates and projections.
 */

export interface Vector3D {
  x: number; // Board space X (-0.5 to +0.5)
  y: number; // Board space Y (-0.5 to +0.5)
  z: number; // Elevation in px above board slab
}

export interface ScreenCoord {
  x: number;
  y: number;
  depth: number; // For z-sorting
}

export interface CameraState {
  tilt: number; // Pitch in degrees (e.g. 55)
  yaw: number;  // Yaw rotation in degrees (e.g. 45 for diamond)
  zoom: number; // Scale factor (0.7 to 1.5)
  panX: number; // Pan offset in px
  panY: number;
}

export const DEFAULT_CAMERA: CameraState = {
  tilt: 55,
  yaw: 45,
  zoom: 1.0,
  panX: 0,
  panY: 0,
};

/**
 * Returns normalized board center-relative (x, y) coordinates for any tile 0..39.
 * Col/Row indices are 1-based (1..11).
 */
export function getTileBoardCoords(tileId: number): { x: number; y: number } {
  const GRID_COORDS: Record<number, [number, number]> = {
    // Bottom edge (Tile 0..10: col 11->1, row 11)
    0: [11, 11], 1: [10, 11], 2: [9, 11], 3: [8, 11], 4: [7, 11],
    5: [6, 11], 6: [5, 11], 7: [4, 11], 8: [3, 11], 9: [2, 11], 10: [1, 11],
    // Left edge (Tile 11..20: col 1, row 10->1)
    11: [1, 10], 12: [1, 9], 13: [1, 8], 14: [1, 7], 15: [1, 6],
    16: [1, 5], 17: [1, 4], 18: [1, 3], 19: [1, 2], 20: [1, 1],
    // Top edge (Tile 21..30: col 2->11, row 1)
    21: [2, 1], 22: [3, 1], 23: [4, 1], 24: [5, 1], 25: [6, 1],
    26: [7, 1], 27: [8, 1], 28: [9, 1], 29: [10, 1], 30: [11, 1],
    // Right edge (Tile 31..39: col 11, row 2->10)
    31: [11, 2], 32: [11, 3], 33: [11, 4], 34: [11, 5], 35: [11, 6],
    36: [11, 7], 37: [11, 8], 38: [11, 9], 39: [11, 10],
  };

  const [col, row] = GRID_COORDS[tileId] || [11, 11];
  // Convert col/row (1..11) to normalized coordinates [-0.5, +0.5]
  return {
    x: (col - 6) / 10,
    y: (row - 6) / 10,
  };
}

/**
 * Projects a 3D board point to 2D screen coordinates under camera transform.
 */
export function projectToScreen(
  point: Vector3D,
  boardSizePx: number,
  camera: CameraState = DEFAULT_CAMERA
): ScreenCoord {
  const radYaw = (camera.yaw * Math.PI) / 180;
  const radTilt = (camera.tilt * Math.PI) / 180;

  const bx = point.x * boardSizePx;
  const by = point.y * boardSizePx;
  const bz = point.z;

  // Yaw rotation around Z axis
  const rotX = bx * Math.cos(radYaw) - by * Math.sin(radYaw);
  const rotY = bx * Math.sin(radYaw) + by * Math.cos(radYaw);

  // Tilt pitch around X axis
  const screenX = rotX * camera.zoom + camera.panX;
  const screenY = (rotY * Math.cos(radTilt) - bz * Math.sin(radTilt)) * camera.zoom + camera.panY;
  const depth = rotY * Math.sin(radTilt) + bz * Math.cos(radTilt);

  return { x: screenX, y: screenY, depth };
}

/**
 * Calculates optimal board pixel size given container width and height to prevent clipping.
 */
export function calculateFitBoardSize(
  containerWidth: number,
  containerHeight: number,
  camera: CameraState = DEFAULT_CAMERA
): number {
  const radTilt = (camera.tilt * Math.PI) / 180;
  // Bounding width when rotated 45 degrees is sqrt(2) * W
  const diamondWidthRatio = Math.SQRT2;
  // Bounding height is sqrt(2) * W * cos(tilt)
  const diamondHeightRatio = Math.SQRT2 * Math.cos(radTilt);

  const maxW = (containerWidth * 0.92) / (diamondWidthRatio * camera.zoom);
  const maxH = (containerHeight * 0.88) / (diamondHeightRatio * camera.zoom);

  return Math.max(260, Math.min(680, Math.min(maxW, maxH)));
}
```

---

#### Component 2: `src/components/board/BoardSlab.tsx` (NEW COMPONENT)
Renders the physical 6-face 3D volumetric cuboid slab with chamfered rim, recessed center basin, and realistic ground contact shadow.

```tsx
import React from 'react';
import { WorldConfig } from '../../worlds/types';

interface BoardSlabProps {
  boardSize: number;
  slabThickness?: number;
  worldConfig?: WorldConfig | null;
  children: React.ReactNode;
}

export const BoardSlab: React.FC<BoardSlabProps> = ({
  boardSize,
  slabThickness = 28,
  worldConfig,
  children,
}) => {
  const accentColor = worldConfig?.palette.accent || '#06b6d4';
  const borderColor = worldConfig?.palette.border || '#1e293b';
  const boardBg = worldConfig?.pack.background.boardGradient || '#0a0e17';

  return (
    <div
      className="relative select-none"
      style={{
        width: `${boardSize}px`,
        height: `${boardSize}px`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 1. Ground Contact Shadow (Soft volumetric ambient occlusion on table) */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          transform: `translateZ(-${slabThickness + 14}px) scale(1.08)`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 80%)',
          filter: 'blur(16px)',
        }}
      />

      {/* 2. South-West Front Extruded Wall (Darker ambient face) */}
      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          height: `${slabThickness}px`,
          transformOrigin: 'bottom center',
          transform: `rotateX(-90deg) translateZ(0px)`,
          background: `linear-gradient(180deg, ${borderColor} 0%, #060911 100%)`,
          borderBottom: `2px solid ${accentColor}40`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      />

      {/* 3. South-East Front Extruded Wall (Light-receiving face) */}
      <div
        className="absolute top-0 bottom-0 right-0 pointer-events-none"
        style={{
          width: `${slabThickness}px`,
          transformOrigin: 'center right',
          transform: `rotateY(90deg) translateZ(0px)`,
          background: `linear-gradient(90deg, ${borderColor} 0%, #141d2e 100%)`,
          borderBottom: `2px solid ${accentColor}60`,
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.15)',
        }}
      />

      {/* 4. North-West Back Extruded Wall (Visible during camera orbit) */}
      <div
        className="absolute top-0 bottom-0 left-0 pointer-events-none"
        style={{
          width: `${slabThickness}px`,
          transformOrigin: 'center left',
          transform: `rotateY(-90deg) translateZ(0px)`,
          background: '#04070d',
        }}
      />

      {/* 5. North-East Back Extruded Wall */}
      <div
        className="absolute left-0 right-0 top-0 pointer-events-none"
        style={{
          height: `${slabThickness}px`,
          transformOrigin: 'top center',
          transform: `rotateX(90deg) translateZ(0px)`,
          background: '#04070d',
        }}
      />

      {/* 6. Top Surface Plane (Hosts tiles and center plaza) */}
      <div
        className="w-full h-full relative rounded-2xl p-1.5 sm:p-2 border-2"
        style={{
          background: boardBg,
          borderColor: borderColor,
          boxShadow: `inset 0 0 0 1px ${accentColor}33, 0 0 25px ${accentColor}18`,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

---

#### Component 3: `src/components/board/BoardView.tsx` (REFACTORING SPECIFICATION)
1. Import `BoardSlab`, `DEFAULT_CAMERA`, and `calculateFitBoardSize`.
2. Introduce container measurement (`ResizeObserver` or CSS container queries) to dynamically clamp `boardSize` so the $45^\circ$ diamond never overflows horizontally or vertically.
3. Replace `.isometric-view` inline transform with:
   ```tsx
   style={{
     transform: is3DView
       ? `rotateX(${camera.tilt}deg) rotateZ(${camera.yaw}deg) scale(${camera.zoom}) translate3d(${camera.panX}px, ${camera.panY}px, 0)`
       : 'rotateX(0deg) rotateZ(0deg) scale(1)',
     transformStyle: 'preserve-3d',
     transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
   }}
   ```
4. Update the 11x11 perimeter grid template:
   ```tsx
   gridTemplateColumns: '1.35fr repeat(9, 1fr) 1.35fr',
   gridTemplateRows: '1.35fr repeat(9, 1fr) 1.35fr',
   ```
5. Pass `is3DView` and depth context to child tiles and center city plaza.

---

#### Component 4: `src/components/board/TileComponent.tsx` (ELEVATION & TACTILE SURFACE)
1. Add tactile plate depth:
   - When tile is hovered: `transform: translateZ(8px)` with soft drop shadow underneath.
   - When tile is highlighted/active player: `transform: translateZ(12px) scale(1.02)` with pulsating ring.
   - When mortgaged: `transform: translateZ(-2px)` recessed into the slab with hazard overlay.
2. Z-Axis Token Elevation:
   - Tokens positioned on tiles receive `transform: translateZ(10px)` base elevation.
   - In 2.5D view, sequential hop interval animates along normal axis:
     `@keyframes tokenHop3D { 0%, 100% { transform: translateZ(10px); } 40% { transform: translateZ(32px) scale(1.2); } }`
   - Token cast shadow on tile surface expands when $Z$ increases, producing realistic spatial hopping!

---

#### Component 5: `src/components/board/CenterCityView.tsx` (SUNKEN PLAZA BASIN)
1. Encase the center city stage in a recessed bevel:
   ```css
   box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(6, 182, 212, 0.2);
   transform: translateZ(-4px);
   ```
2. Center city skyline, dice arena, and active player card achieve natural visual hierarchy below the elevated perimeter track.

---

#### Component 6: `src/index.css` (CSS TRANSFORM HARDENING)
Replace lines 34–55 with genuine 2.5D isometric rules:
```css
/* Authentic 2.5D Isometric Board Viewport */
.perspective-board {
  perspective: 3200px; /* High orthographic-emulation perspective */
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
}

/* Genuine 2.5D Isometric Diamond View */
.isometric-view {
  transform: rotateX(55deg) rotateZ(45deg);
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
}

/* 2D Flat View */
.flat-view {
  transform: rotateX(0deg) rotateZ(0deg);
  transform-style: flat;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
}

/* 3D Vertical Token Hop along Surface Normal (+Z) */
@keyframes tokenHop3D {
  0% {
    transform: translateZ(6px) scale(1);
  }
  40% {
    transform: translateZ(28px) scale(1.22);
    filter: drop-shadow(0 20px 14px rgba(0, 0, 0, 0.7));
  }
  100% {
    transform: translateZ(6px) scale(1);
  }
}

.animate-token-hop-3d {
  animation: tokenHop3D 0.13s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 5. Verification Method

### 5.1 Test Suite Validation
Execute the project's canonical test suite:
```bash
npm test
```
**Expected Outcome**: All 26 test suites and 469 tests pass with 0 failures, confirming zero regressions in gameplay FSM, trade, auctions, multiplayer protocols, or cosmetic stores.

### 5.2 Build Integrity Validation
Execute production build check:
```bash
npm run build
```
**Expected Outcome**: TypeScript compiler (`tsc`) passes with zero errors, Vite builds all chunks cleanly.

### 5.3 Geometric & Responsive Visual Inspection
Verify in browser across multiple viewport resolutions:
1. **Ultrawide & 1080p Desktop ($1920 \times 1080$)**:
   - Board presents as a clean diamond rotated $45^\circ$, tilted $55^\circ$.
   - Left vertex (Tile 10) and right vertex (Tile 30) have at least 24px clearance from the viewport/sidebar edges; zero horizontal clipping.
   - Front-left and front-right vertical slab sidewalls are clearly visible with physical depth ($28\text{px}$).
2. **Mobile ($375 \times 667$ / $390 \times 844$)**:
   - Board scales dynamically to fit within screen width; diamond edges remain entirely within viewport bounds.
   - Toggle to 2D view (`is3DView: false`) smoothly animates board back to flat top-down mode.
3. **Token Movement**:
   - Rolling dice causes token to hop vertically along $+Z$ axis with expanding drop shadow, landing sharply on destination tile.
4. **Prefers-Reduced-Motion**:
   - Enabling reduced motion disables all 3D transitions and falls back cleanly without graphical glitches.
