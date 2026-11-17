# CHAOS MONOPOLY — UI/UX DESIGN SYSTEM

**Document ID:** DOC-DS-001  
**Design Theme:** PREMIUM MINIMALISM + PLAYFUL + CINEMATIC  
**Target Compliance:** WCAG 2.2 Level AA  
**Status:** ACTIVE & STANDARDIZED  

---

## 1. Design Philosophy

`CHAOS MONOPOLY` combines the energetic visual identity of a cyberpunk board game with the restraint and precision of modern premium product design:
- **Cinematic Atmosphere:** Deep dark backgrounds with soft neon volumetric glows (`cyan-500/10`, `fuchsia-600/10`) create spatial depth without clutter.
- **Playful Polish:** Tactile micro-interactions (`active:scale-95`), animated character tokens, rolling 3D dice cubes, and expressive floating emoji reactions bring the board to life.
- **Premium Minimalism:** Clean typography, generous spacing, razor-sharp translucent glass borders (`border-slate-800/80`), and high-contrast badges ensure clarity during chaotic gameplay.

---

## 2. Design Tokens & Palette

### 2.1 Surfaces & Backgrounds
| Token | CSS Value | Usage |
|:---|:---|:---|
| `bg-app` | `#080c14` | Root viewport background |
| `bg-board` | `#0a0e17` | Board center and tile canvas base |
| `bg-surface-elevated` | `rgba(13, 19, 31, 0.95)` | Action dock, header bar, and drawer panels |
| `bg-surface-modal` | `rgba(15, 23, 42, 0.96)` | Modal dialogue windows |
| `border-subtle` | `rgba(30, 41, 59, 0.8)` | Subtle container dividers |
| `border-interactive` | `rgba(51, 65, 85, 0.8)` | Interactive buttons, cards, and input controls |

### 2.2 Accent Neon Palette
| Token | Hex / TailWind | Semantic Usage |
|:---|:---|:---|
| **Neon Cyan** | `#06b6d4` (`cyan-500`) | Primary actions, money gains, active turn markers |
| **Neon Fuchsia** | `#d946ef` (`fuchsia-500`) | AI intelligence, Chaos event cards, special perks |
| **Neon Emerald** | `#10b981` (`emerald-500`) | Property purchases, upgrades, success notifications |
| **Neon Amber** | `#f59e0b` (`amber-500`) | Warnings, detention bail, store coins, dice gold skin |
| **Neon Rose** | `#f43f5e` (`rose-500`) | Rents paid, bankruptcy risks, mortgages, debts |
| **Neon Indigo** | `#6366f1` (`indigo-500`) | Multiplayer networking, player level badges |

### 2.3 District Palette (Board Geometry)
- **District 1 (Old Town):** `#8b5cf6` (Purple)
- **District 2 (Waterfront):** `#06b6d4` (Cyan)
- **District 3 (Commercial):** `#ec4899` (Pink)
- **District 4 (Tech Park):** `#eab308` (Yellow)
- **District 5 (Arts Quarter):** `#f97316` (Orange)
- **District 6 (Diplomatic):** `#ef4444` (Red)
- **District 7 (Financial):** `#10b981` (Emerald)
- **District 8 (Metropolis Core):** `#3b82f6` (Blue)
- **Utilities / Transport:** `#64748b` (Slate)

---

## 3. Typography Scale & Hierarchy

| Element | Class Definition | Weight | Typical Usage |
|:---|:---|:---:|:---|
| **Display Heading** | `text-3xl sm:text-5xl tracking-tight` | 900 (Black) | Main menu title, Victory banner |
| **Modal Header** | `text-xl sm:text-2xl tracking-wide` | 800 (Extrabold) | Dialog titles |
| **Section Title** | `text-sm sm:text-base font-black` | 800 (Extrabold) | District banners, action headers |
| **Body Standard** | `text-xs sm:text-sm text-slate-200` | 500 (Medium) | Descriptions, rules, trade offers |
| **Caption / Badge** | `text-[10px] sm:text-[11px] uppercase` | 700 (Bold) | Tile badges, AI personality tags, timer counters |

---

## 4. Tactile Feedback & Micro-Interactions

### 4.1 Button Interactions
All clickable triggers follow a consistent interactive physics curve:
```css
/* Standard Button Micro-Interaction */
.interactive-btn {
  transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
.interactive-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.interactive-btn:active {
  transform: scale(0.95);
}
```

### 4.2 Neon Glow Shadows
- **Cyan Glow:** `box-shadow: 0 0 20px rgba(6, 182, 212, 0.35);`
- **Emerald Glow:** `box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);`
- **Fuchsia Glow:** `box-shadow: 0 0 20px rgba(217, 70, 239, 0.35);`

---

## 5. Responsive Layout & Mobile Touch Standards

### 5.1 Grid & Viewport Breakpoints
- **Mobile (`< 640px`):** Single-column stacked layout. Action dock sits sticky at the bottom. Event feed folds underneath the board.
- **Tablet (`640px – 1024px`):** 2-column modal layouts; board scales responsively up to `640px` square.
- **Desktop (`>= 1024px`):** Side-by-side view with board on the left/center and event feed as a persistent vertical telemetry monitor on the right.

### 5.2 Mobile Touch Targets
- **Primary Buttons:** Minimum height of `44px` (`min-h-[44px]`).
- **Header Icons:** Minimum tap area of `38px` with generous tap padding.
- **Tile Elements:** Interactive tile cards feature expansive click bounding boxes with clear hover/focus outlines.

---

## 6. Modal Dialog Architecture

All 11 modals strictly adhere to the unified standard:
1. **Universal Dismiss Hook (`useModalDismiss`):**
   - Pressing `Escape` key immediately closes the dialog.
   - Clicking the blurred backdrop dismisses the dialog.
   - Automatic body scroll-locking (`overflow = 'hidden'`) prevents background page shifting.
2. **Accessibility Attributes:**
   - `role="dialog"`
   - `aria-modal="true"`
   - Accessible close buttons with `aria-label="Đóng"`
3. **Z-Index Layering:**
   - Base UI: `z-10`
   - Sticky Header & Action Dock: `z-30`
   - Floating Emote Bar: `z-40`
   - Modal Overlays: `z-50`
   - System Notifications / Alerts: `z-60`
