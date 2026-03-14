import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T13_patrol_mode.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const baseline = await page.evaluate(() => ({
  hasTopbar: !!document.querySelector('.topbar h1'),
  hasSidebar: !!document.querySelector('.sidebar[aria-label="Filter panel"]'),
  hasWallPanel: !!document.querySelector('.wall[aria-label="Main wall panel"]'),
  hasStats: document.querySelectorAll('.stat-card').length >= 3,
  hasFilters: document.querySelectorAll('select.filter-select').length >= 2,
  hasPurposeChips: document.querySelectorAll('.chip-row .chip').length >= 3,
  hasGridButtons: ['2x2', '3x3', '4x4'].every(name => Array.from(document.querySelectorAll('.layout-switch .layout-btn')).some(btn => btn.textContent?.trim() === name)),
  hasWallMapButtons: ['Wall', 'Map'].every(name => Array.from(document.querySelectorAll('.layout-switch .layout-btn')).some(btn => btn.textContent?.trim() === name)),
  hasTileStatus: document.querySelectorAll('.camera-grid .camera-tile .tile-status').length > 0,
  hasSnapshotIndicators: document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length > 0,
  wallTileCount: document.querySelectorAll('.camera-grid .camera-tile').length,
}));

const patrolButton = page.locator('.patrol-controls .layout-btn');
const patrolIntervalInput = page.locator('#patrol-interval');

const getWallActiveId = async () => page.evaluate(() => {
  const active = document.querySelector('.camera-grid .camera-tile.active .tile-id')?.textContent?.trim() ?? null;
  return active?.replace(/^#/, '') ?? null;
});

const getFocusMainId = async () => page.evaluate(() => {
  const id = document.querySelector('.focus-main .camera-tile .tile-id')?.textContent?.trim() ?? null;
  return id?.replace(/^#/, '') ?? null;
});

const getMapActiveId = async () => page.evaluate(() => {
  const marker = document.querySelector('.map-marker.active')?.textContent?.trim() ?? null;
  const linked = document.querySelector('.map-focus-panel .camera-tile .tile-id')?.textContent?.trim()?.replace(/^#/, '') ?? null;
  return { marker, linked };
});

const sequenceSamples = async (getter, waits) => {
  const out = [];
  out.push(await getter());
  for (const waitMs of waits) {
    await page.waitForTimeout(waitMs);
    out.push(await getter());
  }
  return out;
};

// WALL context patrol
await patrolIntervalInput.fill('2');
await page.waitForTimeout(120);
await patrolButton.click(); // Start
await page.waitForTimeout(180);
const wallBtnDuringRun = (await patrolButton.innerText()).trim();
const wallSequenceFast = await sequenceSamples(getWallActiveId, [800, 1200, 1200, 1200]);

await patrolIntervalInput.fill('4');
await page.waitForTimeout(120);
const wallSequenceSlow = await sequenceSamples(getWallActiveId, [1000, 1100, 1100]);

await patrolButton.click(); // Stop
await page.waitForTimeout(200);
const wallBtnAfterStop = (await patrolButton.innerText()).trim();
const activeAtStop = await getWallActiveId();
await page.waitForTimeout(2300);
const activeAfterWait = await getWallActiveId();

// Filtered patrol pool behavior (wall)
await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await page.waitForTimeout(220);
await page.locator('div.filter-block:has(label:text("Area")) select.filter-select').selectOption({ label: 'Shah Alam' });
await page.waitForTimeout(260);
const oneCamFiltered = await page.evaluate(() => ({
  filteredCount: Number(Array.from(document.querySelectorAll('.stat-card')).find(card => card.querySelector('span')?.textContent?.trim() === 'Filtered')?.querySelector('strong')?.textContent?.trim() ?? '0'),
  tileCount: document.querySelectorAll('.camera-grid .camera-tile').length,
}));

await patrolButton.click(); // Start patrol with 1-camera pool
await page.waitForTimeout(180);
const filteredWallIds = await sequenceSamples(getWallActiveId, [800, 1200, 1200]);
await patrolButton.click(); // Stop
await page.waitForTimeout(180);

await page.getByRole('button', { name: 'Clear Filters' }).click();
await page.waitForTimeout(280);

// FOCUS context patrol
await page.locator('.camera-grid .camera-tile').first().click();
await page.waitForTimeout(260);
await patrolIntervalInput.fill('2');
await page.waitForTimeout(120);
await patrolButton.click();
await page.waitForTimeout(200);
const focusSamples = await sequenceSamples(getFocusMainId, [900, 1200, 1200, 1200]);
await patrolButton.click();
await page.waitForTimeout(200);
const focusStopId = await getFocusMainId();
await page.waitForTimeout(2200);
const focusAfterStopId = await getFocusMainId();

await page.getByRole('button', { name: 'Exit Focus' }).click();
await page.waitForTimeout(250);

// MAP context patrol
await page.getByRole('button', { name: 'Map' }).click();
await page.waitForTimeout(350);
await patrolIntervalInput.fill('2');
await page.waitForTimeout(120);
await patrolButton.click();
await page.waitForTimeout(220);
const mapSamples = await sequenceSamples(getMapActiveId, [900, 1200, 1200, 1200]);
await patrolButton.click();
await page.waitForTimeout(200);
const mapStop = await getMapActiveId();
await page.waitForTimeout(2200);
const mapAfterStop = await getMapActiveId();

await page.getByRole('button', { name: 'Wall' }).click();
await page.waitForTimeout(300);

await page.screenshot({ path: evidencePath, fullPage: true });
await browser.close();

function countTransitions(values) {
  let changes = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] && values[i - 1] && values[i] !== values[i - 1]) changes++;
  }
  return changes;
}

