# CHAOS MONOPOLY — SCREEN INVENTORY & CONTROL AUDIT

**Milestone:** 01 — Screen Inventory & Simplification Mapping  
**Auditor:** Senior Game UX Architect & UI Lead  
**Scope:** Complete application surface audit across desktop, tablet, and mobile.

---

## 1. Screen & Dialog Inventory

### Screen 1: Main Menu (`MainMenu.tsx`)
- **Current Problem:** High-contrast dark arcade styling, heavy neon outlines, multiple competing cards.
- **Proposed Simplification:** Warm light tabletop theme, prominent "Chơi Ngay / Quick Play" hero card, elegant 3-column mode selection grid, discrete settings and profile access in header.
- **Controls to Keep:**
  - Hero Quick Play button (1-click AI match).
  - Mode cards: "Chơi với AI", "Chơi Chuyền Tay (Local)", "Phòng Online".
  - Saved match resume banner.
  - Active online session reconnect banner.
- **Controls to Merge:**
  - Merge "Thế Giới" (World selection) directly into the Game Setup modal.
- **Controls to Move to Secondary:**
  - Shop, Collection, Profile moved to a tidy user header pill in the top-right.
- **Mobile-Specific Changes:**
  - Stack mode cards vertically into touch-friendly cards ($\ge 56\text{px}$ touch targets).
- **Risks & Mitigation:**
  - Ensure saved match and online reconnect detection handlers remain 100% wired.

---

### Screen 2: Game Setup Modal (`GameSetupModal.tsx`)
- **Current Problem:** Dark form fields, dense modifier sliders, tabs buried inside heavy modal chrome.
- **Proposed Simplification:** Clean white card modal with warm amber accents, intuitive tab segment (`Chơi Cục Bộ`, `Tạo Phòng Online`, `Vào Phòng`), visual player slot list, and expandable "Tùy chỉnh nâng cao" accordion.
- **Controls to Keep:**
  - Tab switcher: Local / Create Online / Join Online.
  - Player slots (human vs AI toggle, name input, token picker, AI personality, AI difficulty).
  - World theme picker.
  - "Bắt đầu ván đấu" primary CTA.
- **Controls to Move to Secondary:**
  - Economic modifiers (starting cash, salary amount, bail cost, max rounds, chaos rate) grouped into a clean collapsible "Luật chơi tùy chỉnh" accordion.
- **Mobile-Specific Changes:**
  - Full-screen sheet with sticky bottom start button.
- **Risks & Mitigation:**
  - All default configuration values (`INITIAL_GAME_CONFIG`) preserved.

---

### Screen 3: In-Game Tabletop & HUD (`App.tsx`, `BoardView.tsx`, `HeaderBar.tsx`)
- **Current Problem:** Board is constricted by permanent top header, leaderboard ribbon, right event feed, and bottom action bar.
- **Proposed Simplification:**
  - **Spacious Board-First Viewport:** 3D board rendered on a sunlit wooden tabletop occupying 80%+ of the screen.
  - **Minimalist Top Bar:** Clean white header pill showing Round indicator, current World name, Mute toggle, and Settings icon.
  - **Floating Player Avatars:** Player status cards float elegantly at the top edges, highlighting the active turn with a gentle warm amber halo.
  - **Collapsible Event Log:** Permanent 80-character side feed moved into a floating slide-over drawer accessible via an unobtrusive event icon with an unread badge.
- **Controls to Keep:**
  - Active round / max rounds indicator.
  - Player balance cards with active turn indicator.
  - 3D board with interactive raycasting.
  - Sound effects toggle.
- **Controls to Remove from Primary:**
  - 2D/3D toggle button (3D board is standard).
  - Permanent side feed (`EventFeed`).
- **Mobile-Specific Changes:**
  - Player balances compressed into a compact horizontal badge header.
  - Smart camera auto-centers on active tile and player pawn.
- **Risks & Mitigation:**
  - All log entries continue recording to `state.logs` for replay and auditability.

