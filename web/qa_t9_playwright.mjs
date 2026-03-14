import { chromium } from 'playwright';
import path from 'node:path';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T9_snapshot_observability.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dedupe(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

const samples = [];
const start = Date.now();
for (let i = 0; i < 24; i++) {
  const sample = await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.camera-tile')).find(t => t.querySelector('.tile-id')?.textContent?.includes('CAM001'));
    if (!tile) return null;

    const img = tile.querySelector('img.live-image');
    const obs = tile.querySelector('.snapshot-observability');
    const cadence = obs?.querySelector('.cadence-pill')?.textContent?.trim() ?? null;
    const updated = obs?.querySelector('.updated-pill')?.textContent?.trim() ?? null;
    const fallback = obs?.querySelector('.fallback-pill')?.textContent?.trim() ?? null;
    const relay = tile.querySelector('.relay-pill')?.textContent?.trim() ?? null;
    const status = tile.querySelector('.tile-status')?.textContent?.trim() ?? null;

    return {
      ts: Date.now(),
      hasImage: !!img,
      src: img?.getAttribute('src') ?? null,
      cadence,
      updated,
      fallback,
      relay,
      status,
    };
  });
  samples.push(sample);
  await sleep(1000);
}

const firstValid = samples.find(Boolean);
const validSamples = samples.filter(Boolean);

const cadenceValues = dedupe(validSamples.map(s => s.cadence));
const updatedValues = dedupe(validSamples.map(s => s.updated));
const fallbackHits = validSamples.filter(s => s.fallback && s.fallback.includes('FALLBACK ACTIVE')).length;
const relayHits = validSamples.filter(s => s.relay && s.relay.toUpperCase().includes('VIA RELAY')).length;

const firstImageIdx = validSamples.findIndex(s => s.hasImage);
const postFirst = firstImageIdx >= 0 ? validSamples.slice(firstImageIdx) : [];
const blankAfterFirst = postFirst.some(s => !s.hasImage);

const statusSeq = validSamples.map(s => s.status);

await page.getByRole('button', { name: '2x2' }).click();
await sleep(300);

const t18Checks = await page.evaluate(() => {
  const grid = document.querySelector('.camera-grid');
  const tiles = Array.from(document.querySelectorAll('.camera-grid .camera-tile'));
  const statusBadges = tiles.map(t => t.querySelector('.tile-status')?.textContent?.trim()).filter(Boolean);
  return {
    gridClass: grid?.className ?? null,
    tileCount: tiles.length,
    hasStatusBadges: statusBadges.length > 0,
    uniqueStatuses: Array.from(new Set(statusBadges)),
  };
});

await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await sleep(300);
const filteredAfterState = await page.locator('.stat-card.ok strong').first().innerText();

await page.locator('div.filter-block:has(label:text("Area")) select.filter-select').selectOption({ label: 'Shah Alam' });
await sleep(300);
const filteredAfterArea = await page.locator('.stat-card.ok strong').first().innerText();

await page.getByRole('button', { name: 'Clear Filters' }).click();
await sleep(300);
const filteredAfterClear = await page.locator('.stat-card.ok strong').first().innerText();

await page.screenshot({ path: evidencePath, fullPage: true });

const checks = {
  cadenceVisible: cadenceValues.some(v => v?.includes('REFRESH')),
  updatedChangesObserved: updatedValues.length >= 2,
  fallbackIndicatorObserved: fallbackHits > 0 || relayHits > 0,
  stableAfterFirstFrame: !blankAfterFirst,
  t1t8Smoke: t18Checks.tileCount > 0 && t18Checks.hasStatusBadges && filteredAfterClear !== '0',
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

const result = {
  verdict,
  checks,
  elapsedMs: Date.now() - start,
  observability: {
    cadenceValues,
    updatedValuesCount: updatedValues.length,
    updatedValues,
    fallbackHits,
    relayHits,
    blankAfterFirst,
    firstSample: firstValid,
    lastSample: validSamples.at(-1) ?? null,
    statusSeq,
  },
  t1_t8Smoke: {
    gridClass: t18Checks.gridClass,
    tileCount: t18Checks.tileCount,
    hasStatusBadges: t18Checks.hasStatusBadges,
    uniqueStatuses: t18Checks.uniqueStatuses,
    filters: {
      filteredAfterState,
      filteredAfterArea,
      filteredAfterClear
    }
  },
  evidencePath: path.normalize(evidencePath)
};

console.log(JSON.stringify(result, null, 2));
await browser.close();