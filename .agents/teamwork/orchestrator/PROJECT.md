# Project: CHAOS MONOPOLY — 2.5D Visual Architecture Overhaul
# Scope: Full 10-Stage Visual & Spatial Overhaul

## Architecture & System Blueprint
CHAOS MONOPOLY is receiving a comprehensive 2.5D visual architecture overhaul, transforming the presentation from a pseudo-3D tilted surface into a genuine 2.5D axonometric isometric tabletop with volumetric 3D objects and spatial game UI, while strictly preserving 100% of headless game logic, rules, multiplayer protocols, and existing test suites (469 passing tests).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Presentation Root)                     │
│  - useCameraState() -> { cameraState, setPreset, zoom, pan, focus }   │
│  - WorldEnvironment (3D Horizon Parallax + 3D Perspective Weather)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BoardView.tsx (3D Stage)                         │
│  - Viewport: perspective: 3200px (Orthographic Emulation)              │
│  - Camera Stage: transform: translate(pan) rotateX(pitch) rotateZ(yaw) │
│  - BoardSlab: 6-faced volumetric 3D board pedestal (28px sidewalls)    │
│  - CameraControls: Floating glassmorphic HUD bar                       │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│      TileComponent.tsx            │ │      CenterCityView.tsx          │
│ - Tactile 3D plate (translateZ)   │ │ - Recessed 3D plaza basin (-6px) │
│ - Elevated hover (translateZ 12px)│ │ - 3D dice rolling arena          │
│ - SpatialBillboard (price, rent)  │ │ - VolumetricDice3D (6-face cube) │
│ - VolumetricBuilding (Tiers 1..5) │ │ - Active player 3D banner        │
│ - VolumetricPlayerToken (pedestal)│ │ - World landmark skyline         │
└───────────────────┬───────────────┘ └──────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SpatialChaosVFX.tsx                               │
│ - Anchored at tile 3D coordinates (x, y, z)                            │
│ - Meteor descent down Z-axis / Market Crash red grid / Gold fountains  │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Spatial Mathematics Engine | 3D coordinate mapping, screen projection, depth sorting, fit scaling, raycasting | M1 | Survey consensus |
| 2 | Volumetric Board Slab | 6-faced cuboid pedestal, 28px extruded sidewalls, ground contact shadow, LED rim | M1 | Survey consensus |
| 3 | Calibrated Isometric Stage | 2:1 dimetric / isometric projection (`rotateX(55deg) rotateZ(45deg)`, 3200px perspec) | M1 | Survey consensus |
| 4 | Proportional Corner Scaling | Authentic 1.35fr corner scaling (`1.35fr repeat(9, 1fr) 1.35fr`) | M1 | Survey consensus |
| 5 | Tactile 3D Board Tiles | Elevated plate geometry ($Z = 4\text{px}$), hover lift ($Z = 12\text{px}$), mortgaged sinking | M1 | Survey consensus |
| 6 | Spatial Billboards | Camera-facing unwarped floating typography for prices, rents, and tooltips | M1 | Survey consensus |
| 7 | Recessed Plaza Basin | Sunken center city arena ($Z = -6\text{px}$) with beveled inner basin walls | M1 | Survey consensus |
| 8 | Multi-Player Token Stacking Engine | Pure math algorithm for collision-free delta/diamond layout for 1..4 players | M2 | Survey consensus |
| 9 | Volumetric Player Tokens | 3D cylinder pedestals, beveled side rims, ground shadows, pet satellites, active auras | M2 | Survey consensus |
| 10 | Volumetric Buildings (Tiers 1..5) | 3D miniature shophouses, duplexes, apartments, high-rises, and super landmarks | M2 | Survey consensus |
| 11 | World-Themed Architecture | Theme-specific materials (Metropolis glass, Cyberpunk neon, Mekong wood, Space titanium)| M2 | Survey consensus |
| 12 | Volumetric 3D Cube Dice | 6-faced CSS 3D cube dice, opposite-face 7 sum, 3D tumbling, landing bounce, cosmetic skins| M2 | Survey consensus |
| 13 | Interactive Camera System | `useCameraState` hook with 4 presets (2D, 2.5D Iso, Cinematic, Tactical), pan, zoom | M3 | Survey consensus |
| 14 | Camera Controls HUD | Floating glassmorphism HUD bar, auto-focus on active player / chaos tile, reset view | M3 | Survey consensus |
| 15 | Accessibility & Reduced Motion | Seamless compliance with `prefers-reduced-motion` disabling camera lerp and tumbles | M3 | Survey consensus |
| 16 | 3D Horizon Parallax Skybox | World-specific horizon backdrop in `WorldEnvironment` rotating with camera yaw | M3 | Survey consensus |
| 17 | Perspective Weather VFX | True 3D angle precipitation (rain, snow, fireflies) falling onto board surface | M3 | Survey consensus |
| 18 | Localized Spatial Chaos VFX | Tile-anchored 3D effects: meteor descent down Z-axis, market crash grid, gold fountains | M3 | Survey consensus |
| 19 | Dual-Track Verification Suite | New unit tests for spatial math, token stacking, building generation, and dice | M4 | Survey consensus |
| 20 | Full Regression Test Pass | 100% preservation of all 26 existing test suites (469 tests) with 0 regressions | M4 | Survey consensus |
| 21 | Performance & Bundle Optimization | Subpixel gap mitigation, GPU acceleration, clean production build (`tsc && vite build`) | M4 | Survey consensus |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Math Engine & Volumetric Board Foundation | Stages 1, 2, 3: `spatialMath.ts`, `BoardSlab.tsx`, `BoardView.tsx`, `TileComponent.tsx`, `SpatialBillboard.tsx`, `index.css` | none | DONE |
| 2 | Volumetric Entities & 3D Game Objects | Stages 4, 5, 6: `tokenStackingEngine.ts`, `VolumetricPlayerToken.tsx`, `VolumetricBuilding.tsx`, `VolumetricDice3D.tsx`, `CenterCityView.tsx` | M1 | DONE |
| 3 | Camera System, Spatial Chaos & Environmental VFX | Stages 7, 8: `useCameraState.ts`, `CameraControls.tsx`, `SpatialChaosVFX.tsx`, `WorldEnvironment.tsx`, `HeaderBar.tsx` | M1, M2 | DONE |
| 4 | Verification, Hardening & Release Gate | Stages 9, 10: Full regression test pass (741+ tests), production build (`npm run build`), Forensic Integrity Audit | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts

