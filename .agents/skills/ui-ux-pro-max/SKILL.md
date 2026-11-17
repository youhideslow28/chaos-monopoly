---
name: ui-ux-pro-max
description: >-
  Advanced design patterns, aesthetic system guidelines, visual hierarchy, micro-interactions,
  and immersive HUD/game UX. Use when designing high-polish user interfaces, board game layouts,
  color systems, and tactile game feedback.
risk: none
source: community
date_added: "2026-03-01"
---

# UI/UX Pro Max: Premium Game & Web UI System

## 1. Core Visual Principles
- **Atmospheric Palette**: Deep navy/slate foundations (`#0a0e17`, `#111827`) paired with luminous accents (neon cyan `#00f2fe`, vibrant emerald `#10b981`, electric amber `#f59e0b`, crimson `#ef4444`).
- **Hierarchy & Focal Points**: The primary gameplay board occupies center stage. HUDs, player indicators, and control docks frame the viewport without occluding active tiles.
- **Dimensionality**: Subtle depth layering with rim highlights, soft ambient occlusion shadows (`box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5)`), and clean glassmorphism accents (`backdrop-filter: blur(12px)`).
- **Tactile Feedback**:
  - Hover states with elevation change and soft glow.
  - Active/press states with scale depress (`transform: scale(0.97)`).
  - Sound/visual sync on roll, purchase, upgrade, and chaos trigger.

## 2. Responsive Game Layouts
- **Viewport Framing**: CSS Grid or Flex with container queries (`cqw`, `cqh`) and responsive board scaling (`aspect-ratio: 1/1`).
- **Mobile First Handheld Dock**: Bottom sheet or floating thumb-reachable action bar. Keep dice roll, end turn, and property actions within easy 1-handed thumb arc.
- **Card Overlays**: Non-modal inline drawers or floating tactical cards for property inspections and chaos notifications.

## 3. Micro-Interactions & Polish
- Turn banners with smooth slide-and-fade (`@keyframes bannerSlide`).
- Dynamic cash ticker with rolling number animations (`+150M`, `-50M`).
- Dice roll physics with realistic rotational 3D transforms (`rotateX`, `rotateY`).
- Chaos event alert modals with screen shake or particle burst cues.
