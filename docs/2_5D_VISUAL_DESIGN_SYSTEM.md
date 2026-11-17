# CHAOS MONOPOLY — 2.5D VISUAL DESIGN SYSTEM

**Document ID:** VDS-2.5D-001  
**Aesthetic Direction:** Premium Isometric 2.5D · Modern Board-Game Diorama · Cinematic Minimalism  
**Target Platform:** Web (Desktop 180Hz / Laptop / Mobile 60Hz)  
**Status:** ACTIVE & STANDARDIZED  

---

## 1. Core Visual Principles

The 2.5D redesign of `CHAOS MONOPOLY` elevates the presentation into a physical digital diorama:

1. **Physicality Over Flatness:** The board is not a flat canvas; it is an extruded monolithic gaming slab resting upon an atmospheric table plane with soft ambient occlusion contact shadows.
2. **Tactile Volumetrics:** Every tile is an elevated tactile plate ($+4\text{px}$ to $+14\text{px}$) that depresses when mortgaged and lifts when hovered. Buildings, tokens, and dice are true three-dimensional geometric objects with visible top and side facets.
3. **Controlled Cinematic Lighting:** Avoids chaotic neon oversaturation in favor of a unified directional lighting model (Key Light from South-East, Soft Ambient Fill from North-West) with consistent face shading.
4. **Distortion-Free Typography:** Numerical amounts, player names, and deed details utilize inverse-camera billboarding, ensuring zero perspective distortion regardless of pitch and yaw angles.
5. **Restrained Elegance:** Dark slate substrates (`#080c14`, `#0f172a`) balanced with sharp translucent borders (`border-slate-800/80`) and purposeful semantic accents.

---

## 2. Directional Lighting & Shading Model

### 2.1 Virtual Light Sources
- **Primary Key Light:** Located at Azimuth $135^\circ$ (South-East), Altitude $60^\circ$. Casts sharp highlights on South-East extruded walls and tile top surfaces.
- **Ambient Fill Light:** Soft diffuse light at Azimuth $315^\circ$ (North-West). Prevents shadow faces from falling into total blackness.
- **Ground Contact Shadow:** Soft radial falloff blur beneath the board slab simulating a floating diorama pedestal.

### 2.2 Face Luminosity Standards
| Object Face | Relative Luminance | Shading Formula |
|:---|:---:|:---|
| **Top Face (Horizontal Plane)** | $100\%$ | Base diffuse color with specular gradient overlay |
| **South-East Face (Front-Right)** | $80\%$ | `linear-gradient(90deg, baseColor 0%, #141d2e 100%)` |
| **South-West Face (Front-Left)** | $60\%$ | `linear-gradient(180deg, baseColor 0%, #060911 100%)` |
| **Back Faces (North-West / North-East)**| $40\%$ | Dark ambient occluded shade `#04070d` |

---

## 3. Materials & Surfaces System

### 3.1 Board Pedestal Materials
- **Monolithic Base:** Deep obsidian stone with metallic beveled trim.
- **Side Wall Extrusion:** 28px physical height with horizontal LED rim matching the active world's accent palette.
- **Under-Slab Void:** Radial ambient occlusion shadow (`rgba(0,0,0,0.85)` blurred to 16px).

### 3.2 Tile Materiality
- **Standard Unowned Property:** Dark titanium plate (`#111827/95`) with beveled border (`border-slate-800`).
- **Hovered State:** Tactile lift $+12\text{px}$ in $+Z$ with subtle cyan aura (`0 12px 22px rgba(0,0,0,0.75), 0 0 16px rgba(6,182,212,0.35)`).
- **Active Turn Highlight:** Elevated $+14\text{px}$ with breathing cyan ring (`ring-2 ring-cyan-400 shadow-neon-cyan`).
- **Mortgaged Property:** Sunken $-4\text{px}$ below board baseline with inset cavity shadow (`inset 0 3px 8px rgba(0,0,0,0.95)`) and $45^\circ$ hazard stripes.
- **Corner Anchors (GO, Detention, Parking, Go-to-Detention):** Elevated deep-slate block (`#0f172a`) with reinforced border geometry.

