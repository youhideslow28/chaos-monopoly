# CHAOS MONOPOLY — GAMEPLAY UX SIMPLIFICATION
## MILESTONE 04 SPECIFICATION & VERIFICATION

**Objective:** Transform CHAOS MONOPOLY from a complex data-dense interface into a warm, inviting, intuitive family board game.

---

## 1. THE FIVE PILLARS OF THE FAMILY UX OVERHAUL

### Pillar 1: The Dominant Primary Action Principle
- **Problem:** Previously, the action dock presented 4 to 6 competing buttons of identical visual weight (Roll, Trade, Mortgage, Auction, Rules, End Turn), confusing casual players.
- **Solution:** At any moment in the turn lifecycle, **exactly one primary action** is rendered as a dominant, high-contrast, emerald-green button (`#16a34a`):
  - Phase `WAITING_FOR_ROLL`: **LẮC XÚC XẮC** (Roll Dice) is the only prominent button.
  - Phase `ACTION_MENU` (Unowned Property): **MUA ĐẤT** (Buy Property) is the primary CTA; Auction is a secondary subtle option.
  - Phase `ACTION_MENU` (After Actions): **KẾT THÚC LƯỢT** (End Turn) becomes the primary CTA.
  - Phase `DEBT_LIQUIDATION`: **THANH TOÁN NỢ** (Settle Debt) pulses with clear deficit guidance.

### Pillar 2: Board-First Minimalism (80%+ Screen Estate)
- **Problem:** Heavy sidebar event logs and HUD elements cramped the board into less than 50% of the viewport.
- **Solution:**
  - Board container now occupies over 82% of desktop viewport area.
  - Event feed is styled cleanly as a secondary side card on desktop and moves below the fold on mobile.
  - All secondary statistics (mortgage tables, detailed ledgers, trade dialogues) use lightweight slide-over drawers or contextual modal sheets.

### Pillar 3: Contextual Property Sheet
- **Problem:** Clicking a tile previously opened a dark, overwhelming dialog with dozens of cryptic values.
- **Solution:**
  - Modern crisp white linen modal card with clean typography.
  - Clear district status banner showing whether monopoly (x2 rent) is active.
  - Visual district chip indicators showing who owns each sister property in the set.
  - Transparent 5-tier rent breakdown table highlighting the active rent tier.
  - Direct 1-click Buy, Upgrade, Mortgage, and Unmortgage actions.

### Pillar 4: Light Design System Alignment
- **Problem:** Dark neon cyber aesthetics felt abrasive and fatigued players during extended matches.
- **Solution:**
  - Light warm slate canvas (`#f8fafc`).
  - Warm white cards (`#ffffff`) with subtle 1px border (`#e2e8f0`) and soft elevation shadows (`rgba(15, 23, 42, 0.08)`).
  - High-contrast slate typography (`#0f172a` primary, `#64748b` secondary).
  - Emerald primary accents (`#16a34a`) for financial prosperity and positive progression.

### Pillar 5: Family & Casual Accessibility
- **Touch Targets:** All interactive buttons guarantee at least 44x44px touch targets on mobile (with primary CTAs at 48-56px).
- **No Manual Needed:** Clear Vietnamese prompt messages explain the current game state ("Đang ở ô [Tên ô]", "Lượt của bạn", "AI đang suy nghĩ...").
- **Zero Horizontal Overflow:** Guaranteed 100% responsive fluid layout on viewports from 375px to 2560px wide.

---

## 2. VERIFIED EVIDENCE

- **Main Menu:** `docs/evidence/overhaul/01_main_menu_light.png`
- **Dominant CTA Dock:** `docs/evidence/overhaul/09_light_action_dock.png`
- **Contextual Property Sheet:** `docs/evidence/overhaul/10_property_detail_sheet.png`
- **Readable Chaos Event:** `docs/evidence/overhaul/11_chaos_event_card.png`
- **Setup Flow:** `docs/evidence/overhaul/15_game_setup_light.png`
