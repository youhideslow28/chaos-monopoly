import { describe, it, expect } from '../helpers/framework.js';
import { openMainMenu, startQuickPlay } from '../helpers/gameActions.js';

describe('Tier 1: Secondary Modals & Warm Ivory Theme System', () => {
  it('should open and close the Rules Modal from HeaderBar', async ({ page, viteUrl, assertNoErrors }) => {
    await startQuickPlay(page, viteUrl);

    // Click Rules button in HeaderBar (by aria-label or BookOpen icon)
    const rulesBtn = page.locator('header button[aria-label*="Luật"], header button[aria-label*="Rules"], header button:has(svg.lucide-book-open)').first();
    await rulesBtn.waitFor({ state: 'visible', timeout: 8000 });
    await rulesBtn.click();

    // Verify Rules modal opens
    const rulesModal = page.locator('[data-testid="rules-modal"]');
    await rulesModal.waitFor({ state: 'visible', timeout: 5000 });
    expect(await rulesModal.isVisible()).toBe(true);

    // Close modal via close button
    const closeBtn = rulesModal.locator('button:has(svg.lucide-x), button:has-text("✕")').first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    expect(await rulesModal.count()).toBe(0);
    assertNoErrors();
  });

  it('should open and close the Profile Modal from MainMenu', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    const profileBtn = page.locator('[data-testid="main-menu-profile-btn"]');
    await profileBtn.waitFor({ state: 'visible', timeout: 8000 });
    await profileBtn.click();

    const profileModal = page.locator('[data-testid="profile-modal"]');
    await profileModal.waitFor({ state: 'visible', timeout: 5000 });
    expect(await profileModal.isVisible()).toBe(true);

    // Close modal
    const closeBtn = profileModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    expect(await profileModal.count()).toBe(0);
    assertNoErrors();
  });

  it('should open and close the Shop Modal from MainMenu', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    const shopBtn = page.locator('[data-testid="main-menu-shop-btn"]');
    await shopBtn.waitFor({ state: 'visible', timeout: 8000 });
    await shopBtn.click();

    const shopModal = page.locator('[data-testid="shop-modal"]');
    await shopModal.waitFor({ state: 'visible', timeout: 5000 });
    expect(await shopModal.isVisible()).toBe(true);

    // Close modal
    const closeBtn = shopModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    expect(await shopModal.count()).toBe(0);
    assertNoErrors();
  });

  it('should open and close the Collection Modal from MainMenu', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    const collectionBtn = page.locator('[data-testid="main-menu-collection-btn"]');
    await collectionBtn.waitFor({ state: 'visible', timeout: 8000 });
    await collectionBtn.click();

    const collectionModal = page.locator('[data-testid="collection-modal"]');
    await collectionModal.waitFor({ state: 'visible', timeout: 5000 });
    expect(await collectionModal.isVisible()).toBe(true);

    // Close modal
    const closeBtn = collectionModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    expect(await collectionModal.count()).toBe(0);
    assertNoErrors();
  });

  it('should enforce Warm Ivory Theme compliance with zero legacy dark mode remnants', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    // R1-F09 requirement: remove class="dark" from <html> and <body>
    const htmlClasses = await page.locator('html').getAttribute('class');
    const bodyClasses = await page.locator('body').getAttribute('class');

    expect(htmlClasses || '').not.toContain('dark');
    expect(bodyClasses || '').not.toContain('dark');

    // Check computed background color of body
    const bodyBg = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      return computed.backgroundColor;
    });

    // Body background should be light ivory (#faf8f5 / #f6f3ec), not pure black (rgb(0, 0, 0) or rgb(15, 23, 42))
    expect(bodyBg).not.toBe('rgb(0, 0, 0)');
    expect(bodyBg).not.toBe('rgb(15, 23, 42)');

    assertNoErrors();
  });

  it('should support language switching between Vietnamese and English in MainMenu', async ({ page, viteUrl, assertNoErrors }) => {
    await openMainMenu(page, viteUrl);

    const langBtn = page.locator('[data-testid="main-menu-lang-btn"]');
    await langBtn.waitFor({ state: 'visible', timeout: 8000 });

    const initialText = await langBtn.innerText();

    // Toggle language
    await langBtn.click();
    await page.waitForTimeout(300);

    const toggledText = await langBtn.innerText();
    expect(toggledText).not.toBe(initialText);

    // Toggle back
    await langBtn.click();
    await page.waitForTimeout(300);

    const restoredText = await langBtn.innerText();
    expect(restoredText).toBe(initialText);

    assertNoErrors();
  });
});
