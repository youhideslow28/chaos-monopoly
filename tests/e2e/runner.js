#!/usr/bin/env node

/**
 * CHAOS MONOPOLY — Unified E2E Test Suite Runner
 * Executes Tier 1 (Features), Tier 2 (Boundaries), Tier 3 (Combinations),
 * Tier 4 (Scenarios & Viewports), or all tiers.
 *
 * Usage:
 *   node tests/e2e/runner.js
 *   node tests/e2e/runner.js --tier=1
 *   node tests/e2e/runner.js --tier=2
 *   node tests/e2e/runner.js --tier=3
 *   node tests/e2e/runner.js --tier=4
 *   node tests/e2e/runner.js --filter="dice"
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServers } from './helpers/servers.js';
import { registry, executeSuites } from './helpers/framework.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith('--tier='));
const filterArg = args.find((a) => a.startsWith('--filter='));
const headlessArg = args.find((a) => a.startsWith('--headless='));
const keepServers = args.includes('--keep-servers');

const selectedTier = tierArg ? tierArg.split('=')[1].trim() : 'all';
const filterRegex = filterArg ? new RegExp(filterArg.split('=')[1].trim(), 'i') : null;
const headless = headlessArg ? headlessArg.split('=')[1].trim() !== 'false' : true;

const TIER_MAP = {
  1: [
    './tier1-features/dice_and_turns.spec.js',
    './tier1-features/property_and_board.spec.js',
    './tier1-features/modals_and_theme.spec.js',
    './tier1-features/multiplayer_lifecycle.spec.js',
  ],
  2: [
    './tier2-boundaries/cash_and_bankruptcy.spec.js',
    './tier2-boundaries/interaction_stress.spec.js',
    './tier2-boundaries/network_hazards.spec.js',
  ],
  3: [
    './tier3-combinations/auction_debt_trade.spec.js',
    './tier3-combinations/reconnect_during_ai.spec.js',
  ],
  4: [
    './tier4-scenarios/game_simulation.spec.js',
    './tier4-scenarios/viewport_matrix.spec.js',
  ],
};

async function main() {
  console.log('\n============================================================');
  console.log('🎲 CHAOS MONOPOLY — E2E TEST SUITE RUNNER');
  console.log('============================================================');
  console.log(`Execution Mode: Tier [${selectedTier.toUpperCase()}] | Headless: ${headless}`);

  // 1. Determine files to load
  let specFiles = [];
  if (selectedTier === 'all') {
    specFiles = Object.values(TIER_MAP).flat();
  } else if (TIER_MAP[selectedTier]) {
    specFiles = TIER_MAP[selectedTier];
  } else {
    console.error(`❌ Unknown tier: "${selectedTier}". Valid tiers: 1, 2, 3, 4, all`);
    process.exit(1);
  }

  // 2. Start dev & multiplayer servers
  console.log('🚀 Checking / Starting test servers...');
  const serverUrls = await startServers({ vitePort: 3000, mpPort: 3001 });
  console.log(`✅ Frontend dev server ready: ${serverUrls.viteUrl}`);
  console.log(`✅ Multiplayer server ready: ${serverUrls.mpHttpUrl} (WS: ${serverUrls.mpWsUrl})`);

  let exitCode = 0;

  try {
    // 3. Import spec files to register suites
    registry.clear();
    for (const specRelPath of specFiles) {
      const fullPath = path.resolve(__dirname, specRelPath);
      // Import file dynamically
      await import(`file://${fullPath}`);
    }

    // 4. Run test suites
    const suitesToRun = [...registry.suites];
    const results = await executeSuites({
      suites: suitesToRun,
      serverUrls,
      headless,
      filter: filterRegex,
    });

    // 5. Print summary report
    console.log('\n============================================================');
    console.log('📊 E2E TEST EXECUTION SUMMARY');
    console.log('============================================================');
    console.log(`Total Tests Run:  ${results.total}`);
    console.log(`Passed Tests:     \x1b[32m${results.passed}\x1b[0m`);
    console.log(`Failed Tests:     ${results.failed > 0 ? `\x1b[31m${results.failed}\x1b[0m` : '0'}`);
    console.log(`Skipped Tests:    ${results.skipped}`);
    console.log(`Execution Time:   ${(results.durationMs / 1000).toFixed(2)}s`);
    console.log('============================================================');

    if (results.failed > 0) {
      console.log('\n❌ FAILED TESTS BREAKDOWN:');
      results.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}) [${f.suite}] > ${f.test}`);
        console.log(`   Error: \x1b[31m${f.error}\x1b[0m`);
      });
      exitCode = 1;
    } else {
      console.log('\n✨ ALL E2E TESTS PASSED SUCCESSFULLY! (100% Pass Rate)\n');
      exitCode = 0;
    }
  } catch (err) {
    console.error('\n💥 Fatal test execution error:', err);
    exitCode = 1;
  } finally {
    if (!keepServers) {
      console.log('🛑 Stopping test servers...');
      await serverUrls.stop();
      console.log('👋 Servers stopped.');
    } else {
      console.log('ℹ️ Servers kept running as requested (--keep-servers).');
    }
  }

  process.exit(exitCode);
}

main();