### 1. `spatialMath.ts` ↔ Board & Camera Components
- `Vector3D`: `{ x: number; y: number; z: number }`
- `ScreenCoord`: `{ x: number; y: number; depth: number }`
- `CameraState`: `{ preset: string; pitch: number; yaw: number; zoom: number; panX: number; panY: number; isDragging: boolean; focusedTileId?: number | null }`
- `getTile3DPosition(tileId: number, boardSizePx: number, slabHeightPx: number): Vector3D`
- `calculateDepthIndex(col: number, row: number, layerOffset: number): number`
- `getBillboardTransform(camera: CameraState, elevationPx: number): string`
- `calculateFitBoardSize(containerWidth: number, containerHeight: number, camera: CameraState): number`

### 2. `tokenStackingEngine.ts` ↔ `VolumetricPlayerToken.tsx`
- `TokenPlacement`: `{ xPercent: number; yPercent: number; elevationZ: number; scale: number; depthIndex: number; isForefront: boolean }`
- `computeTokenPlacements(playersHere: PlayerState[], activePlayerId?: string, isIsometric?: boolean): Record<string, TokenPlacement>`

### 3. `VolumetricBuilding.tsx` ↔ `TileComponent.tsx`
- Props: `{ level: number; districtColor: string; districtHex?: string; worldId: string; isMortgaged?: boolean; tileType: string }`

### 4. `VolumetricDice3D.tsx` ↔ `CenterCityView.tsx` / `DiceControls.tsx`
- Props: `{ dice: [number, number]; isRolling: boolean; isDouble: boolean; diceSkinId?: string; onRollComplete?: () => void }`

### 5. `useCameraState.ts` ↔ `CameraControls.tsx` & `BoardView.tsx`
- Presets: `TOP_DOWN` (0° pitch, 0° yaw), `ISOMETRIC` (55° pitch, 45° yaw), `CINEMATIC` (65° pitch, 20° yaw), `TACTICAL` (35° pitch, 45° yaw)
- Methods: `setPreset`, `zoomIn`, `zoomOut`, `pan`, `focusTile`, `resetCamera`

## Code Layout
- `src/components/board/spatialMath.ts` (NEW: Mathematical projection & coordinate engine)
- `src/components/board/BoardSlab.tsx` (NEW: 6-faced volumetric 3D board pedestal)
- `src/components/board/SpatialBillboard.tsx` (NEW: Unwarped camera-facing 3D text/tag container)
- `src/components/board/tokenStackingEngine.ts` (NEW: Multi-token dynamic stacking & collision avoidance)
- `src/components/board/VolumetricPlayerToken.tsx` (NEW: 3D prismatic cylinder token pedestal)
- `src/components/board/VolumetricBuilding.tsx` (NEW: Tier 1..5 volumetric buildings & landmarks)
- `src/components/camera/useCameraState.ts` (NEW: Camera state, presets, and interaction hook)
- `src/components/camera/CameraControls.tsx` (NEW: Floating glassmorphic camera HUD bar)
- `src/components/chaos/SpatialChaosVFX.tsx` (NEW: Tile-anchored 3D VFX for calamity cards)
- `src/components/dice/VolumetricDice3D.tsx` (NEW: 6-face CSS 3D cube dice with tumble physics)
- `src/components/board/BoardView.tsx` (MODIFIED: Integrates slab, camera stage, and fit sizing)
- `src/components/board/TileComponent.tsx` (MODIFIED: Integrates tactile plate, buildings, and tokens)
- `src/components/board/CenterCityView.tsx` (MODIFIED: Recessed basin & 3D dice integration)
- `src/components/worlds/WorldEnvironment.tsx` (MODIFIED: 3D parallax horizon & perspective weather)
- `src/components/common/HeaderBar.tsx` (MODIFIED: Enhanced 2.5D camera toggle button)
- `src/index.css` (MODIFIED: 2.5D isometric viewport, 3D token hopping, backface culling)
- `src/game/__tests__/spatial_and_volumetric.test.ts` (NEW: Automated unit tests for 2.5D math & geometry)
