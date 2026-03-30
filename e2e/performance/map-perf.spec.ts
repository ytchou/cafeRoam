import { test, expect, type CDPSession } from '@playwright/test';
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
  tileRenderMs: 3000, // < 3s for first tile render
  minFps: 30, // > 30fps during pan/zoom
};

test.describe('Mapbox GL JS performance under throttling', () => {
  let cdp: CDPSession;

  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
    // Throttle CPU
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: THROTTLE_CPU_RATE,
    });
    // Throttle network
    await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
  });

  test.afterEach(async () => {
    // Reset throttling
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
    await cdp.detach();
  });

  test('map tiles render within acceptance criteria', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to Find page (map view is default)
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for Mapbox canvas to appear (indicates map has started rendering)
    const canvas = page.locator('canvas.mapboxgl-canvas');
    await canvas.waitFor({ state: 'visible', timeout: 15_000 });
    const tileRenderMs = Date.now() - startTime;

    // Measure FPS during pan interaction
    const fpsData = await page.evaluate(async () => {
      return new Promise<number[]>((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        const maxFrames = 60; // Collect ~2s of frame data at 30fps

        function measure(now: number) {
          const delta = now - lastTime;
          if (delta > 0) {
            frames.push(1000 / delta);
          }
          lastTime = now;
          frameCount++;
          if (frameCount < maxFrames) {
            requestAnimationFrame(measure);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(measure);
      });
    });

    // Simulate a pan gesture
    const box = await canvas.boundingBox();
    if (box) {
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
    }

    // Measure FPS during pan
    const panFpsData = await page.evaluate(async () => {
      return new Promise<number[]>((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        const maxFrames = 30;

        function measure(now: number) {
          const delta = now - lastTime;
          if (delta > 0) {
            frames.push(1000 / delta);
          }
          lastTime = now;
          frameCount++;
          if (frameCount < maxFrames) {
            requestAnimationFrame(measure);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(measure);
      });
    });

    // Get memory usage (Chrome only)
    const memoryMb = await page.evaluate(() => {
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number };
      };
      return perf.memory
        ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
        : null;
    });

    // Calculate metrics
    const allFps = [...fpsData, ...panFpsData].filter((f) => f > 0 && f < 200);
    const avgFps =
      allFps.length > 0
        ? Math.round(allFps.reduce((a, b) => a + b, 0) / allFps.length)
        : 0;
    const minFps = allFps.length > 0 ? Math.round(Math.min(...allFps)) : 0;

    const results = {
      date: new Date().toISOString(),
      throttling: { cpu: `${THROTTLE_CPU_RATE}x`, network: 'slow-4G' },
      metrics: {
        tileRenderMs,
        avgFps,
        minFps,
        memoryMb,
        frameSamples: allFps.length,
      },
      acceptance: {
        tileRender:
          tileRenderMs <= ACCEPTANCE.tileRenderMs ? 'PASS' : 'FAIL',
        fps: avgFps >= ACCEPTANCE.minFps ? 'PASS' : 'FAIL',
      },
      pass:
        tileRenderMs <= ACCEPTANCE.tileRenderMs &&
        avgFps >= ACCEPTANCE.minFps,
    };

    // Write results to file
    const reportsDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const dateSlug = new Date().toISOString().slice(0, 10);
    const reportPath = path.join(reportsDir, `map-perf-${dateSlug}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log('=== Map Performance Results ===');
    console.log(`Tile render: ${tileRenderMs}ms (limit: ${ACCEPTANCE.tileRenderMs}ms) — ${results.acceptance.tileRender}`);
    console.log(`Avg FPS: ${avgFps} (limit: ${ACCEPTANCE.minFps}) — ${results.acceptance.fps}`);
    console.log(`Min FPS: ${minFps}`);
    console.log(`Memory: ${memoryMb ?? 'N/A'}MB`);
    console.log(`Report: ${reportPath}`);

    // Soft assertions — log but don't fail the test run
    // The purpose is to gather data, not gate CI
    expect.soft(tileRenderMs).toBeLessThanOrEqual(ACCEPTANCE.tileRenderMs);
    expect.soft(avgFps).toBeGreaterThanOrEqual(ACCEPTANCE.minFps);
  });
});
