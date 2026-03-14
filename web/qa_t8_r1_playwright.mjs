import { chromium } from 'playwright';
import path from 'node:path';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T8_R1_badge_2x2_filters.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function summarizeTransitions(samples) {
  const seq = samples.map(s => s?.status).filter(Boolean);
  const firstOnline = seq.indexOf('ONLINE');
  const firstDegradedOrOffline = seq.findIndex(s => s === 'DEGRADED' || s === 'OFFLINE');
  const recoverOnline = seq.findIndex((s, i) => i > firstDegradedOrOffline && s === 'ONLINE');
  const hasTrip = firstOnline !== -1 && firstDegradedOrOffline !== -1 && recoverOnline !== -1;
  const hasDegradedBeforeOffline = (() => {
    const d = seq.indexOf('DEGRADED');
    const o = seq.indexOf('OFFLINE');
    return d !== -1 && o !== -1 && d < o;
  })();
  return { seq, hasTrip, hasDegradedBeforeOffline, firstOnline, firstDegradedOrOffline, recoverOnline };
}

const badgeSamples = [];
const tStart = Date.now();
for (let i = 0; i < 22; i++) {
  const sample = await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.camera-tile')).find(t => t.querySelector('.tile-id')?.textContent?.includes('CAM001'));
    if (!tile) return null;
    const status = tile.querySelector('.tile-status')?.textContent?.trim() ?? null;
    const img = tile.querySelector('img.live-image');
    return {
      ts: Date.now(),
      status,
      hasImage: !!img,
      src: img?.getAttribute('src') ?? null,
    };
  });
  badgeSamples.push(sample);
  await sleep(1000);
}
const elapsedMs = Date.now() - tStart;
const transition = summarizeTransitions(badgeSamples);

await page.getByRole('button', { name: '2x2' }).click();
await sleep(500);

const gridCheck = await page.evaluate(() => {
  const grid = document.querySelector('.camera-grid');
  const tiles = Array.from(document.querySelectorAll('.camera-grid .camera-tile'));
  return {
    gridClass: grid?.className ?? null,
    tileCount: tiles.length,
    ids: tiles.map(t => t.querySelector('.tile-id')?.textContent?.trim() ?? '')
  };
});

await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await sleep(350);
const filteredAfterState = await page.locator('.stat-card.ok strong').first().innerText();

await page.locator('div.filter-block:has(label:text("Area")) select.filter-select').selectOption({ label: 'Shah Alam' });
await sleep(350);
const filteredAfterArea = await page.locator('.stat-card.ok strong').first().innerText();

await page.getByRole('button', { name: 'Clear Filters' }).click();
await sleep(350);
const filteredAfterClear = await page.locator('.stat-card.ok strong').first().innerText();

await page.screenshot({ path: evidencePath, fullPage: true });

const checks = {
  hasTransitionTrip: transition.hasTrip,
  hasVisibleStatuses: transition.seq.length > 0,
  grid2x2Visible: gridCheck.gridClass?.includes('grid-2x2') && gridCheck.tileCount === 4,
  filtersReact: filteredAfterState !== filteredAfterClear && filteredAfterArea !== filteredAfterClear,
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

const result = {
  verdict,
  checks,
  elapsedMs,
  transition,
  badgeSamples: badgeSamples.map(s => s ? ({ ts: s.ts, status: s.status, hasImage: s.hasImage }) : null),
  gridCheck,
  filters: {
    filteredAfterState,
    filteredAfterArea,
    filteredAfterClear
  },
  evidencePath: path.normalize(evidencePath)
};

console.log(JSON.stringify(result, null, 2));
await browser.close();