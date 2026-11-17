# Technical Blueprint: Volumetric Objects & 3D Geometry Survey

**Surveyor**: Volumetric Objects & 3D Geometry Explorer (`explorer_survey_volumetric`)  
**Mission**: Investigate current game object rendering across CHAOS MONOPOLY and author a definitive technical blueprint for true volumetric 3D player tokens, dynamic multi-token stacking, realistic Tier 1..5 buildings/landmarks, and animated 3D cube dice, fully compatible with cosmetics and world themes.  
**Date**: 2026-10-31T16:34:00Z  

---

## 1. Observation

### 1.1 Existing Game Object Rendering in Codebase

#### A. Player Tokens & Occupancy
- **File**: `src/components/board/TileComponent.tsx` (Lines 236–276)
  - Current implementation renders player tokens as flat, 2D circular `div`s with `rounded-full` flex-wrapped at the bottom of each tile:
    ```tsx
    {/* Occupying Player Tokens (Avoid overlapping, active player pulses) */}
    {playersHere.length > 0 && (
      <div className="absolute inset-x-0.5 bottom-0.5 flex items-center justify-center gap-0.5 z-20 flex-wrap pointer-events-none">
        {playersHere.map((player) => {
          const isPlayerActive = player.id === activePlayerId;
          const petId = !player.isAI ? equippedPetId : null;
          const pet = petId ? getCosmeticItem(petId) : null;

          return (
            <div key={player.id} className="flex items-center -space-x-1">
              <div
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-lg transition-transform ${
                  isPlayerActive
                    ? 'ring-2 ring-white scale-110 z-30 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse'
                    : 'ring-1 ring-black/60 z-20 opacity-90'
                }`}
                style={{ backgroundColor: player.token.colorHex }}
                title={`${player.name} (${player.token.name})`}
              >
                <span>{player.token.symbol}</span>
              </div>
    ```
  - **Limitations**:
    1. Flat 2D elements: When the board is tilted in isometric view (`.isometric-view` in `src/index.css`: `rotateX(24deg) rotateZ(-4deg)`), tokens lie flat coplanar with the tile without physical elevation, edge bevels, or ground contact drop shadows.
    2. Zero volumetric geometry: Tokens lack side facets, bevels, depth extrusion, or 3D meeple/vehicle meshes.
    3. Collision & Clipping: When 2, 3, or 4 players occupy the exact same tile (e.g. Tile 0 START at match launch, or Tile 10 JAIL), flex wrapping (`flex-wrap gap-0.5`) on small tiles (44px min-width) causes tokens and companion pets to overflow tile boundaries or occlude tile names and price readouts.

#### B. Property Upgrades & Buildings
- **File**: `src/components/board/TileComponent.tsx` (Lines 128–142, 172–179)
  - Current implementation renders upgrades strictly as text emojis inside the 6px–8px property district color band at the top of the tile:
    ```tsx
    const renderUpgradeBadge = (level: number) => {
      if (level <= 0) return null;
      if (level === 5) {
        return (
          <span className="text-[9px] sm:text-[10px] leading-none" title="Siêu Landmark Cấp 5">
            🏙️
          </span>
        );
      }
      return (
        <span className="text-[8px] sm:text-[9px] leading-none text-amber-300" title={`Cấp ${level}`}>
          {'⭐'.repeat(level)}
        </span>
      );
    };
    ```
  - **Limitations**:
    1. Zero 3D structure: There are no houses, apartments, skyscrapers, or landmarks standing on the board.
    2. Visual representation is limited to `⭐` characters and one emoji `🏙️` crammed into the district band.
    3. Does not differentiate between world themes (e.g. Cyberpunk Arcology vs. Mekong Riverside Villa vs. Space Orbital Colony).

#### C. Dice Rendering & Rolling Animation
- **File**: `src/components/dice/AnimatedDice.tsx` (Lines 10–175)
  - Current implementation renders two flat 2D squares with rounded corners (`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2`) and dot patterns:
    ```tsx
    <div
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 transform ${skin.diceBox} ${
        isRolling ? 'animate-dice-shake scale-105 rotate-6' : 'hover:scale-105'
      } ${
        isDouble && !isRolling
          ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
          : ''
      }`}
    >
      {renderDots(displayValues[0])}
    </div>
    ```
  - Rolling animation is a 2D CSS screen-shake (`animate-dice-shake`) with `setInterval` random number scrambling every 70ms.
  - **Limitations**:
    1. Not a 3D cube: It only has a single visible face at any time; there are no side faces, 3D rotations, perspective tumble, or realistic physical bounce.
    2. Lack of physical settlement: When stopping, numbers simply switch abruptly to the final values without a deceleration tumble or landing impact bounce.

