import { launchTestBrowser, createMonitoredPage } from './browser.js';
import { expect } from './assertions.js';

class TestRegistry {
  constructor() {
    this.currentSuite = null;
    this.suites = [];
    this.totalTests = 0;
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeAllFns: [],
      afterAllFns: [],
      beforeEachFns: [],
      afterEachFns: [],
    };
    this.suites.push(suite);
    const prev = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = prev;
  }

  it(name, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {});
    }
    this.currentSuite.tests.push({
      name,
      fn,
      timeout: options.timeout || 60000,
      skip: options.skip || false,
    });
    this.totalTests++;
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllFns.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllFns.push(fn);
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachFns.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachFns.push(fn);
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
  }
}

export const registry = new TestRegistry();

export function describe(name, fn) {
  registry.describe(name, fn);
}

export function it(name, fn, options) {
  registry.it(name, fn, options);
}

export const test = it;
export { expect };

export function beforeAll(fn) {
  registry.beforeAll(fn);
}

export function afterAll(fn) {
  registry.afterAll(fn);
}

export function beforeEach(fn) {
  registry.beforeEach(fn);
}

export function afterEach(fn) {
  registry.afterEach(fn);
}

/**
 * Executes all registered suites with the provided environment config.
 */
export async function executeSuites({
  suites,
  serverUrls,
  headless = true,
  slowMo = 0,
  filter = null,
}) {
  const { viteUrl, mpWsUrl, mpHttpUrl } = serverUrls;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    failures: [],
  };

  const startTime = Date.now();

  // Launch a shared browser instance for the run
  const { browser, channel } = await launchTestBrowser({ headless, slowMo });
  console.log(`🌐 Playwright browser launched using [channel: ${channel}, headless: ${headless}]`);

  for (const suite of suites) {
    console.log(`\n📦 Suite: \x1b[1m\x1b[36m${suite.name}\x1b[0m`);

    // Run beforeAll hooks
    for (const hook of suite.beforeAllFns) {
      await hook({ browser, viteUrl, mpWsUrl, mpHttpUrl });
    }

    for (const testCase of suite.tests) {
      if (filter && !suite.name.match(filter) && !testCase.name.match(filter)) {
        continue;
      }

      if (testCase.skip) {
        results.total++;
        results.skipped++;
        console.log(`   \x1b[33m- [SKIP]\x1b[0m ${testCase.name}`);
        continue;
      }

      results.total++;
      const testStart = Date.now();

      // Setup per-test monitored page
      const monitored = await createMonitoredPage(browser);
      const testContext = {
        browser,
        context: monitored.context,
        page: monitored.page,
        viteUrl,
        mpWsUrl,
        mpHttpUrl,
        getConsoleErrors: monitored.getConsoleErrors,
        getPageErrors: monitored.getPageErrors,
        getAllConsoleMessages: monitored.getAllConsoleMessages,
        clearErrors: monitored.clearErrors,
        assertNoErrors: monitored.assertNoErrors,
      };

      try {
        // Run beforeEach hooks
        for (const hook of suite.beforeEachFns) {
          await hook(testContext);
        }

        // Run test with timeout
        await Promise.race([
          testCase.fn(testContext),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timed out after ${testCase.timeout}ms`)), testCase.timeout)
          ),
        ]);

        // Run afterEach hooks
        for (const hook of suite.afterEachFns) {
          await hook(testContext);
        }

        const duration = Date.now() - testStart;
        results.passed++;
        console.log(`   \x1b[32m✓\x1b[0m ${testCase.name} \x1b[90m(${duration}ms)\x1b[0m`);
      } catch (err) {
        const duration = Date.now() - testStart;
        results.failed++;
        console.error(`   \x1b[31m✗\x1b[0m ${testCase.name} \x1b[90m(${duration}ms)\x1b[0m`);
        console.error(`     \x1b[31mError: ${err.message}\x1b[0m`);
        if (err.stack) {
          const firstStack = err.stack.split('\n').slice(1, 4).join('\n');
          console.error(`     \x1b[90m${firstStack}\x1b[0m`);
        }
        results.failures.push({
          suite: suite.name,
          test: testCase.name,
          error: err.message,
          stack: err.stack,
        });
      } finally {
        try {
          await monitored.page.close().catch(() => {});
          await monitored.context.close().catch(() => {});
        } catch {
          // Ignore close errors
        }
      }
    }

    // Run afterAll hooks
    for (const hook of suite.afterAllFns) {
      await hook({ browser, viteUrl, mpWsUrl, mpHttpUrl });
    }
  }

  await browser.close().catch(() => {});
  results.durationMs = Date.now() - startTime;
  return results;
}
