# Project Rules for CHAOS MONOPOLY

## 1. Architectural Integrity
- Keep game logic, rules, and economy state pure and decoupled from React/DOM components.
- State mutations must strictly flow through validated game actions via `gameReducer`.
- All monetary calculations must use non-negative numbers and check solvency before deducting cash.
- Prevent invalid purchases, out-of-turn actions, and duplicate event triggers.

## 2. Visual & UX Standards
- Atmospheric 2.5D / isometric simulated perspective for the board.
- High-contrast, clean typography, vibrant neon-accented cyberpunk/modern metropolis aesthetic.
- Fully responsive layout for desktop and mobile touchscreens.
- Vietnamese as the default language for all UI elements, cards, and dialogue.

## 3. Code Quality
- Strict TypeScript with zero `any` types.
- 100% playable without placeholder buttons or mock data.
- Unit tests for core mechanics (dice, movement, property buying, rent, chaos events, bankruptcy).
