---
name: accessibility-testing
description: >-
  WCAG 2.2 accessibility verification for web-based games and rich interactive applications.
  Includes keyboard navigation, screen reader live regions, focus management, and color contrast.
risk: none
source: community
date_added: "2026-03-01"
---

# Accessibility Testing for Web Games

## 1. Core Board Game Accessibility Checklist
- **Keyboard Navigation**:
  - Full tab traversal for all interactive elements (Dice roll, Buy, Upgrade, Pass turn).
  - Space/Enter activation for game actions.
  - Escape key dismisses modals and property inspector cards.
- **ARIA Live Regions**:
  - `aria-live="polite"` for turn transitions and standard transactions.
  - `aria-live="assertive"` for sudden Chaos Events, bankruptcies, and victory announcements.
- **Contrast & Color Distinction**:
  - Ensure player tokens use distinct symbols/shapes (e.g. Star, Cyber-Bot, Rocket, Crown) in addition to distinctive hues.
  - Property district colors must have clear borders, textual district labels, and icon cues.
