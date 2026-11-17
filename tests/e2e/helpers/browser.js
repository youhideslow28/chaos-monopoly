import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

let playwrightModule;
try {
  playwrightModule = require('playwright');
} catch {
  const fallbackPath = path.resolve(process.cwd(), '.agents/skills/playwright-e2e/node_modules/playwright');
  playwrightModule = require(fallbackPath);
}

export const { chromium } = playwrightModule;

/**
 * Launch Chromium with preferred system channels: Google Chrome first, then Edge.
 * @param {import('playwright').LaunchOptions} [options]
 */
export async function launchTestBrowser(options = {}) {
  const channels = ['chrome', 'msedge'];
  let lastError = null;

  for (const channel of channels) {
    try {
      const browser = await chromium.launch({
        channel,
        headless: options.headless ?? true,
        slowMo: options.slowMo ?? 0,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--use-gl=angle', // Hardware WebGL support
          ...(options.args || []),
        ],
        ...options,
      });
      return { browser, channel };
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback to default bundled chromium if channels fail
  try {
    const browser = await chromium.launch({
      headless: options.headless ?? true,
      ...options,
    });
    return { browser, channel: 'bundled' };
  } catch {
    throw new Error(`Failed to launch browser with channels chrome/msedge: ${lastError?.message}`);
  }
}

/**
 * Creates a browser context and page instrumented with console error & page error monitoring.
 */
export async function createMonitoredPage(browser, contextOptions = {}) {
  const context = await browser.newContext({
    viewport: contextOptions.viewport || { width: 1280, height: 720 },
    ...contextOptions,
  });

  const page = await context.newPage();
  const consoleMessages = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      // Ignore favicon or non-critical 404s if any
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  return {
    context,
    page,
    getConsoleErrors: () => [...consoleErrors],
    getPageErrors: () => [...pageErrors],
    getAllConsoleMessages: () => [...consoleMessages],
    clearErrors: () => {
      consoleErrors.length = 0;
      pageErrors.length = 0;
    },
    assertNoErrors: () => {
      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        throw new Error(
          `Unexpected errors observed on page:\nConsole Errors: ${JSON.stringify(consoleErrors, null, 2)}\nPage Errors: ${JSON.stringify(pageErrors, null, 2)}`
        );
      }
    },
  };
}
