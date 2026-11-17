# CHAOS MONOPOLY — UI/UX, 2.5D Presentation Architecture & QA Verification Matrix

**Document Version**: 1.0.0  
**Author**: Teamwork Explorer (Surveyor 3 — UI/UX & QA Testing Specialist)  
**Status**: Authoritative Architectural Specification  
**Target Project**: CHAOS MONOPOLY (Autonomous One-Shot Prototype)

---

## Table of Contents
1. [Executive Summary & Visual Direction](#1-executive-summary--visual-direction)
2. [2.5D Simulated-3D Board Architecture](#2-25d-simulated-3d-board-architecture)
3. [Player Token System & Hopping Animation Physics](#3-player-token-system--hopping-animation-physics)
4. [Tile Aesthetics & Vietnamese Landmark Hierarchy](#4-tile-aesthetics--vietnamese-landmark-hierarchy)
5. [Cinematic HUD & Responsive Interface Architecture](#5-cinematic-hud--responsive-interface-architecture)
6. [Procedural Web Audio API Sound Synthesizer](#6-procedural-web-audio-api-sound-synthesizer)
7. [Mobile Responsiveness, Ergonomics & Accessibility](#7-mobile-responsiveness-ergonomics--accessibility)
8. [QA Verification & Test Architecture (13 Requirements)](#8-qa-verification--test-architecture-13-requirements)
9. [4-Tier Test Matrix & Automated Test Suite Blueprint](#9-4-tier-test-matrix--automated-test-suite-blueprint)
10. [Implementation Roadmap for UI & QA Engineers](#10-implementation-roadmap-for-ui--qa-engineers)

---

## 1. Executive Summary & Visual Direction

### 1.1 Visual Identity: "Cyberpunk Vietnam 2077 Metropolis"
CHAOS MONOPOLY is an original, cinematic board game set in a near-future Vietnamese economic supercity. The aesthetic merges the familiar street energy and iconic landmarks of modern Vietnam (Hà Nội, TP Hồ Chí Minh, Đà Nẵng, Cần Thơ, Hải Phòng) with futuristic cyberpunk flair, holographic billboards, and chaotic sci-fi phenomena.

Rather than looking like an admin dashboard or a flat digital spreadsheet, the interface must evoke the feel of an arcade-grade digital board game: tactile, responsive, rich in particle lighting, and bursting with game feel.

```
+-----------------------------------------------------------------------------------+
| [BRAND] CHAOS MONOPOLY  |  VÒNG 14 / 30  |  [2.5D/2D] [SFX] [TỐC ĐỘ 2X] [LUẬT]   |
+-----------------------------------------------------------------------------------+
| [P1: Alice - $1,850M]   [P2: Bob - $420M]   [P3: Chi - $2,100M]   [P4: Dũng - $0] |
+-----------------------------------------------------------------------------------+
|  +--------------------+-------------------------------------+------------------+  |
|  | [12: VÀO TÙ]       |  [13-17: ĐÀ NẴNG - CẦU VÀNG...]     | [18: MIỄN PHÍ]   |  |
|  +--------------------+-------------------------------------+------------------+  |
|  | [11: Landmark 81]  |                                     | [19: Nha Trang]  |  |
|  | [10: Bến Thành]    |        === CENTER METROPOLIS ===    | [20: Vũng Tàu]   |  |
|  | [9:  Cổng Sài Gòn] |                                     | [21: Sân bay NB] |  |
|  | [8:  Phố Cổ HN]    |    [ 🎲 🎲 ANIMATED 3D DICE ]       | [22: Phú Quốc]   |  |
|  | [7:  Hồ Hoàn Kiếm] |    [ ⚡ CHAOS PORTAL ENERGY ]       | [23: Apex Tower] |  |
|  +--------------------+-------------------------------------+------------------+  |
|  | [6: TẠM GIAM]      |  [5-1: TP.HCM & HÀ NỘI TIỂU THƯƠNG] | [0: KHỞI HÀNH]   |  |
|  +--------------------+-------------------------------------+------------------+  |
+-----------------------------------------------------------------------------------+
| ACTION DOCK:  [LƯỢT: ALICE]  -->  [ 🎲 LẮC XÚC XẮC ]  [ 🛒 MUA ĐẤT ]  [ ⏩ KẾT THÚC ]|
+-----------------------------------------------------------------------------------+
```

### 1.2 Color Palette System
The visual style is built upon a high-contrast dark foundation accented by vivid neon hues:

| Token Name | Hex Code | Tailwind Equivalent | Role & Context |
|---|---|---|---|
| `bg-space-dark` | `#080c14` | Custom | Core page background, ambient deep space |
| `bg-panel-dark` | `#0d131f` | Slate-900 / 95 | Glassmorphism cards, HUD dock, modal surfaces |
| `accent-neon-cyan` | `#00f2fe` | Cyan-400 | Primary interactive glow, turn highlights, active player 1 |
| `accent-gold-amber` | `#f59e0b` | Amber-500 | Money, victory badges, luxury properties, player 2 |
| `accent-emerald-green` | `#10b981` | Emerald-500 | Positive cash flow, buy buttons, GO tile, player 3 |
| `accent-cyber-pink` | `#ec4899` | Pink-500 | High-tier properties, Apex Tower, player 4 |
| `accent-calamity-red`| `#ef4444` | Red-500 | Negative events, taxes, jail siren, bankruptcy alert |
| `accent-chaos-purple`| `#a855f7` | Purple-500 | Chaos portals, quantum warp, global modifiers |

### 1.3 Typography Hierarchy
- **Header & Display Font**: `Outfit` or `Orbitron`, sans-serif, weights `700` and `900`. Used for "CHAOS MONOPOLY", round indicators, victory titles, and currency values.
- **Body & Information Font**: `Plus Jakarta Sans` or `Inter`, sans-serif, weights `400`, `600`, and `700`. Optimized for Vietnamese diacritics (dấu ngã, hỏi, nặng, sắc, huyền).
- **Numbers & Monospace**: `JetBrains Mono` or tabular numerals (`font-mono`) for currency counters, turn timers, and dice numbers to prevent layout jittering during rolling animations.

---

## 2. 2.5D Simulated-3D Board Architecture

### 2.1 Technology Selection: Lightweight CSS 3D Transforms vs WebGL Canvas
A core requirement from `ORIGINAL_REQUEST.md` is:
> *"Lightweight simulated-3D / 2.5D presentation... Smooth 60fps across mobile and desktop... Inspect the current workspace and reuse suitable existing infrastructure."*

**Architectural Decision: CSS 3D Transforms + Hybrid DOM Rendering.**
- **Why NOT full WebGL (Three.js/Babylon.js)?**
  - WebGL introduces 1.5MB+ bundle overhead, complex shader pipelines, high GPU battery drain on mobile phones, canvas resolution blurriness on Retina displays, WebGL context loss when mobile browsers background tabs, and breaks DOM accessibility/screen reader inspection.
- **Why CSS 3D Transforms (`rotateX` + `rotateZ` + `perspective`)?**
  - Instant hardware-accelerated GPU composition (via CSS `transform: translate3d`).
  - Native DOM tree preserves razor-sharp vector SVG icons, crisp Vietnamese typography, and automatic layout reflow.
  - Native touch/click hit-testing on every tile without complex 3D raycasting.
  - Zero bundle overhead (runs on browser native CSS engine).
  - Effortless switching between 2.5D Isometric Mode and 2D Flat Mode via a single CSS class toggle.

### 2.2 Perspective Geometry & Angles
```css
/* Container perspective viewport */
.perspective-board {
  perspective: 1400px;
  perspective-origin: 50% 60%;
}

/* 2.5D Isometric Tilt Mode */
.isometric-view {
  transform: rotateX(26deg) rotateZ(-6deg) scale(0.96);
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
  box-shadow: 
    0 35px 70px -15px rgba(0, 0, 0, 0.95),
    0 0 50px rgba(6, 182, 212, 0.15);
}

/* 2D Flat Mode (Optimal for compact mobile screens or user preference) */
.flat-view {
  transform: rotateX(0deg) rotateZ(0deg) scale(1);
  transform-style: flat;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.8);
}
```

### 2.3 Board Layout & Perimeter Grid Mapping
The board architecture supports responsive layouts:
- **Compact Prototype Layout (24 Tiles, 7x7 Grid)**: 7x7 perimeter with 5x5 center metropolis plaza.
- **Standard Grand Board Layout (40 Tiles, 11x11 Grid)**: 11x11 perimeter with 9x9 center metropolis arena.

#### 40-Tile Perimeter Grid Mapping (11x11):
- **Bottom Edge (Tiles 0 to 10)**: Right to Left.
  - `Tile 0` (Khởi Hành - START): Col 11, Row 11 (Corner)
  - `Tile 1 to 9`: Col 10 down to Col 2, Row 11
  - `Tile 10` (Tạm Giam / Thăm Tù): Col 1, Row 11 (Corner)
- **Left Edge (Tiles 10 to 20)**: Bottom to Top.
  - `Tile 11 to 19`: Col 1, Row 10 up to Col 2
  - `Tile 20` (Lễ Hội Phố Đi Bộ / Bến Đỗ Miễn Phí): Col 1, Row 1 (Corner)
- **Top Edge (Tiles 20 to 30)**: Left to Right.
  - `Tile 21 to 29`: Col 2 up to Col 10, Row 1
  - `Tile 30` (Vào Tù Ngay / Cảnh Sát Bắt): Col 11, Row 1 (Corner)
- **Right Edge (Tiles 30 to 39)**: Top to Bottom.
  - `Tile 31 to 39`: Col 11, Row 2 down to Col 10
- **Center Stage (Col 2 to 10, Row 2 to 10)**: Holds the 3D Animated Dice Arena, Chaos Vortex, and Live Ticker.

### 2.4 Center Stage Architecture: The Metropolis Arena
The center square is an active gameplay arena featuring 3 distinct functional zones:
1. **Top HUD Banner**: Displays currently active player card, avatar, turn number, and cash balance.
2. **Center Arena (The 3D Dice Stage)**:
   - Houses the dual 3D animated dice with physical rolling animations, drop shadows, and double-dice highlight banner.
   - Houses the Chaos Vortex visual effect when a Chaos tile is triggered.
3. **Bottom Live Feed Ticker**: A scrolling ambient log displaying recent events with icons (e.g. `[ĐÔI] Alice lắc được đôi 4-4! Được đi thêm lượt.`).

---

## 3. Player Token System & Hopping Animation Physics

### 3.1 Distinctive Vietnamese Themed Tokens
Every player is assigned a distinctive high-tech Vietnamese vehicular or cultural token:

| Token ID | Vietnamese Name | Visual Avatar | Primary Hex | Accent Hex | Symbolic Character |
|---|---|---|---|---|---|
| `token-vinfast` | **Xe Điện VinFast VF9** | 🏎️ / Car | `#06b6d4` (Neon Cyan) | `#0891b2` | Tốc độ công nghệ, sang trọng hiện đại |
| `token-metro` | **Tàu Siêu Tốc Metro** | 🚄 / Train | `#10b981` (Emerald) | `#059669` | Huyết mạch giao thông kết nối Bắc-Nam |
| `token-neko` | **Mèo Thần Tài Cyber** | 🐱 / Cat | `#f59e0b` (Imperial Gold) | `#d97706` | Thu hút tài lộc, tích lũy của cải |
| `token-vinasat` | **Phi Thuyền Vinasat** | 🚀 / Rocket | `#ec4899` (Magenta Pink) | `#db2777` | Vươn tầm vũ trụ, đột phá bất ngờ |

### 3.2 Hopping Animation Physics
Instantaneous jumping between tiles disorients players. Instead, token movement uses a sequential hop loop:

```typescript
// Token Movement Sequencer in React state
export async function animateTokenHop(
  startPos: number,
  targetPos: number,
  boardSize: number,
  onStep: (pos: number) => void
): Promise<void> {
  let current = startPos;
  while (current !== targetPos) {
    current = (current + 1) % boardSize;
    onStep(current);
    soundEffects.tokenStep();
    await new Promise(res => setTimeout(res, 140)); // 140ms per tile hop
  }
}
```

```css
/* Token Hopping CSS Keyframes */
@keyframes tokenHop {
  0% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-16px) scale(1.25);
    box-shadow: 0 16px 20px rgba(0, 0, 0, 0.4);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

.token-hop-active {
  animation: tokenHop 0.14s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 3.3 Multi-Token Collision & Stacking Rules
When 2, 3, or 4 players occupy the same tile:
- Instead of overlapping and obscuring each other, tokens are organized into a compact flex-row or orbital grid inside the tile's footer.
- The currently active player's token is highlighted with a pulsing neon ring (`token-active-pulse`) and elevated z-index (`z-30`).

---

## 4. Tile Aesthetics & Vietnamese Landmark Hierarchy

### 4.1 Tile Types and Visual Taxonomy

```
+------------------------------------------+
| [DISTRICT COLOR BAR] ⭐⭐⭐ (Cấp 3)      |  <-- Level Badges (Stars / Sky Tower)
|------------------------------------------|
|             [ICON: Landmark]             |  <-- Lucide SVG Vector Icon
|                                          |
|        TÒA THÁP BITEXCO TP.HCM           |  <-- Vietnamese Landmark Name
|                 $280M                    |  <-- Base Purchase Price
|------------------------------------------|
| [OWNER BADGE: Alice (Cyan Ribbon)]       |  <-- Player Ownership Indicator
| (Tokens: [🏎️ P1] [🐱 P3])                 |  <-- Occupying Player Tokens
+------------------------------------------+
```

### 4.2 District Color Palette & Economic Theming
Properties are grouped into Vietnamese regional districts with high-contrast color bands:
1. **Quận 1 Sài Gòn (Đỏ Ruby - `#e11d48`)**: Bến Thành, Nguyễn Huệ, Landmark 81.
2. **Hoàn Kiếm Hà Nội (Vàng Hoàng Gia - `#f59e0b`)**: Phố Cổ, Tràng Tiền, Hồ Gươm.
3. **Thành Phố Biển Đà Nẵng (Xanh Dương - `#2563eb`)**: Cầu Rồng, Mỹ Khê, Bán Đảo Sơn Trà.
4. **Thủ Phủ Miền Tây Cần Thơ (Xanh Lục - `#059669`)**: Bến Ninh Kiều, Chợ Nổi Cái Răng.
5. **Cảng Biển Hải Phòng (Cam San Hô - `#ea580c`)**: Đồ Sơn, Cảng Lạch Huyện.
6. **Thủ Đức Sáng Tạo & Cyber Hub (Tím Neon - `#9333ea`)**: Khu Công Nghệ Cao, Đại Lộ Sáng Tạo.
7. **Hạ Tầng Giao Thông (4 Trạm Trung Chuyển)**: Sân bay Nội Bài, Sân bay Tân Sơn Nhất, Ga Hà Nội, Cảng Sài Gòn.
8. **Công Ích Đô Thị**: Điện Lực EVN, Cấp Nước Chợ Lớn.

### 4.3 Property Upgrade Visual Levels
Each property features 4 upgrade tiers with tactile badge indicators:
- **Level 0 (Đất trống)**: Clean district color strip, base price displayed.
- **Level 1 (⭐ Căn hộ chung cư)**: 1 bronze star badge, rent +100%.
- **Level 2 (⭐⭐ Tòa nhà văn phòng)**: 2 silver star badges, rent +250%.
- **Level 3 (⭐⭐⭐ Trung tâm thương mại)**: 3 gold star badges, rent +500%.
- **Level 4 / Sky Tower (🏙️ Siêu Landmark Apex)**: Pulsing holographic skyline crown icon, rent +1000%.

---

## 5. Cinematic HUD & Responsive Interface Architecture

### 5.1 Layout Wireframe (Desktop vs Mobile)

#### Desktop (>= 1024px):
- **Top Bar (Header)**: Brand title, Round Counter, 2.5D/2D View Toggle, Sound Toggle, Rules button, Game Restart.
- **Sub-Header Ribbon**: 4-player leaderboard cards displaying real-time cash, net worth, owned properties count, and jail badges.
- **Main Viewport**: Center board view (max 850px aspect ratio 1:1) flanked by an Event Feed sidebar on the right.
- **Bottom Dock**: Floating action bar anchored to bottom viewport with primary Roll, Buy, Upgrade, Bail, and End Turn controls.

#### Mobile (< 1024px):
- **Top Bar**: Compact header with minimal icons (Brand icon, Round counter, 2.5D toggle, Sound toggle, Menu).
- **Player Ribbon**: Horizontally scrollable or compact 2x2 grid showing current player highlighted.
- **Board Viewport**: Full-width board automatically scaling to fit `100vw - 16px`, maintaining 1:1 square aspect ratio.
- **Bottom Sheet Dock**: Fixed bottom action panel with minimum 48px touch buttons for one-handed thumb interaction.

### 5.2 Chaos Event Splash Modal Design
When a player lands on a Chaos tile or an automatic global event triggers:
1. **Dramatic Screen Overlay**: 80% black backdrop blur (`backdrop-blur-md bg-black/80`).
2. **Rarity Theming**:
   - `COMMON`: Cool Blue border & glow (`#3b82f6`).
   - `UNCOMMON`: Bright Neon Cyan border & glow (`#06b6d4`).
   - `RARE`: Radiant Electric Gold border & glow (`#f59e0b`).
   - `CALAMITY / LEGENDARY`: Pulsing Fuchsia-Crimson border with screen shake cue (`#d946ef`).
3. **Card Content**:
   - Header with rarity badge and animated event icon (e.g. `Sparkles`, `Skull`, `TrendingUp`, `Navigation`).
   - Vietnamese Title (e.g. *"Cơn Sốt Đất Toàn Cầu"*, *"Thanh Tra Thuế Khẩn Cấp"*).
   - Tagline (e.g. *"Bão giá bất động sản"*).
   - Evocative Flavor Text: *"Thị trường dậy sóng! Mọi người chơi nhận ngay $200M trợ cấp kích cầu."*
   - Impact Readout: Exact state change preview.
   - High-contrast "TIẾP TỤC" action button.

---

## 6. Procedural Web Audio API Sound Synthesizer

### 6.1 Architectural Principle: Zero External Audio Assets
External audio files (`.mp3`, `.wav`) introduce significant risks: 404 network errors, slow loading times, mobile autoplay blocks, and CORS restrictions. 
CHAOS MONOPOLY utilizes a **100% procedural Web Audio API synthesizer** that generates all sound effects mathematically on-the-fly via oscillators, gain nodes, and frequency ramps.

### 6.2 Complete Sound Effects Specification & Implementation Blueprint

```typescript
// soundEngine.ts - Complete Procedural Synthesizer Blueprint

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundEffects = {
  // 1. UI Click: High-to-mid sine blip (50ms)
  click: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },

  // 2. Token Step: Wooden tile tap (30ms)
  tokenStep: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  },

  // 3. Dice Roll: Multi-pebble rattle burst (6 rapid randomized pulses)
  diceRoll: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const time = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 260, time);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.05);
    }
  },

  // 4. Property Purchase: Ascending major arpeggio cash chime (A4, C#5, E5, A5)
  buyProperty: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.25);
    });
  },

  // 5. Property Upgrade: Sparkling ascending major 7th chord (C5, E5, G5, B5, C6)
  upgradeProperty: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.28);
    });
  },

  // 6. Rent Payment: Downward register ding (600Hz -> 240Hz)
  payRent: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [600, 480, 360, 240];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.15);
    });
  },

  // 7. Jail Siren: Dual-tone alternating police siren (800Hz / 600Hz)
  jailSiren: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const freqs = [800, 600, 800, 600];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.11);
    });
  },

  // 8. Chaos Trigger: Sci-fi frequency sweep with resonance (150Hz -> 850Hz -> 100Hz)
  chaosTrigger: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(850, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.65);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  },

  // 9. Victory Fanfare: Grand major chord burst with sustained reverb
  victory: () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.4);
    });
  },
};
```

---

## 7. Mobile Responsiveness, Ergonomics & Accessibility

### 7.1 Responsive Viewport Strategy
- **Container Sizing**: Board scales dynamically using `min(100vw - 24px, 850px)` to guarantee perfect square framing across all mobile screens without horizontal scroll.
- **Aspect Ratio Maintenance**: Board container uses CSS `aspect-ratio: 1 / 1`.
- **Thumb-Friendly Touch Targets**: All action buttons conform to WCAG 2.2 touch target minimum of **48x48px** with at least 8px padding gaps to prevent accidental taps.

### 7.2 Reduced-Motion Support (`prefers-reduced-motion`)
For players with vestibular disorders or motion sensitivity:
```css
@media (prefers-reduced-motion: reduce) {
  .isometric-view {
    transform: none !important;
    transition: none !important;
  }
  .token-active-pulse,
  .animate-pulse,
  .animate-bounce {
    animation: none !important;
  }
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

### 7.3 Accessibility & WCAG 2.2 Standards
1. **Color Distinction Independency**: Every player token and property color band is paired with a distinct icon/symbol (Car, Train, Cat, Rocket) and textual district label, ensuring 100% usability for colorblind players (Deuteranopia, Protanopia, Tritanopia).
2. **Keyboard Traversal**:
   - `Tab` / `Shift+Tab` cycles between all interactable buttons in logical order.
   - `Space` or `Enter` triggers dice roll, property purchases, and modal confirmations.
   - `Escape` dismisses property inspection cards, rules modal, and non-blocking overlays.
3. **Screen Reader ARIA Live Regions**:
   - `aria-live="polite"` announces turn transitions, moves, and purchases.
   - `aria-live="assertive"` announces Chaos events, bankruptcies, and game over.

---

## 8. QA Verification & Test Architecture (13 Requirements)

ORIGINAL_REQUEST.md explicitly defines 13 strict QA mandates. Below is the complete engineering verification strategy for every requirement:

| Requirement ID | Original Mandate | Verification Strategy | Target Suite |
|---|---|---|---|
| **REQ-01** | Test a complete game from setup to victory | Run simulated multi-round game until only 1 solvent player remains or max rounds reached; verify `status === 'ENDED'` and `winner !== null`. | Vitest + E2E |
| **REQ-02** | Test 2, 3, and 4 player counts | Unit and integration test initialization with 2, 3, and 4 players; verify cash distribution, turn rotation array length, and leaderboard rendering. | Vitest Unit |
| **REQ-03** | Test dice and movement | Test PRNG outputs (1-6 per die), wrap-around board arithmetic (`(pos + roll) % 40`), passing GO bonus ($200M), and double rolls granting extra turn. | Vitest Unit |
| **REQ-04** | Test property purchase and rent | Verify cash deduction on purchase, ownership assignment, rent calculation with/without monopoly, and upgrade rent scaling. | Vitest Unit |
| **REQ-05** | Test Chaos event effects | Verify all 10+ Chaos effect types (`CASH_SELF`, `CASH_ALL`, `CASH_STEAL`, `TELEPORT`, `RENT_MULTIPLIER`, `GO_TO_DETENTION`) apply accurate state modifications. | Vitest Integration |
| **REQ-06** | Test insufficient funds and bankruptcy | Test scenario where player cannot pay rent/tax; verify cash debt, property liquidation (creditor transfer or bank auction), and player removal from turn rotation. | Vitest Integration |
| **REQ-07** | Test turn progression and invalid actions | Reject illegal moves (rolling when not waiting for roll, buying unowned property with insufficient cash, upgrading without monopoly, acting out of turn). | Vitest Unit |
| **REQ-08** | Test restarting a match | Dispatch `RESTART_GAME`; verify state returns to initial clean setup, properties reset to null, player positions to 0, logs cleared. | Vitest Unit |
| **REQ-09** | Test responsive layouts | Verify desktop (1280x800) and mobile (375x667, 390x844) viewports render board without horizontal overflow or button clipping. | Playwright / CSS audit |
| **REQ-10** | Run unit and integration tests | All tests automated via `npm test` (`vitest run`); target 100% pass rate with zero flaky tests. | Vitest Runner |
| **REQ-11** | Run the production build | Verify `npm run build` (`tsc && vite build`) bundles cleanly with 0 TypeScript errors and 0 linting warnings. | CI / CLI Build |
| **REQ-12** | Fix all errors that can reasonably be fixed | Triage and remediate any reducer state bugs, NaN cash values, or UI rendering glitches. | QA Hardening Pass |
| **REQ-13** | Launch the application and verify that it works | Preview server launch (`vite preview`), HTTP 200 verification, browser interaction check. | Launch Smoke Test |

---

## 9. 4-Tier Test Matrix & Automated Test Suite Blueprint

### 9.1 Tier 1: Feature Coverage (Pure Function & Unit Tests)
- `diceEngine.test.ts`:
  - `rollTwoDice()` returns two numbers between 1 and 6.
  - `calculateNewPosition(curr, roll, boardSize)` handles forward move and wrap-around.
  - `passedStart` flag triggers if and only if new index wrapped past start.
- `propertyEngine.test.ts`:
  - `canBuyProperty()` permits purchase when cash >= basePrice and ownerId === null.
  - `canBuyProperty()` rejects purchase when cash < basePrice or already owned.
  - `calculateRent()` doubles rent when full district color group is owned (monopoly).
  - `canUpgradeProperty()` permits upgrade only when owner holds full district monopoly and level < maxLevel.
- `economyEngine.test.ts`:
  - `calculatePlayerNetWorth()` correctly sums cash + basePrice + upgrade investments.
  - `transferCash()` correctly transfers rent between two players and updates stats.
  - `liquidateBankruptPlayer()` reassigns properties to creditor or resets to bank.

### 9.2 Tier 2: Boundary & Corner Cases
- **Cash Boundaries**:
  - Buying property with exact cash amount ($100M price with $100M cash -> $0 balance, solvent).
  - Rent exceeding player cash by $1M triggers bankruptcy flow rather than illegal negative cash state.
- **Movement Boundaries**:
  - Rolling exactly onto tile 0 (Khởi Hành) collects standard salary without double counting.
  - Rolling 12 from tile 38 on a 40-tile board lands precisely on tile 10 (Jail / Visiting).
- **Detention Boundaries**:
  - Rolling 3 consecutive doubles in normal play immediately moves piece to tile 6/10 (Jail) and terminates turn.
  - Rolling a double while in detention immediately pardons player without paying bail.
  - Spending 3 turns in detention forces bail payment or release on turn 3.

### 9.3 Tier 3: Cross-Feature Integration Tests
- **Chaos + Economy Collision**:
  - Player draws `CASH_STEAL` when one opponent has $50M and another has $0M; engine takes only available cash without creating negative balances.
  - Player draws `RENT_MULTIPLIER (2x)` followed by opponent landing on their 3-star property; rent accurately doubles and is credited.
- **Bankruptcy Cascade**:
  - In a 3-player game, Player 2 goes bankrupt to Player 1; Player 1 inherits Player 2's properties. Player 3 then lands on one of the inherited properties; rent is properly directed to Player 1.
- **Victory Condition Resolution**:
  - When Player 2, 3, and 4 go bankrupt, game immediately transitions to `status: 'ENDED'` with Player 1 declared winner.
  - When `roundNumber > maxRounds`, game transitions to `status: 'ENDED'` and selects player with highest net worth.

### 9.4 Tier 4: Real-World E2E Scenarios (Playwright / Simulation)
```typescript
// sample E2E game simulation script structure
describe('E2E Full Match Simulation', () => {
  it('runs complete hot-seat match through game setup, turns, and game over', async () => {
    // 1. Mount application
    // 2. Setup 3 players (Alice, Bob, Chi)
    // 3. Loop turns: roll dice, buy available property, end turn
    // 4. Verify turn rotates Alice -> Bob -> Chi -> Alice
    // 5. Trigger Chaos event modal -> dismiss via continue button
    // 6. Force bankruptcy or advance rounds to limit
    // 7. Verify VictoryModal renders with winner stats and Restart button works
  });
});
```

---

## 10. Implementation Roadmap for UI & QA Engineers

To ensure flawless execution during the implementation phase:

### Phase 1: Engine & State Verification
1. Expand `src/game/__tests__/gameEngine.test.ts` to cover all Tier 1, 2, and 3 tests across all 13 QA requirements.
2. Ensure state reducer strictly validates action legality (guarding against premature rolls, double clicks, and duplicate transactions).

### Phase 2: 2.5D Presentation & Visual Polish
1. Enhance `BoardView.tsx` with dynamic perspective toggling and fluid 60fps CSS 3D transforms.
2. Upgrade `TileComponent.tsx` with Vietnamese landmark imagery, vivid district ribbons, and star level badges.
3. Implement `animateTokenHop` in the UI to give physical weight and delight to token movements.
4. Integrate the complete procedural `soundEffects` synthesizer into every button click, dice roll, purchase, upgrade, and chaos trigger.

### Phase 3: Mobile & Accessibility Hardening
1. Implement bottom-sheet thumb dock for mobile viewports.
2. Verify touch targets >= 48px and audit CSS `@media (prefers-reduced-motion)`.
3. Test keyboard navigation (`Tab`, `Enter`, `Escape`) across all modals and action controls.

### Phase 4: Production Build & Smoke Verification
1. Run `npm test` to verify 100% test pass rate across all suites.
2. Run `npm run build` to verify clean TypeScript compilation and zero-error Vite bundling.
3. Launch development/preview server and execute final end-to-end smoke test.
