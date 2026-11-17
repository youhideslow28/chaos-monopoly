# CHAOS MONOPOLY — LIGHT DESIGN SYSTEM SPECIFICATION

**Milestone:** 02 — Light Design System & Visual Architecture  
**Design Philosophy:** *Realistic Tabletop Board Game & Apple-Inspired Minimalist Clarity*  
**Audience:** Families, casual players, friends  
**Theme Policy:** **Strictly Light Mode Only** (Dark mode toggle eliminated)

---

## 1. Design Philosophy & Foundations

The new visual identity transitions CHAOS MONOPOLY from a dark cyberpunk terminal into an inviting, sunlit tabletop board game. 

### 1.1 Key Principles
- **Daylight Warmth:** Soft natural lighting, warm off-white canvas surfaces, gentle ambient occlusion, and subtle drop shadows.
- **Physical Materiality:** Clean wood grain, crisp ivory cardstock, polished acrylic game tokens, brass trim, and tactile elevation.
- **Visual Restraint (Apple Design Ethos):** Ample breathing room, disciplined typography scale, high contrast without harshness, and eliminating decorative neon clutter.
- **Board-as-Hero:** The 3D board remains the vibrant, colorful centerpiece; all surrounding UI chrome remains quietly functional and semi-translucent.

---

## 2. Color Palette & Semantic Tokens

```
================================================================================
TOKEN                  HEX VALUE        ROLE & USAGE
================================================================================
Surface Ground         #f8fafc          Main canvas background (Slate-50)
Surface Tabletop       #faf8f5          Warm sunlit oak / natural linen tint
Surface Card (Base)    #ffffff          Primary cards, dialogs, drawers
Surface Subtle         #f1f5f9          Secondary wells, tabs, table rows (Slate-100)
Surface Highlight      #e2e8f0          Hover states, dividers, borders (Slate-200)

Text Primary           #0f172a          High-contrast headings & numbers (Slate-900)
Text Secondary         #475569          Supporting descriptions & labels (Slate-600)
Text Tertiary          #94a3b8          Muted timestamps & metadata (Slate-400)
Text Inverse           #ffffff          White text on saturated buttons/badges

Accent Primary         #16a34a          Dominant actions: Roll, Buy, Confirm (Green-600)
Accent Primary Hover   #15803d          Hover active state (Green-700)
Accent Secondary       #0284c7          Navigation, info, links (Sky-600)
Accent Amber           #d97706          Turn alerts, auction bids, cash highlights (Amber-600)
Accent Danger          #dc2626          Bankruptcy, mortgage, debt warning (Red-600)

Border Subtle          #e2e8f0          1px soft card borders
Border Focus           #16a34a          Accessible 2px focus ring
Backdrop Scrim         rgba(15,23,42,0.3) Soft daylight scrim for dialog focus
================================================================================
```

### 2.1 Vibrant District Color Groups (Light-Optimized)
All property color bands use saturated, cheerful tones with $\ge 4.5:1$ contrast against white typography:
- **Ninh Kiều / Cần Thơ (Brown):** `#854d0e` (Cinnamon Wood)
- **Hà Nội / Phố Cổ (Light Blue):** `#0284c7` (Sky Blue)
- **Hồ Gươm / Ba Đình (Pink):** `#db2777` (Rose Cerise)
- **Đà Nẵng / Cầu Vàng (Orange):** `#ea580c` (Tangerine Amber)
- **Huế / Đại Nội (Red):** `#dc2626` (Imperial Crimson)
- **Nha Trang / Biển (Yellow):** `#ca8a04` (Warm Marigold)
- **Sài Gòn / Bến Thành (Green):** `#16a34a` (Emerald Jade)
- **Landmarks / Thủ Thiêm (Dark Blue):** `#1d4ed8` (Royal Cobalt)

---

## 3. Typography Scale & Readability

Family: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display** | $32\text{px} - 40\text{px}$ | Black (900) | 1.15 | Game Victory, Main Menu Logo |
| **Heading 1** | $22\text{px} - 26\text{px}$ | ExtraBold (800) | 1.25 | Modal titles, World announcement |
| **Heading 2** | $16\text{px} - 18\text{px}$ | Bold (700) | 1.35 | Property card names, Action headers |
| **Body Large** | $14\text{px} - 15\text{px}$ | SemiBold (600) | 1.45 | Primary button labels, Cash counters |
| **Body Medium** | $13\text{px}$ | Regular (400) | 1.50 | Game log notifications, Event descriptions |
| **Caption** | $11\text{px} - 12\text{px}$ | Medium (500) | 1.40 | Metadata, turn step counter, small badges |

---

## 4. Standardized Component System

### 4.1 Buttons
- **Primary CTA (`.btn-primary`):** Large ($52\text{px}$ height), rounded-2xl, background `#16a34a` to `#15803d`, text `#ffffff`, shadow `0 4px 14px -2px rgba(22, 163, 74, 0.4)`. High tactile click scale (`active:scale-[0.98]`).
- **Secondary Action (`.btn-secondary`):** White card button, `#ffffff`, border `1px solid #e2e8f0`, text `#1e293b`, hover `bg-slate-50`.
- **Tertiary / Ghost (`.btn-ghost`):** Transparent, text `#475569`, hover `bg-slate-100/80`.
- **Destructive (`.btn-danger`):** Soft rose tint `bg-red-50 text-red-700 border-red-200 hover:bg-red-100`.

### 4.2 Cards & Sheets
- **Floating HUD Cards (`.glass-card-light`):**
  ```css
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border-radius: 1.25rem;
  ```
- **Modal Dialogs:**
  Centered white sheet with soft drop shadow `0 25px 50px -12px rgba(15, 23, 42, 0.18)`, gentle daylight backdrop scrim `rgba(15, 23, 42, 0.35)`.
- **Contextual Bottom Drawer (Mobile):**
  Slide-up white sheet with top rounded corners (`rounded-t-3xl`), thumb drag pill handle, sticky primary CTA.

### 4.3 Player Floating Pills
- Compact white pill capsule showing player token icon, player name, and cash badge (`$1,500M`).
- Active turn player accented with soft emerald ring (`ring-2 ring-emerald-500/80 shadow-md`).

---

## 5. Elimination of Dark-Mode Residuals

1. Removed `color-scheme: dark;` from `:root`.
2. Body background set to `#f8fafc` with text `#0f172a`.
3. Removed dark toggle controls from `HeaderBar.tsx` and `SettingsModal.tsx`.
4. Replaced all dark hardcoded palette values (`#080c14`, `#0d131f`, `rgba(17,24,39,*)`) across 14 modal and HUD components with semantic light tokens.
5. All focus rings updated to accessible `ring-2 ring-emerald-500`.