#### D. Technology Stack & Dependencies
- **File**: `package.json`
  - Runtime dependencies: `react` (18.3.1), `lucide-react` (1.16.0), `tailwindcss` (3.4.17), `clsx`, `tailwind-merge`, `canvas-confetti`.
  - Noticeably, there is **NO Three.js** or heavy WebGL framework in `package.json`.
  - In `src/index.css` (Lines 34–55), the 3D perspective is achieved natively via CSS 3D:
    ```css
    .perspective-board {
      perspective: 1400px;
      perspective-origin: 50% 60%;
    }
    .isometric-view {
      transform: rotateX(24deg) rotateZ(-4deg);
      transform-style: preserve-3d;
    }
    ```
  - Pure CSS 3D (`transform-style: preserve-3d`, `translate3d`, `rotateX/Y/Z`) offers 60 FPS hardware-accelerated performance across mobile and desktop without bundle bloat or Canvas context overhead.

#### E. Test Suite Status
- Command `npm test` runs 26 test files with 469 tests passing with zero failures.
- Tests verify: `gameEngine`, `ledgerEngine`, `chaosEngine`, `phase03_ai_and_chaos`, `phase04_multiplayer`, `phase05_worlds`, `phase06_cosmetics_ui`, `phase07_security_audit`, and adversarial stress tests.
- Visual component overhauls must preserve all game logic, action triggers, and existing component prop contracts.

---

## 2. Logic Chain

### 2.1 Why CSS 3D Volumetric Prisms & Meshes are the Optimal Architecture
1. **Observation**: The board uses `perspective: 1400px` and `.isometric-view` with `transform-style: preserve-3d` in `src/index.css`.
2. **Inference**: Any child element configured with `transform-style: preserve-3d` lives in true 3D spatial coordinate space $(X, Y, Z)$ relative to the board plane.
3. **Design Choice**: Rather than introducing a heavy WebGL canvas overlay that complicates click hit-testing, tooltips, DOM accessibility, and bundle size, we can implement true 3D volumetric primitives (prismatic token pedestals, 3D miniature buildings, and 6-face 3D dice cubes) using pure CSS 3D transforms (`translateZ`, `rotateX`, `rotateY`, `scale3d`).

---

### 2.2 Volumetric Player Tokens Architecture

```
                 [ Active Floating Halo / Aura ]  (translateZ: 28px)
                           ▲
                           │
                ┌──────────────────────┐  (translateZ: 18px)
                │  Top Face & Bevel    │  Player Symbol / Custom Silhouette
                │  High-Gloss Rim      │  Metallic Border & Gradient
                ├──────────────────────┤
                │  Cylinder / Prism    │  (translateZ: 10px to 18px)
                │  Beveled Side Facets │  Extruded Thickness (6px-8px)
                ├──────────────────────┤
                │  Base Pedestal Ring  │  (translateZ: 4px)
                └──────────────────────┘
                           │
                 [ Ground Drop Shadow ]   (translateZ: 0px / tile plane)
```

#### A. Component Specification: `VolumetricPlayerToken.tsx`
- **Location**: `src/components/board/VolumetricPlayerToken.tsx`
- **Geometry & Layers**:
  1. **Ground Drop Shadow** (`translateZ(0px)`):
     - Radial blur ellipse matching player accent color `rgba(0, 0, 0, 0.6)`.
     - Dynamically expands and softens during hopping or active levitation.
  2. **Volumetric Pedestal / Cylinder Base** (`translateZ(4px..18px)`):
     - Constructed using a 3D beveled rim with stacked depth slices:
       - Top Face: Elevated at `translateZ(18px)`, features radial metallic gradient, player's `colorHex`, and high-contrast avatar/symbol.
       - Side Rim: 3D extruded side bevel (`height: 6px`, shaded to simulate light coming from top-left).
       - Bottom Plate: `translateZ(4px)`.
  3. **Companion Pet Satellite** (`translateZ(12px)`):
     - Orbiting satellite mini-pedestal offset $(+14\text{px}, -10\text{px}, Z: 12\text{px})$ with gentle floating sine-wave.
  4. **Active Player Indicator**:
     - Levitating neon energy ring hovering at `translateZ(26px)`.
     - Active pulsing vertical bobbing animation ($\pm 4\text{px}$).
  5. **Detention / Jail Overlay**:
     - When `player.inDetention === true`, renders a miniature 3D volumetric metallic cage (`translateZ(0px..24px)`) enclosing the token.