---

### Screen 4: Primary Action Dock (`ActionPanel.tsx`)
- **Current Problem:** Displays up to 10 action buttons at once, forcing players to read every button to figure out their turn.
- **Proposed Simplification:**
  - **Dominant Primary Action:** At any given turn moment, exactly ONE large, high-visibility green/emerald action button is presented:
    - *Before roll:* **"ĐỔ XÚC XẮC / ROLL DICE"** (with dice icon).
    - *Unowned tile landed:* **"MUA TÀI SẢN ($[Price]M)"** with price tag.
    - *Turn finished:* **"KẾT THÚC LƯỢT / END TURN"**.
  - **Contextual Secondary Actions:** Secondary management actions (Trade, Mortgage, Build) tucked into a clean "Quản lý / Options" button.
- **Controls to Keep:**
  - Primary context-driven CTA.
  - Turn status indicator badge.
  - Debt resolution CTA (when cash < 0).
  - Detention bail CTA (when in jail).
- **Controls to Merge:**
  - Upgrade, Downgrade, Mortgage, Unmortgage merged into the Property Detail Card sheet.
- **Mobile-Specific Changes:**
  - Floating bottom bar with large thumb-reachable height ($\ge 56\text{px}$).
- **Risks & Mitigation:**
  - Keyboard navigation (Space to roll, Enter to buy/end turn) maintained.

---

### Screen 5: Property Detail Card (`PropertyDetailModal.tsx`)
- **Current Problem:** Full-screen black modal obscures board.
- **Proposed Simplification:**
  - On Desktop: Non-modal floating card docked to right/left of the 3D board.
  - On Mobile: Smooth slide-up bottom drawer with drag handle.
  - Distinct property group banner, houses/hotel visual tokens, clear rent table, and direct "Mua / Mua thêm nhà / Thế chấp" action buttons.
- **Controls to Keep:**
  - Property name, district badge, base price, mortgage value.
  - Tiered rent list (Base, 1 House, 2 Houses, 3 Houses, 4 Houses, Hotel).
  - Action buttons: Buy, Upgrade, Mortgage, Unmortgage.
- **Mobile-Specific Changes:**
  - Swipe-down to dismiss gesture.

---

### Screen 6: Chaos Event Card (`ChaosModal.tsx`)
- **Current Problem:** Neon black card with dense text.
- **Proposed Simplification:**
  - Warm illustrated card drawn in 3D center stage.
  - Large title, thematic icon, concise description, and 1-tap "Tiếp tục / Continue" CTA.

---

### Screen 7: Auction Modal (`AuctionModal.tsx`)
- **Current Problem:** Dark auction console looking like an eBay terminal.
- **Proposed Simplification:**
  - Friendly live bidding room with current highest bidder avatar, animated countdown timer, quick bid increment buttons (`+$10M`, `+$50M`, `+$100M`), and "Bỏ quyền / Pass" button.

---

### Screen 8: Trade Negotiator (`TradeModal.tsx`)
- **Current Problem:** Dense dual-column checkbox lists.
- **Proposed Simplification:**
  - Clean card-exchange table where players drag or tap property chips into the "You Offer" and "You Receive" trays with a visual cash slider.

---

### Screen 9: Victory & Match End (`VictoryModal.tsx`)
- **Current Problem:** Dark leaderboard overlay.
- **Proposed Simplification:**
  - Joyful celebration screen with celebratory confetti, golden trophy for winner, net worth breakdown, and prominent "Chơi Lại" / "Về Menu Chính" CTAs.

---

## 2. Simplification Summary

By implementing this inventory:
- Primary on-screen controls during active gameplay are reduced from **24+ elements to 5 essential elements** (Board, Active Player Pill, Cash Balance, Dominant Action CTA, Menu/Settings toggle).
- Desktop board visual area expands from **~45% to ~85%** of viewport.
- Mobile experience eliminates all horizontal scrolling, modal overlapping, and tiny text.
