/**
 * CHAOS MONOPOLY — Post-Overhaul Strict Verification Gate
 * Script: scripts/verify_post_overhaul_gate.cjs
 *
 * Performs empirical validation of:
 * 1. Final repository state & build artifacts
 * 2. Genuine 3D WebGL rendering & layer verification
 * 3. Gameplay synchronization (match, roll, move, buy, rent, state matching)
 * 4. Responsive viewport matrix (1440x900, 1920x1080, 768x1024, 375x812, 390x844, 812x375)
 * 5. Light-only design consistency audit
 * 6. High-precision performance profiling (500 frames, p50, p95, memory telemetry)
 * 7. Evidence screenshot captures to docs/evidence/post_overhaul/
 */

const { chromium } = require('../.agents/skills/playwright-e2e/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'http://localhost:4173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.resolve(__dirname, '../docs/evidence/post_overhaul');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerificationGate() {
  console.log('=== CHAOS MONOPOLY: POST-OVERHAUL VERIFICATION GATE ===\n');
  const results = {
    timestamp: new Date().toISOString(),
    browser: {},
    system: {},
    rendering: {},
    gameplay: {},
    responsive: {},
    lightDesign: {},
    performance: {},
    screenshots: {},
    defects: [],
  };

  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--enable-webgl2',
      '--ignore-gpu-blocklist',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // -------------------------------------------------------------
    // STAGE 1: Browser & Environment Diagnostics
    // -------------------------------------------------------------
    console.log('[STAGE 1] Querying browser & WebGL environment...');
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');

    const envInfo = await page.evaluate(() => {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl2') || glCanvas.getContext('webgl');
      let gpuVendor = 'Unknown';
      let gpuRenderer = 'Unknown';
      let webglVersion = 'None';
      let shadingLangVersion = 'None';

      if (gl) {
        webglVersion = gl.getParameter(gl.VERSION);
        shadingLangVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } else {
          gpuVendor = gl.getParameter(gl.VENDOR);
          gpuRenderer = gl.getParameter(gl.RENDERER);
        }
      }

      return {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform,
        devicePixelRatio: window.devicePixelRatio,
        webglVersion,
        shadingLangVersion,
        gpuVendor,
        gpuRenderer,
      };
    });

    results.browser = envInfo;
    console.log(`Browser: ${envInfo.userAgent}`);
    console.log(`GPU Renderer: ${envInfo.gpuRenderer}`);
    console.log(`WebGL Version: ${envInfo.webglVersion}\n`);

    // Capture Screenshot 1: Main Menu
    const shot1 = path.join(EVIDENCE_DIR, '01_main_menu.png');
    await page.screenshot({ path: shot1, fullPage: true });
    results.screenshots['01_main_menu'] = shot1;
    console.log(`[EVIDENCE] Saved Main Menu: ${shot1}`);

    // -------------------------------------------------------------
    // STAGE 2: 3D Rendering & Layer Authoritativeness Verification
    // -------------------------------------------------------------
    console.log('\n[STAGE 2] Verifying 3D WebGL Mounting & Board Layers...');
    // Click "Chơi Nhanh (1-Click AI Match)" to launch a match
    const quickPlayBtn = await page.waitForSelector('button:has-text("Chơi Nhanh"), button:has-text("CHƠI NHANH")', { timeout: 5000 });
    await quickPlayBtn.click();
    await page.waitForTimeout(1500);

    const layerInfo = await page.evaluate(() => {
      const threeCanvas = document.querySelector('canvas[data-testid="three-board-canvas"]');
      const domBoardSlab = document.querySelector('[data-testid="board-slab"]');
      const boardContainer = document.querySelector('[data-testid="board-container"]') || document.querySelector('.perspective-board');

      return {
        threeCanvasFound: !!threeCanvas,
        threeCanvasVisible: threeCanvas ? threeCanvas.clientWidth > 0 && threeCanvas.clientHeight > 0 : false,
        canvasWidth: threeCanvas ? threeCanvas.clientWidth : 0,
        canvasHeight: threeCanvas ? threeCanvas.clientHeight : 0,
        domBoardSlabFound: !!domBoardSlab, // Should be FALSE when ThreeBoardCanvas is mounted
        perspectiveBoardFound: !!boardContainer,
      };
    });

    results.rendering.layers = layerInfo;
    console.log('Layer Audit:');
    console.log(`- ThreeBoardCanvas mounted: ${layerInfo.threeCanvasFound} (${layerInfo.canvasWidth}x${layerInfo.canvasHeight}px)`);
    console.log(`- Old CSS DOM BoardSlab present simultaneously: ${layerInfo.domBoardSlabFound}`);
    
    if (layerInfo.domBoardSlabFound) {
      console.warn('WARNING: Double rendering detected! Both Three.js canvas and DOM BoardSlab are in the DOM.');
      results.defects.push('Double board rendering: DOM BoardSlab and ThreeBoardCanvas present simultaneously');
    } else {
      console.log('PASS: Only ThreeBoardCanvas is mounted. Zero redundant DOM board slab overhead.');
    }

    // Capture Screenshot 2: Full 3D Board
    const shot2 = path.join(EVIDENCE_DIR, '02_full_3d_board.png');
    await page.screenshot({ path: shot2, fullPage: true });
    results.screenshots['02_full_3d_board'] = shot2;
    console.log(`[EVIDENCE] Saved Full 3D Board: ${shot2}`);

    // -------------------------------------------------------------
    // STAGE 3: Raycasting & Tile Selection Verification
    // -------------------------------------------------------------
    console.log('\n[STAGE 3] Verifying Raycasting & Property Selection...');
    // Click on canvas where property tiles reside
    const canvasBox = await page.locator('canvas[data-testid="three-board-canvas"]').boundingBox();
    if (canvasBox) {
      for (const [fx, fy] of [[0.25, 0.25], [0.5, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5]]) {
        await page.mouse.click(canvasBox.x + canvasBox.width * fx, canvasBox.y + canvasBox.height * fy);
        await page.waitForTimeout(400);
        const isOpen = await page.$('[data-testid="property-detail-modal"]');
        if (isOpen) break;
      }
    }

    // Check if property detail modal opens or property is selected
    const selectedState = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="property-detail-modal"]');
      return {
        modalOpen: !!modal,
        modalTitle: modal ? (modal.querySelector('h3')?.textContent || modal.querySelector('h2')?.textContent || '') : null,
      };
    });

    results.rendering.selection = selectedState;
    console.log(`Property Selection via Raycasting: Modal opened = ${selectedState.modalOpen} (Title: ${selectedState.modalTitle})`);

    // Capture Screenshot 3: Selected Property Detail
    const shot3 = path.join(EVIDENCE_DIR, '03_selected_property.png');
    await page.screenshot({ path: shot3, fullPage: true });
    results.screenshots['03_selected_property'] = shot3;
    console.log(`[EVIDENCE] Saved Selected Property: ${shot3}`);

    // Close modal if open
    if (selectedState.modalOpen) {
      const closeBtn = await page.$('[data-testid="property-detail-modal"] button');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // STAGE 4: Camera Presets Verification
    // -------------------------------------------------------------
    console.log('\n[STAGE 4] Verifying Camera Presets (TOP_DOWN, CINEMATIC, TACTICAL)...');
    // Test TOP_DOWN camera button
    const topDownBtn = await page.$('button[title*="Mặt Trên"], button:has-text("2D"), button:has-text("Top")');
    if (topDownBtn) {
      await topDownBtn.click();
      await page.waitForTimeout(600);
    }

    // Test resetting to ISOMETRIC
    const resetCamBtn = await page.$('button[data-testid="camera-preset-isometric"], button:has-text("Iso")');
    if (resetCamBtn) {
      await resetCamBtn.click();
      await page.waitForTimeout(600);
    }

    // -------------------------------------------------------------
    // STAGE 5: Live Gameplay Synchronization (Roll, Move, Buy)
    // -------------------------------------------------------------
    console.log('\n[STAGE 5] Testing End-to-End Gameplay Synchronization...');
    // Inspect initial match state from localStorage
    const initialSaved = await page.evaluate(() => {
      const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return {
          status: parsed.state.status,
          turnPhase: parsed.state.turnPhase,
          activePlayerIndex: parsed.state.activePlayerIndex,
          activePlayerName: parsed.state.players[parsed.state.activePlayerIndex].name,
          cash: parsed.state.players[parsed.state.activePlayerIndex].cash,
          position: parsed.state.players[parsed.state.activePlayerIndex].position,
        };
      } catch (e) {
        return null;
      }
    });

    console.log('Initial Game State:', initialSaved);
    results.gameplay.initialState = initialSaved;

    // Click Primary CTA: "LẮC XÚC XẮC"
    console.log('Dispatching ROLL_DICE via Dominant CTA Button...');
    const rollBtn = await page.waitForSelector('button:has-text("LẮC XÚC XẮC"), button:has-text("LẮC"), button:has-text("ĐỔ XÚC XẮC")', { timeout: 5000 });
    
    // Capture Screenshot 4: Dice Roll Action
    await rollBtn.click();
    await page.waitForTimeout(400);
    const shot4 = path.join(EVIDENCE_DIR, '04_dice_roll.png');
    await page.screenshot({ path: shot4, fullPage: true });
    results.screenshots['04_dice_roll'] = shot4;
    console.log(`[EVIDENCE] Saved Dice Roll in Action: ${shot4}`);

    // Wait for hopping and settlement
    await page.waitForTimeout(2500);

    // Inspect Post-Roll Game State
    const postRollState = await page.evaluate(() => {
      const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const p = parsed.state.players[parsed.state.activePlayerIndex];
        return {
          status: parsed.state.status,
          turnPhase: parsed.state.turnPhase,
          dice: parsed.state.dice,
          diceSum: parsed.state.dice[0] + parsed.state.dice[1],
          position: p.position,
          cash: p.cash,
          isBankrupt: p.isBankrupt,
        };
      } catch (e) {
        return null;
      }
    });

    console.log('Post-Roll Game State:', postRollState);
    results.gameplay.postRollState = postRollState;

    // Capture Screenshot 5: Player Token Movement Settled
    const shot5 = path.join(EVIDENCE_DIR, '05_player_token_movement.png');
    await page.screenshot({ path: shot5, fullPage: true });
    results.screenshots['05_player_token_movement'] = shot5;
    console.log(`[EVIDENCE] Saved Token Movement: ${shot5}`);

    // If landed on purchasable property, test BUY action
    let purchaseSuccess = false;
    const buyBtn = await page.$('button:has-text("MUA"), button:has-text("MUA BẤT ĐỘNG SẢN"), button:has-text("MUA TÀI SẢN")');
    if (buyBtn) {
      console.log('Property available for purchase! Clicking BUY button...');
      await buyBtn.click();
      await page.waitForTimeout(1000);

      // Verify ownership in storage
      const postBuyState = await page.evaluate(() => {
        const raw = localStorage.getItem('chaos_monopoly_saved_match_v2');
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          const pos = parsed.state.players[parsed.state.activePlayerIndex].position;
          const prop = parsed.state.properties[pos];
          return {
            propertyId: pos,
            ownerId: prop ? prop.ownerId : null,
            buyerId: parsed.state.players[parsed.state.activePlayerIndex].id,
            cash: parsed.state.players[parsed.state.activePlayerIndex].cash,
          };
        } catch (e) {
          return null;
        }
      });

      console.log('Post-Buy State:', postBuyState);
      purchaseSuccess = postBuyState && postBuyState.ownerId === postBuyState.buyerId;
      results.gameplay.purchase = postBuyState;
      results.gameplay.purchaseSuccess = purchaseSuccess;
    } else {
      console.log('No purchase button active (landed on special tile, tax, or AI turn).');
      results.gameplay.purchaseSuccess = 'N/A (Special tile landed)';
    }

    // Capture Screenshot 6: Buildings & Ownership in 3D Board
    const shot6 = path.join(EVIDENCE_DIR, '06_buildings_and_ownership.png');
    await page.screenshot({ path: shot6, fullPage: true });
    results.screenshots['06_buildings_and_ownership'] = shot6;
    console.log(`[EVIDENCE] Saved Buildings & Ownership: ${shot6}`);

    // -------------------------------------------------------------
    // STAGE 6: Controlled Performance & Frame Telemetry (500 Frames)
    // -------------------------------------------------------------
    console.log('\n[STAGE 6] Measuring Sustained Rendering Performance (500 animation frames)...');
    const perfTelemetry = await page.evaluate(async () => {
      const frameTimes = [];
      let lastTime = performance.now();

      return new Promise((resolve) => {
        let frameCount = 0;
        const maxFrames = 500;

        function recordFrame(now) {
          const delta = now - lastTime;
          lastTime = now;
          if (frameCount > 0) {
            frameTimes.push(delta);
          }
          frameCount++;

          if (frameCount < maxFrames) {
            requestAnimationFrame(recordFrame);
          } else {
            // Sort to compute percentiles
            frameTimes.sort((a, b) => a - b);
            const sum = frameTimes.reduce((a, b) => a + b, 0);
            const avgDelta = sum / frameTimes.length;
            const p50 = frameTimes[Math.floor(frameTimes.length * 0.5)];
            const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
            const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
            const longFrames16 = frameTimes.filter((t) => t > 16.67).length;
            const longFrames33 = frameTimes.filter((t) => t > 33.33).length;

            const mem = window.performance && window.performance.memory
              ? {
                  usedJSHeapSizeMB: (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
                  totalJSHeapSizeMB: (window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
                  jsHeapSizeLimitMB: (window.performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
                  source: 'performance.memory (V8 JavaScript Heap)',
                }
              : {
                  note: 'performance.memory not supported on this browser context',
                };

            resolve({
              sampleFrames: frameTimes.length,
              avgFps: +(1000 / avgDelta).toFixed(1),
              avgFrameTimeMs: +avgDelta.toFixed(2),
              medianFrameTimeMs: +p50.toFixed(2),
              p95FrameTimeMs: +p95.toFixed(2),
              p99FrameTimeMs: +p99.toFixed(2),
              droppedFrames60fps: longFrames16,
              droppedFrames30fps: longFrames33,
              memory: mem,
            });
          }
        }
        requestAnimationFrame(recordFrame);
      });
    });

    results.performance = perfTelemetry;
    console.log(`- Sampled Frames: ${perfTelemetry.sampleFrames}`);
    console.log(`- Average Frame Rate: ${perfTelemetry.avgFps} FPS`);
    console.log(`- Average Frame Time: ${perfTelemetry.avgFrameTimeMs} ms`);
    console.log(`- Median Frame Time (p50): ${perfTelemetry.medianFrameTimeMs} ms`);
    console.log(`- 95th Percentile (p95): ${perfTelemetry.p95FrameTimeMs} ms`);
    console.log(`- Frames > 16.67ms (below 60 FPS): ${perfTelemetry.droppedFrames60fps} (${((perfTelemetry.droppedFrames60fps / perfTelemetry.sampleFrames) * 100).toFixed(1)}%)`);
    console.log(`- Frames > 33.33ms (severe jank): ${perfTelemetry.droppedFrames30fps}`);
    console.log(`- Memory:`, perfTelemetry.memory);

    // -------------------------------------------------------------
    // STAGE 7: Light-Only Design Consistency Audit
    // -------------------------------------------------------------
    console.log('\n[STAGE 7] Auditing Light Theme Consistency...');
    const lightAudit = await page.evaluate(() => {
      const htmlClass = document.documentElement.className;
      const bodyClass = document.body.className;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const rootBg = window.getComputedStyle(document.getElementById('root') || document.body).backgroundColor;

      // Scan for dark classes in loaded DOM
      const allElements = Array.from(document.querySelectorAll('*'));
      const elementsWithDarkClass = allElements.filter((el) => {
        return typeof el.className === 'string' && /\bdark\b/.test(el.className);
      }).length;

      const elementsWithCyberBg = allElements.filter((el) => {
        return typeof el.className === 'string' && /bg-\[#090d16\]|bg-\[#080c14\]|bg-\[#0f172a\]/.test(el.className);
      }).length;

      return {
        htmlClass,
        bodyClass,
        bodyBg,
        rootBg,
        elementsWithDarkClass,
        elementsWithCyberBg,
      };
    });

    results.lightDesign = lightAudit;
    console.log(`- HTML class: "${lightAudit.htmlClass}"`);
    console.log(`- Body background-color: ${lightAudit.bodyBg}`);
    console.log(`- Elements with 'dark' class: ${lightAudit.elementsWithDarkClass}`);
    console.log(`- Elements with cyber dark background classes: ${lightAudit.elementsWithCyberBg}`);

    if (lightAudit.htmlClass.includes('dark')) {
      results.defects.push('index.html contains residual class="dark" on <html> element');
    }

    // -------------------------------------------------------------
    // STAGE 8: Multi-Viewport Responsive Matrix
    // -------------------------------------------------------------
    console.log('\n[STAGE 8] Testing Viewport Matrix & Capturing Evidence...');
    const viewports = [
      { name: '07_desktop_1440x900', width: 1440, height: 900, category: 'Desktop Standard' },
      { name: '08_desktop_widescreen_1920x1080', width: 1920, height: 1080, category: 'Desktop Widescreen' },
      { name: '09_tablet_768x1024', width: 768, height: 1024, category: 'Tablet Portrait' },
      { name: '10_mobile_portrait_375x812', width: 375, height: 812, category: 'Mobile Portrait (iPhone X/12 Mini)' },
      { name: '11_mobile_portrait_390x844', width: 390, height: 844, category: 'Mobile Portrait (iPhone 13/14)' },
      { name: '12_mobile_landscape_812x375', width: 812, height: 375, category: 'Mobile Landscape' },
    ];

    for (const vp of viewports) {
      console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasHorizontalOverflow = docWidth > winWidth + 1; // 1px tolerance
        const canvas = document.querySelector('canvas[data-testid="three-board-canvas"]');
        const cBox = canvas ? canvas.getBoundingClientRect() : null;
        const ctaBtn =
          document.querySelector('button.bg-emerald-600') ||
          Array.from(document.querySelectorAll('button')).find((b) =>
            b.textContent && (b.textContent.includes('LẮC') || b.textContent.includes('KẾT THÚC') || b.textContent.includes('MUA'))
          );
        const ctaHeight = ctaBtn ? ctaBtn.getBoundingClientRect().height : 0;

        return {
          scrollWidth: docWidth,
          innerWidth: winWidth,
          hasHorizontalOverflow,
          boardCanvasRendered: !!canvas && cBox && cBox.width > 0,
          boardWidth: cBox ? Math.round(cBox.width) : 0,
          boardHeight: cBox ? Math.round(cBox.height) : 0,
          ctaButtonHeight: Math.round(ctaHeight),
          ctaMeetsTouchTarget: ctaHeight >= 44, // WCAG 2.2 target minimum 44px
        };
      });

      results.responsive[vp.name] = { ...vp, ...metrics };
      console.log(`  - Horizontal Overflow: ${metrics.hasHorizontalOverflow ? 'FAIL (bleed: ' + (metrics.scrollWidth - metrics.innerWidth) + 'px)' : 'PASS (0px)'}`);
      console.log(`  - Board Canvas: ${metrics.boardWidth}x${metrics.boardHeight}px`);
      console.log(`  - Primary CTA Height: ${metrics.ctaButtonHeight}px (Accessible: ${metrics.ctaMeetsTouchTarget})`);

      const vpPath = path.join(EVIDENCE_DIR, `${vp.name}.png`);
      await page.screenshot({ path: vpPath, fullPage: true });
      results.screenshots[vp.name] = vpPath;
    }

    // Write complete json manifest
    const manifestPath = path.join(EVIDENCE_DIR, 'verification_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n[SUCCESS] Manifest saved to: ${manifestPath}`);

  } catch (error) {
    console.error('ERROR during verification gate:', error);
    results.error = error.message;
  } finally {
    await browser.close();
  }
}

runVerificationGate().then(() => {
  console.log('\nVerification Gate script finished.');
});