---

### 2.3 Dynamic Multi-Token Stacking & Collision Avoidance Engine

#### A. The Problem
When $N$ players occupy the same tile ($N \in \{1, 2, 3, 4\}$), unmanaged placement causes clipping, text occlusion, and visual confusion.

#### B. The Algorithm: `computeTokenPlacements`
- **Location**: `src/components/board/tokenStackingEngine.ts`
- **Mathematical Formulations**:

```
Tile Coordinate Space: (0%, 0%) = Top-Left, (100%, 100%) = Bottom-Right

1 Player (Single Focus):
  - Position: Center token zone (X: 50%, Y: 58%)
  - Elevation: Z = 14px (Active: 22px)
  - Scale: 1.0 (26px diameter)
  - Depth Index: 1

2 Players (Isometric Diagonal Split):
  - Player 0: (X: 33%, Y: 66%, Z: 16px), Scale: 0.88, Depth Index: 2 (Forefront)
  - Player 1: (X: 67%, Y: 50%, Z: 12px), Scale: 0.88, Depth Index: 1 (Background)
  - Line angle: 45° matching isometric board slant. Zero overlap.

3 Players (Delta Pod Formation):
  - Apex / Front (Active Player takes priority): (X: 50%, Y: 70%, Z: 18px), Scale: 0.80, Depth Index: 3
  - Rear-Left: (X: 28%, Y: 48%, Z: 12px), Scale: 0.80, Depth Index: 1
  - Rear-Right: (X: 72%, Y: 48%, Z: 12px), Scale: 0.80, Depth Index: 2
  - Zero clipping; all 3 token glyphs and pet icons visible.

4 Players (Isometric Diamond / Staggered Quadrant):
  - South (Front-Center): (X: 50%, Y: 74%, Z: 18px), Scale: 0.72, Depth Index: 4
  - West (Mid-Left):     (X: 25%, Y: 56%, Z: 14px), Scale: 0.72, Depth Index: 2
  - East (Mid-Right):    (X: 75%, Y: 56%, Z: 14px), Scale: 0.72, Depth Index: 3
  - North (Back-Center):  (X: 50%, Y: 38%, Z: 10px), Scale: 0.72, Depth Index: 1
  - Scale: 0.72 (18px diameter).
```

#### C. Active Player Priority & Depth Sorting
- If an active player is present on the tile, they are dynamically assigned to the **highest depth index** (front-most position) and elevated by $+6\text{px}$, guaranteeing that the player whose turn it is is never obstructed.
- `zIndex` is strictly calculated as:
  $$\text{zIndex} = 20 + \text{depthIndex} \times 5 + (\text{isPlayerActive} ? 50 : 0)$$

---

### 2.4 Volumetric Buildings & Landmarks Architecture (Tier 1..5)

#### A. Component Specification: `VolumetricBuilding.tsx`
- **Location**: `src/components/board/VolumetricBuilding.tsx`
- **Tile Placement**: Positioned in the upper/inner quadrant of property tiles, rising vertically into 3D isometric space without obscuring the bottom token zone or tile price badge.

```
       [ TIER 5: SUPER LANDMARK ]              [ TIER 4: HIGH-RISE ]        [ TIER 1..3 ]
                  ▲ (Spire Beacon)                  ┌──┐ (Helipad)
                 /│\                                │  │                     ┌───┐ (Gable/Roof)
                / │ \                               │  │                     │   │ (4-Story)
               ├──┼──┤ (Setback Crown)              │  │ (Glass Facade)      ├───┤
               │  │  │                              │  │                     │   │ (Cottage)
               │  │  │ (Multi-story Tower)          └──┘                     └───┘
               └──┴──┘ (Base Podium)
```

#### B. Architectural Tiers Breakdown