---

## 4. Volumetric Buildings (Tiers 1–5)

Buildings feature distinct procedural architectural styles conforming to standard height steps:

| Tier | Building Name | Height ($Z$) | Silhouette & Architecture |
|:---:|:---|:---:|:---|
| **Tier 1** | Small House | $+8\text{px}$ | Compact cube with 4-sided beveled roof cap. |
| **Tier 2** | Duplex / Workshop | $+12\text{px}$ | Extended dual-volume structure with rooftop vents. |
| **Tier 3** | Luxury Villa / Office | $+16\text{px}$ | Multi-story stepped block with illuminated window grids. |
| **Tier 4** | Corporate High-Rise | $+20\text{px}$ | Tall architectural skyscraper with setback terraces. |
| **Tier 5** | Metropolis Landmark / Hotel | $+26\text{px}$ | Grand tower featuring glowing crown spire and world emblem. |

---

## 5. Volumetric Player Tokens & Pets

### 5.1 3D Player Token Design
- **Base Geometry:** Octagonal prismatic column extruded $+18\text{px}$ above tile surface.
- **Player Color Core:** Radial gradient cylinder reflecting player's signature token color.
- **Active Turn Aura:** Pulsing ground levitation ring with soft upward emission beam.
- **Drop Shadow:** Dark elliptical ground contact shadow beneath each token.

### 5.2 Companion Pets
- Pets hover $+6\text{px}$ adjacent to the player token on the tile's minor axis, featuring gentle bobbing animations that synchronize with token hops.

---

## 6. Physical 3D Cube Dice

- **Geometry:** Exact $56\text{px} \times 56\text{px} \times 56\text{px}$ cube assembled via 6 CSS 3D transformed planes.
- **Pip Inlay:** Inset circular indentations with high-contrast dots.
- **Skins Supported:**
  - *Default Titanium:* Brushed gunmetal faces with glowing cyan pips.
  - *Cyberpunk Hologram:* Translucent dark glass with magenta laser pips.
  - *Gold Prestige:* Mirrored gold plating with obsidian pips.
- **Roll Animation:** Physics-based tumbling sequence across multiple axes ending with an elastic squash-and-stretch settle.

---

## 7. World-Specific Visual Theming

| World | Board Material | Building Style | Accent Neon | Skybox & Particle VFX |
|:---|:---|:---|:---|:---|
| **Modern Metropolis** | Brushed Concrete & Steel | Minimalist Glass Skyscrapers | Cyan (`#06b6d4`) | Starry night sky with distant city lights |
| **Cyberpunk City** | Dark Carbon Fiber & Mesh | Neon Spire Skyscrapers | Fuchsia (`#d946ef`) | Heavy neon rain, holographic light shafts |
| **Mekong Delta** | Dark Teak Wood & Riverstone | Pagoda Stilt Pavilions | Emerald (`#10b981`) | Warm river mist with glowing fireflies |
| **Space Colony** | Pressurized Hex-Tiles | Bio-Domes & Solar Arrays | Indigo (`#6366f1`) | Deep orbital cosmos with drifting stardust |

---

## 8. Spatial HUD & Billboard Integration

- **HUD Elevation:** The HUD sits on an elevated overlay plane ($Z = 100\text{px}$) with frosted glass backing (`backdrop-blur-xl bg-[#0d131f]/90`).
- **Camera Controls Bar:** Floating docked capsule providing 1-click toggles between *2D*, *2.5D Isometric*, *3D Cinematic*, and *Tactical* presets, plus continuous zoom sliders.
- **Accessibility & Reduced Motion:** When `prefers-reduced-motion` is detected, 3D camera animations transition instantaneously, dice roll without tumbling blur, and token hopping is replaced with smooth fades.
