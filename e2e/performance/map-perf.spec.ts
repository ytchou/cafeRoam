import { test, expect, type CDPSession, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const THROTTLE_CPU_RATE = 4; // 4x slowdown
const SLOW_4G = {
  offline: false,
  downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
  uploadThroughput: (750 * 1024) / 8, // 750 Kbps
  latency: 300, // 300ms RTT
};

const ACCEPTANCE = {
  tileRenderMs: 3000, // < 3s for first tile render (Mapbox load event)
  minFps: 30, // > 30fps during pan/zoom
};

async function collectFps(page: Page, maxFrames: number): Promise<number[]> {
  return page.evaluate((frames: number) => {
    return new Promise<number[]>((resolve) => {
      const fpsSamples: number[] = [];
      let lastTime = performance.now();
      let count = 0;

      function measure(now: number) {
        const delta = now - lastTime;
        if (delta > 0) {
          fpsSamples.push(1000 / delta);
        }
        lastTime = now;
        count++;
        if (count < frames) {
          requestAnimationFrame(measure);
        } else {
          resolve(fpsSamples);
        }
      }
      requestAnimationFrame(measure);
    });
  }, maxFrames);
}

test.describe('Mapbox GL JS performance under throttling', () => {
  test('map tiles render within acceptance criteria', async ({ page }) => {
    const cdp: CDPSession = await page.context().newCDPSession(page);

    try {
      await cdp.send('Emulation.setCPUThrottlingRate', {
        rate: THROTTLE_CPU_RATE,
      });
      await cdp.send('Network.emulateNetworkConditions', SLOW_4G);

      // Inject a timing tracker before navigation — monkey-patches Map construction
      // to capture the Mapbox 'load' event time (fires after initial tiles render)
      await page.addInitScript(`
        window.__mapLoadMs = undefined;
        var _navStart = Date.now();
        var _checkMapbox = setInterval(function() {
          if (!window.mapboxgl || !window.mapboxgl.Map) return;
          clearInterval(_checkMapbox);
          var OrigMap = window.mapboxgl.Map;
          window.mapboxgl.Map = new Proxy(OrigMap, {
            construct: function(target, args) {
              var inst = Reflect.construct(target, args);
              inst.on('load', function() {
                window.__mapLoadMs = Date.now() - _navStart;
              });
              return inst;
            }
          });
        }, 50);
      `);

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Wait for canvas to appear, then check for Mapbox load event timing
      const canvas = page.locator('canvas.mapboxgl-canvas');
      await canvas.waitFor({ state: 'visible', timeout: 15_000 });

      // Wait up to 10s for the load event timing to be set
      await page
        .waitForFunction('() => window.__mapLoadMs !== undefined', {
          timeout: 10_000,
        })
        .catch(() => {}); // If load event never fires, fall back to canvas appearance time

      const tileRenderMs = await page.evaluate(
        (fallback: number) =>
          (window as unknown as { __mapLoadMs?: number }).__mapLoadMs ??
          Date.now() - fallback,
        startTime
      );

      // Simulate a pan gesture while collecting FPS — measures interactive frame rate
      const box = await canvas.boundingBox();

      let panFpsData: number[] = [];
      if (box) {
        // Start FPS collection, perform pan concurrently, then collect results
        const fpsPromise = collectFps(page, 60);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        for (let i = 0; i < 10; i++) {
          await page.mouse.move(
            box.x + box.width / 2 + i * 10,
            box.y + box.height / 2 + i * 5,
            { steps: 2 }
          );
        }
        await page.mouse.up();
        panFpsData = await fpsPromise;
      }

      // Get memory usage (Chrome only)
      const memoryMb = await page.evaluate(() => {
        const perf = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        return perf.memory
          ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
          : null;
      });

      const validFps = panFpsData.filter((f) => f > 0 && f < 200);
      const avgFps =
        validFps.length > 0
          ? Math.round(validFps.reduce((a, b) => a + b, 0) / validFps.length)
          : 0;
      const minFps =
        validFps.length > 0 ? Math.round(Math.min(...validFps)) : 0;

      const results = {
        date: new Date().toISOString(),
        throttling: { cpu: `${THROTTLE_CPU_RATE}x`, network: 'slow-4G' },
        metrics: {
          tileRenderMs,
          avgFps,
          minFps,
          memoryMb,
          frameSamples: validFps.length,
        },
        acceptance: {
          tileRender: tileRenderMs <= ACCEPTANCE.tileRenderMs ? 'PASS' : 'FAIL',
          fps: avgFps >= ACCEPTANCE.minFps ? 'PASS' : 'FAIL',
        },
        pass:
          tileRenderMs <= ACCEPTANCE.tileRenderMs &&
          avgFps >= ACCEPTANCE.minFps,
      };

      const reportsDir = path.join(__dirname, '..', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const dateSlug = new Date().toISOString().slice(0, 10);
      const reportPath = path.join(reportsDir, `map-perf-${dateSlug}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      console.log('=== Map Performance Results ===');
      console.log(
        `Tile render: ${tileRenderMs}ms (limit: ${ACCEPTANCE.tileRenderMs}ms) — ${results.acceptance.tileRender}`
      );
      console.log(
        `Avg FPS: ${avgFps} (limit: ${ACCEPTANCE.minFps}) — ${results.acceptance.fps}`
      );
      console.log(`Min FPS: ${minFps}`);
      console.log(`Memory: ${memoryMb ?? 'N/A'}MB`);
      console.log(`Report: ${reportPath}`);

      // Soft assertions — gather data without gating CI
      expect.soft(tileRenderMs).toBeLessThanOrEqual(ACCEPTANCE.tileRenderMs);
      expect.soft(avgFps).toBeGreaterThanOrEqual(ACCEPTANCE.minFps);
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
      await cdp.detach();
    }
  });
});