| Level | Name | Dimensions $(W \times D \times H)$ | Volumetric Features | Visual Aesthetics |
|---|---|---|---|---|
| **Tier 1** | Shophouse / Townhouse | $14\text{px} \times 12\text{px} \times 12\text{px}$ | 1-story pitched gable roof, lit entrance, front window | Terracotta/district-colored roof, shaded side wall |
| **Tier 2** | Duplex / Dual Shophouses | $22\text{px} \times 14\text{px} \times 16\text{px}$ | Twin linked 2-story buildings, offset eaves | Dual facades, 4 glowing windows, front awning |
| **Tier 3** | Mid-Rise Apartment Complex | $18\text{px} \times 16\text{px} \times 26\text{px}$ | 4-story flat-roof residential block, HVAC units | 6 illuminated window apertures, district facade trim |
| **Tier 4** | Corporate Tower / Luxury Hotel | $20\text{px} \times 18\text{px} \times 38\text{px}$ | Stepped cantilever tower, rooftop helipad ('H') | Reflective glass curtain wall, glowing balcony rails |
| **Tier 5** | Monumental Landmark / Skyscraper | $24\text{px} \times 20\text{px} \times 54\text{px}$ | Iconic spire, multi-tier crown, upward light beam | Beaming crown beacon, district aura glow, majestic silhouette |

#### C. World-Specific Architectural Customization
- **`modern-metropolis`**: Sleek tempered glass facades, steel mullions, white concrete, blue/slate rooftop accents.
- **`cyberpunk-city`**: Obsidian carbon composites, high-intensity neon edge trims (cyan/magenta), glowing server exhaust vents, holographic rooftop signs.
- **`mekong-delta`**: Stilted wooden pilings, clay terracotta curved roofs, rooftop planter terraces, bamboo/stone masonry.
- **`space-colony`**: Pressurized white titanium domes, hexagonal solar arrays, glowing hydroponic biosperes, orbital antenna dishes.

#### D. Mortgage Visual State
- When `ownership.isMortgaged === true`:
  - Building structure desaturates (`filter: grayscale(0.85)`).
  - Volumetric holographic caution scaffolding / warning barrier envelops the building in pulsing amber-red stripes.

---

### 2.5 Volumetric 3D Animated Dice Architecture

#### A. Component Specification: `VolumetricDice3D.tsx`
- **Location**: `src/components/dice/VolumetricDice3D.tsx` (replaces or enhances `AnimatedDice.tsx`)
- **Cube Construction via CSS 3D**:
  - Cube size: $S = 56\text{px}$ (mobile) to $64\text{px}$ (desktop). Half-depth $D = S / 2$.
  - 6 Faces arranged with `transform-style: preserve-3d`:
    - **Face 1** (Front): `transform: translateZ(D)`
    - **Face 6** (Back): `transform: rotateY(180deg) translateZ(D)` (Opposite to 1: $1 + 6 = 7$)
    - **Face 2** (Top): `transform: rotateX(90deg) translateZ(D)`
    - **Face 5** (Bottom): `transform: rotateX(-90deg) translateZ(D)` (Opposite to 2: $2 + 5 = 7$)
    - **Face 3** (Right): `transform: rotateY(90deg) translateZ(D)`
    - **Face 4** (Left): `transform: rotateY(-90deg) translateZ(D)` (Opposite to 3: $3 + 4 = 7$)

#### B. Camera-Facing Orientations for Outcomes 1..6
When an outcome $V \in \{1, 2, 3, 4, 5, 6\}$ is rolled, the die's container rotates to present face $V$ directly to the camera:
$$\begin{aligned}
V = 1 &\implies \text{rotateX}(0^\circ)\;\text{rotateY}(0^\circ) \\
V = 2 &\implies \text{rotateX}(-90^\circ)\;\text{rotateY}(0^\circ) \\
V = 3 &\implies \text{rotateX}(0^\circ)\;\text{rotateY}(-90^\circ) \\
V = 4 &\implies \text{rotateX}(0^\circ)\;\text{rotateY}(90^\circ) \\
V = 5 &\implies \text{rotateX}(90^\circ)\;\text{rotateY}(0^\circ) \\
V = 6 &\implies \text{rotateX}(0^\circ)\;\text{rotateY}(180^\circ)
\end{aligned}$$
*(Plus isometric tray inclination: $\text{rotateX}(-18^\circ)\;\text{rotateY}(15^\circ)$ for a three-quarter view showing the top and side bevel).*