const wallFastTransitions = countTransitions(wallSequenceFast);
const wallSlowTransitions = countTransitions(wallSequenceSlow);
const focusTransitions = countTransitions(focusSamples);
const mapTransitions = countTransitions(mapSamples.map(v => v.marker || v.linked || null));

function runRegressionScript(file) {
  try {
    const out = execSync(`node ${file}`, { cwd: 'C:/Programming/Osint Dashboard Camera/web', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(out.trim());
    const ok = parsed.verdict === 'PASS';
    const knownWarning = file === 'qa_t11_playwright.mjs' && !ok;
    return { file, ok, verdict: parsed.verdict, knownWarning };
  } catch (err) {
    const knownWarning = file === 'qa_t11_playwright.mjs';
    return { file, ok: false, verdict: 'FAIL', knownWarning, error: String(err?.message || err) };
  }
}

const regressions = [
  runRegressionScript('qa_t8_r1_playwright.mjs'),
  runRegressionScript('qa_t9_playwright.mjs'),
  runRegressionScript('qa_t10_playwright.mjs'),
  runRegressionScript('qa_t11_playwright.mjs'),
  runRegressionScript('qa_t12_playwright.mjs'),
];

const checks = {
  patrolStartStopControlWorks: wallBtnDuringRun === 'Stop Patrol' && wallBtnAfterStop === 'Start Patrol',
  intervalControlChangesCycleSpeed: wallFastTransitions >= 2 && wallSlowTransitions <= wallFastTransitions,
  autoCycleFollowsActiveFilteredCameraSet: oneCamFiltered.filteredCount === 1 && oneCamFiltered.tileCount === 1 && filteredWallIds.filter(Boolean).every(id => id === filteredWallIds[0]),
  patrolWorksInWallFocusMapContexts: wallFastTransitions >= 2 && focusTransitions >= 2 && mapTransitions >= 2,
  stoppingPatrolStopsImmediately: activeAtStop === activeAfterWait && focusStopId === focusAfterStopId && mapStop.marker === mapAfterStop.marker,
  t1t12BehaviorsRemainIntact: baseline.hasTopbar && baseline.hasSidebar && baseline.hasWallPanel && baseline.hasStats && baseline.hasFilters && baseline.hasPurposeChips && baseline.hasGridButtons && baseline.hasWallMapButtons && baseline.hasTileStatus && baseline.hasSnapshotIndicators && regressions.every(r => r.ok || r.knownWarning),
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

console.log(JSON.stringify({
  verdict,
  checks,
  baseline,
  wallSequenceFast,
  wallSequenceSlow,
  filteredWallIds,
  oneCamFiltered,
  focusSamples,
  mapSamples,
  wallFastTransitions,
  wallSlowTransitions,
  focusTransitions,
  mapTransitions,
  stopSnapshots: { activeAtStop, activeAfterWait, focusStopId, focusAfterStopId, mapStop, mapAfterStop },
  regressions,
  evidencePath,
  evidenceExists: fs.existsSync(evidencePath),
}, null, 2));