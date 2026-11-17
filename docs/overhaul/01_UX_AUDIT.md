# CHAOS MONOPOLY — UX AUDIT & SIMPLIFICATION PLAN

**Milestone:** 01 — Product Audit & UX Simplification Plan  
**Target Architecture:** Realistic 3D Board Game & Family UX Overhaul  
**Target Audience:** Families, friends, casual board game players  
**Core Principle:** *The game should feel like a family board game, not a complex management dashboard.*

---

## 1. Executive Problem Statement

The previous iteration of CHAOS MONOPOLY introduced deep gameplay features (economy, trading, auctions, AI personalities, multi-world packs, online multiplayer, cosmetics) and a dark-mode 2.5D presentation. However, the user experience suffers from several key friction points:

1. **Information Overload:** The screen concurrently displays top header bars, player ribbons, 40-tile board, right-hand 80-character audit log sidebar, bottom sticky action dock with up to 10 simultaneous buttons, and floating camera controls.
2. **Dashboard Visual Vernacular:** Dark backgrounds (`#080c14`), dense black glassmorphic panels, and neon cyan accents read like a financial trading platform or crypto dashboard rather than a warm, welcoming tabletop board game.
3. **Competing Call-to-Actions:** During turns, players are presented with multiple active buttons (`Đổ xúc xắc`, `Mua tài sản`, `Thế chấp`, `Nâng cấp`, `Giao dịch`, `Kết thúc lượt`) instead of a single, unmistakable primary action guiding the turn forward.
4. **Mobile Squish:** On smartphone screens, desktop panels (event feed, leaderboard ribbon, wide action dock) compress the board, reducing the primary game surface to a small fraction of the viewport.
5. **Camera Over-Complexity:** Exposing raw pitch/yaw adjustments and multiple manual camera controls creates confusion for casual family players.

---

## 2. Screen-by-Screen Audit & Transformation Strategy

### 2.1 Main Menu (`MainMenu.tsx`)
- **Current State:** Dark gradient background, multiple stacked cards, heavy neon outlines.
- **Problem:** Looks like an arcade video game client.
- **Overhaul Strategy:**
  - Transform into a clean, sunlit wooden tabletop scene.
  - Crisp white cards with warm, tactile shadows (`box-shadow: 0 10px 25px -4px rgba(0,0,0,0.06)`).
  - Prominent "Chơi Ngay / Quick Play" hero button with friendly typography.
  - Secondary modes (Vs AI, Pass & Play, Online Room) arranged in a balanced, self-explanatory 3-column grid.
  - Saved match detected with a welcoming, non-intrusive resume card.

### 2.2 In-Game Layout & Viewport (`App.tsx` & `BoardView.tsx`)
- **Current State:** Board squeezed between top header, player ribbon, right sidebar (`EventFeed`), and bottom dock (`ActionPanel`).
- **Problem:** Board only occupies ~45% of screen area. Event feed clutters desktop and pushes board off-screen on mobile.
- **Overhaul Strategy:**
  - **Board-First Focus:** Expand the 3D tabletop board to occupy 80%+ of available viewport.
  - **Collapsible Event Log:** Move the persistent right-side event log into a sleek, floating slide-over drawer accessible via a subtle bell/history icon.
  - **Floating Player Avatars:** Replace the rigid horizontal player ribbon with compact, elegant player pill cards floating around the perimeter of the tabletop.

### 2.3 Action Dock & Turn Flow (`ActionPanel.tsx`)
- **Current State:** Sticky bottom bar with 8–10 buttons displayed simultaneously.
- **Problem:** High cognitive load. Players have to hunt for what they are supposed to do.
- **Overhaul Strategy:**
  - **Dominant Primary Action Principle:** At any point in time, display ONE large, inviting primary action button in the player's natural thumb zone:
    - Phase `ROLLING`: **"ĐỔ XÚC XẮC / ROLL DICE"** (prominent green/emerald button).
    - Phase `BUY_DECISION`: **"MUA BẤT ĐỘNG SẢN / BUY PROPERTY"** with clear price badge, alongside a clean secondary "Bỏ qua / Pass" text link.
    - Phase `ACTION_MENU` / Turn Done: **"KẾT THÚC LƯỢT / END TURN"**.
  - **Contextual Actions Menu:** Move secondary management actions (Mortgage, Downgrade, Trade) into a clean "Quản lý / Manage" contextual popover sheet.