#### C. Rolling Physics Simulation
1. **Tumble Phase ($t = 0\dots 650\text{ms}$)**:
   - Die lifts off tray: $\text{translateY}(-45\text{px})\;\text{translateZ}(60\text{px})$.
   - High-velocity 3D rotation: $\text{rotateX}(720^\circ + \text{targetX})\;\text{rotateY}(1080^\circ + \text{targetY})\;\text{rotateZ}(360^\circ)$.
   - Dynamic shadow contracts and blurs on the tray floor.
2. **Impact & Bounce Phase ($t = 650\dots 850\text{ms}$)**:
   - Die strikes the tray surface at $t = 650\text{ms}$ (triggers `soundEffects.diceHit()`).
   - Rebound bounce: $\text{translateY}(-14\text{px})$ at $t = 730\text{ms}$, settling to $\text{translateY}(0)$ at $t = 820\text{ms}$.
   - Shadow sharpens into high-contrast ground contact.
3. **Settlement & Double Dice Glow**:
   - Damped rotational wobble dies down to exact target orientation.
   - If `isDouble === true`, radiant golden particle aura and border pulse trigger around both cubes.

#### D. Compatibility with Cosmetic Dice Skins
Existing skins in `src/cosmetics/catalog.ts` map directly onto the 6 faces:
- `dice-neon-cyan`: Dark crystalline cyan cube, luminous cyan bevels, electric cyan pips.
- `dice-cyber-gold`: 24K gilded gold cube, specular mirror highlights, deep amber/red pips.
- `dice-obsidian-void`: Obsidian glass faces, deep purple borders, glowing neon violet pips.
- `dice-starlight`: Prismatic celestial gradient, star-cluster borders, bright yellow/white pips.
- `dice-flame-ruby`: Crimson ruby crystal faces, fiery embers, glowing amber pips.

---

### 2.6 Compatibility with Cosmetics, Themes, and Tests

1. **Zero Breaking Changes**:
   - `PlayerToken` in `src/game/types/index.ts` remains intact.
   - `COSMETICS_CATALOG` in `src/cosmetics/catalog.ts` remains 100% compliant with existing tests.
   - All 5 dice skins, 6 tokens, and companion pets map directly into the volumetric renderers.
2. **Vitest & Playwright Compliance**:
   - Existing component props (`tile`, `ownership`, `playersHere`, `dice`, `isRolling`, `isDouble`) are preserved.
   - Test queries (`data-testid`, title tags, role buttons) remain unchanged.

---

## 3. Caveats

1. **`prefers-reduced-motion` Support**:
   - Users with motion sensitivity must have tumble/hop animations disabled. The system must immediately snap dice and tokens to final coordinates and elevations without tumbling when `prefers-reduced-motion: reduce` is detected.
2. **Browser CSS 3D Precision & Backface Culling**:
   - On older mobile Safari engines, `transform-style: preserve-3d` can occasionally flatten if parent containers have `overflow: hidden`. `BoardView.tsx` and `TileComponent.tsx` must maintain `overflow: visible` on the 3D stage layer while clipping is confined to child badge regions.
3. **Touch Targets on Small Screens**:
   - Tile interactive click/tap bounds must remain $44\text{px} \times 44\text{px}$ minimum (WCAG 2.2 touch target compliance). Volumetric building geometry and tokens are set to `pointer-events-none` so tile selection remains effortless.

---

## 4. Conclusion & File-by-File Blueprint

### Concrete Recommended File Layout:

```
src/components/
├── board/
│   ├── BoardView.tsx               (Maintains 11x11 perimeter and preserve-3d stage)
│   ├── TileComponent.tsx           (Embeds VolumetricBuilding & VolumetricPlayerToken)
│   ├── CenterCityView.tsx          (Hosts VolumetricDice3D in central plaza)
│   ├── VolumetricPlayerToken.tsx   [NEW] (3D cylinder pedestal, bevel, shadow, pet, aura)
│   ├── VolumetricBuilding.tsx      [NEW] (Tier 1..5 3D buildings, world themes, landmarks)
│   └── tokenStackingEngine.ts      [NEW] (Pure math engine for 1..4 player stacking & depth)
├── dice/
│   ├── AnimatedDice.tsx            (Upgraded to true 3D 6-face cube or wraps VolumetricDice3D)
│   └── VolumetricDice3D.tsx        [NEW] (CSS 3D cube geometry, tumble, bounce, skins)
└── cosmetics/
    └── (Zero schema changes needed; catalog, storage, shop, and tests 100% preserved)
```

### File-by-File Implementation Blueprints:

