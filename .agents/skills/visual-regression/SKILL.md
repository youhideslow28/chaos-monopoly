---
name: visual-regression
description: >-
  Visual regression and snapshot testing for web games and UI components.
  Detect unexpected rendering shifts, canvas discrepancies, and responsive layout breakage.
risk: none
source: community
date_added: "2026-03-01"
---

# Visual Regression Testing

## 1. Visual Testing Strategy
- Snapshot key game states: Initial Board, Active Player Turn, Dice Rolling Animation, Property Card Modal, Chaos Event Banner, Victory Screen.
- Multi-viewport verification: Desktop 1920x1080, Tablet 768x1024, Mobile 375x667.
- Color theme stability: Dark theme contrast, luminous accents, token clarity.

## 2. Playwright Visual Comparison
```typescript
test('should render board accurately on desktop', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.game-board-container')).toHaveScreenshot('board-desktop.png', {
    maxDiffPixelRatio: 0.02,
  });
});
```