### 2.4 Property Detail & Inspection (`PropertyDetailModal.tsx`)
- **Current State:** Full-screen modal overlay with dark semi-transparent backdrop obscuring the board completely.
- **Problem:** Breaks spatial context; players can't see where the property sits on the board relative to other players.
- **Overhaul Strategy:**
  - Transform into an elegant, tactile **Property Card Sheet**:
    - On Desktop: Floating card docking to the side of the 3D board without blocking camera view.
    - On Mobile: Smooth slide-up bottom sheet with clear swipe-to-dismiss gesture.
    - Illustrated district header, clear rent list, and direct "Xây Nhà / Upgrade" action button.

### 2.5 Chaos Events (`ChaosModal.tsx`)
- **Current State:** Neon glowing box with technical rule text.
- **Problem:** Feels sterile and text-heavy.
- **Overhaul Strategy:**
  - Present as a beautiful, physical illustrated event card drawn from a physical deck in 3D center plaza.
  - Friendly icon, clear title, 1-sentence impact description, and 1-tap "Tiếp tục / Continue" resolution.

---

## 3. Control Classification Inventory

| Control | Category | Target Placement | Justification |
|---|:---:|---|---|
| **Roll Dice Button** | **A. Essential** | Primary Action Dock | Main mechanic of the turn. |
| **Buy Property Button** | **A. Essential** | Primary Action Dock (Contextual) | Primary decision on landing on unowned tile. |
| **End Turn Button** | **A. Essential** | Primary Action Dock | Advances turn to next player. |
| **Active Player Indicator** | **A. Essential** | Top-left floating pill | Essential turn awareness. |
| **Player Balances** | **A. Essential** | Player cards / pills | Core financial state. |
| **3D Board & Tiles** | **A. Essential** | Center viewport (Hero) | Heart of the board game experience. |
| **Property Card Inspection** | **B. Contextual** | Slide-out side card / Bottom sheet | Appears on tile tap or landing. |
| **Auction Bidding Dock** | **B. Contextual** | Central overlay card | Only during active auction. |
| **Trade Negotiator** | **B. Contextual** | Dedicated clean modal | Only when proposing or reviewing trades. |
| **Debt Resolution / Bail** | **B. Contextual** | Focused modal sheet | Only when in debt or detention. |
| **Chaos Event Card** | **B. Contextual** | Animated card reveal | Only on chaos tile landing. |
| **Game Event Log** | **C. Secondary** | Slide-over drawer | Accessible on demand via notification icon. |
| **Sound / Language Toggles** | **C. Secondary** | Settings menu modal | Configured once, rarely changed during play. |
| **Detailed Rent Tables** | **C. Secondary** | Property card sub-tab | Contextual details on property selection. |
| **AI Speed Preset** | **C. Secondary** | Settings dropdown | Default Normal is balanced for casual play. |
| **Raw Ledger Audit Trail** | **D. Technical** | Internal game engine | Preserved for state verification, hidden from UI. |
| **2D/3D Mode Toggle** | **E. Redundant** | Removed | 3D board with smart camera is universal default. |
| **Duplicate Restart Buttons** | **E. Redundant** | Merged into Settings | Single safe restart with confirmation. |

---

## 4. Implementation Phasing & Risks

1. **Light Mode Conversion:** Must replace all dark CSS utility classes (`bg-[#080c14]`, `text-slate-100`, etc.) with semantic light tokens (`bg-slate-50`, `bg-white`, `text-slate-800`, `text-slate-900`) without breaking contrast or accessibility.
2. **State Decoupling:** The UI simplification must NOT modify the underlying `gameReducer` actions or remove any capability (buying, trading, mortgaging, upgrading). All actions remain fully dispatchable.
3. **True 3D Board Integration:** Three.js rendering layer will be introduced cleanly to render the board on a wooden tabletop with dynamic lighting, replacing CSS-only slabs while retaining identical tile data and interaction hooks.