#### 1. `src/components/board/tokenStackingEngine.ts`
- **Purpose**: Calculate non-overlapping 3D isometric positions, elevations, scales, and depth sorting for 1 to 4 occupying players on any tile.
- **Exports**:
  ```ts
  export interface TokenPlacement {
    xPercent: number;    // % offset from tile left
    yPercent: number;    // % offset from tile top
    elevationZ: number;  // px height above board plane
    scale: number;       // scale factor (0.72 to 1.0)
    depthIndex: number;  // z-sorting index (1 = rear, 4 = front)
    isForefront: boolean;// whether token has active focus
  }
  export function computeTokenPlacements(
    playersHere: PlayerState[],
    activePlayerId?: string,
    isIsometric?: boolean
  ): Record<string, TokenPlacement>;
  ```

#### 2. `src/components/board/VolumetricPlayerToken.tsx`
- **Purpose**: Render an individual player's piece as a 3D volumetric prismatic pedestal with beveled rim, ground contact shadow, pet satellite, and active aura.
- **Props**:
  ```ts
  export interface VolumetricPlayerTokenProps {
    player: PlayerState;
    isPlayerActive: boolean;
    equippedPetId?: string | null;
    placement: TokenPlacement;
    isIsometric: boolean;
  }
  ```

#### 3. `src/components/board/VolumetricBuilding.tsx`
- **Purpose**: Render realistic 3D miniature buildings (Tier 1..5) with roof geometry, lit window facades, world theme styles, and mortgage overlays.
- **Props**:
  ```ts
  export interface VolumetricBuildingProps {
    level: number;              // 1 to 5
    districtColor: string;      // Tailwind class or district ID
    districtHex?: string;       // Custom hex from world pack
    worldId: string;            // 'modern-metropolis' | 'cyberpunk-city' | etc.
    isMortgaged?: boolean;
    tileType: string;           // 'PROPERTY' | 'TRANSPORT' | 'UTILITY'
  }
  ```

#### 4. `src/components/dice/VolumetricDice3D.tsx`
- **Purpose**: Render a pair of true 3D cube dice with 6 textured faces (opposite faces summing to 7), multi-axis tumbling, bounce impact, cosmetic skin support, and double-dice celebration.
- **Props**:
  ```ts
  export interface VolumetricDice3DProps {
    dice: [number, number];
    isRolling: boolean;
    isDouble: boolean;
    diceSkinId?: string;
    onRollComplete?: () => void;
  }
  ```

#### 5. Integration into `TileComponent.tsx` & `CenterCityView.tsx`
- In `TileComponent.tsx`: Replace flat text emojis in `renderUpgradeBadge` with `<VolumetricBuilding>` positioned at tile's upper center. Replace flex-wrapped flat player circles with positioned `<VolumetricPlayerToken>` instances.
- In `CenterCityView.tsx`: Replace flat dice with `<VolumetricDice3D>`.

---

## 5. Verification Method

To independently verify the volumetric objects implementation:

1. **Unit & Logic Test Verification**:
   ```bash
   npm test
   ```
   - Must pass all 26 test files and 469 existing tests with 0 failures.
   - Add new unit test suite: `src/game/__tests__/volumetric_objects.test.ts` testing:
     - `computeTokenPlacements` for $N = 1, 2, 3, 4$ players ensuring coordinate bounds ($0 \le X, Y \le 100$), scale constraints ($0.7 \le \text{scale} \le 1.0$), and active player priority.
     - Opposite-face sum equals 7 for all 6 dice faces.
     - Building tier generation for levels 1 through 5.

2. **Visual & Collision Inspection**:
   - Start 4-player game in browser:
     - Tile 0 (START): Inspect all 4 player tokens occupying the same tile. Confirm zero overlap, distinct colors/symbols, and active player forefront prominence.
     - Move players to Jail (Tile 10) and multiple properties: Verify dynamic stacking and detention cage rendering.
     - Upgrade properties through Levels 1, 2, 3, 4, and 5 (Landmark 81): Verify architectural height progression and world-specific styling (Cyberpunk vs. Mekong Delta).
     - Roll dice: Verify 3D cube tumbling, realistic impact bounce, settle orientation matching rolled sum, and double-dice golden aura.

3. **Motion Reduction Check**:
   - Enable `prefers-reduced-motion: reduce` in browser devtools:
     - Confirm dice roll results display immediately without tumbling sickness.
     - Confirm token movement teleports cleanly without infinite hopping loops.
