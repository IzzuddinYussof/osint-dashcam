import { chromium } from 'playwright';
import fs from 'node:fs';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T11_map_mode.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

const baselineWall = await page.evaluate(() => ({
  hasWallBtn: Array.from(document.querySelectorAll('.layout-switch .layout-btn')).some(btn => btn.textContent?.trim() === 'Wall'),
  hasMapBtn: Array.from(document.querySelectorAll('.layout-switch .layout-btn')).some(btn => btn.textContent?.trim() === 'Map'),
  wallTileCount: document.querySelectorAll('.camera-grid .camera-tile').length,
  hasFilterPanel: !!document.querySelector('.sidebar[aria-label="Filter panel"]'),
  hasStats: document.querySelectorAll('.stat-card').length >= 3,
  hasStatusBadges: document.querySelectorAll('.camera-grid .camera-tile .tile-status').length > 0,
  hasSnapshotIndicators: document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length > 0,
}));

await page.getByRole('button', { name: 'Map' }).click();
await page.waitForTimeout(450);

const mapInitial = await page.evaluate(() => {
  const heading = document.querySelector('.wall-header h2')?.textContent?.trim() ?? '';
  const markers = Array.from(document.querySelectorAll('.map-marker'));
  const markerPositions = markers.slice(0, 5).map(m => ({ left: m.style.left, top: m.style.top }));
  const focusNote = document.querySelector('.map-focus-note')?.textContent?.trim() ?? null;
  const emptyPrompt = document.querySelector('.map-focus-panel .no-results p')?.textContent?.trim() ?? null;
  return {
    heading,
    markerCount: markers.length,
    markerPositions,
    hasMapContainer: !!document.querySelector('.malaysia-map'),
    hasFocusPanel: !!document.querySelector('.map-focus-panel'),
    focusNote,
    emptyPrompt,
  };
});

const firstMarker = page.locator('.map-marker').first();
await firstMarker.click({ force: true });
await page.waitForTimeout(350);

const mapAfterClick = await page.evaluate(() => {
  const activeMarker = document.querySelector('.map-marker.active');
  const activeMarkerId = activeMarker?.textContent?.trim() ?? null;
  const linkedTileIdRaw = document.querySelector('.map-focus-panel .camera-tile .tile-id')?.textContent?.trim() ?? null;
  const linkedTileId = linkedTileIdRaw?.replace(/^#/, '') ?? null;
  const linkedTileExists = !!document.querySelector('.map-focus-panel .camera-tile');
  return { activeMarkerId, linkedTileId, linkedTileExists };
});

// Filter regression check while in map mode
await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Johor' });
await page.waitForTimeout(300);
const mapAfterFilter = await page.evaluate(() => {
  const markerCount = document.querySelectorAll('.map-marker').length;
  const filteredStat = Array.from(document.querySelectorAll('.stat-card')).find(card => card.querySelector('span')?.textContent?.trim() === 'Filtered')?.querySelector('strong')?.textContent?.trim() ?? null;
  const linkedLocation = document.querySelector('.map-focus-panel .camera-tile .tile-location')?.textContent?.trim() ?? null;
  return { markerCount, filteredStat, linkedLocation };
});

await page.getByRole('button', { name: 'Wall' }).click();
await page.waitForTimeout(350);

const wallAfterReturn = await page.evaluate(() => {
  const stateSelect = document.querySelectorAll('select.filter-select')[0];
  return {
    heading: document.querySelector('.wall-header h2')?.textContent?.trim() ?? '',
    wallTileCount: document.querySelectorAll('.camera-grid .camera-tile').length,
    selectedState: (stateSelect && 'value' in stateSelect) ? stateSelect.value : '',
    hasStatusBadges: document.querySelectorAll('.camera-grid .camera-tile .tile-status').length > 0,
    hasSnapshotIndicators: document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length > 0,
  };
});

await page.screenshot({ path: evidencePath, fullPage: true });

const checks = {
  wallMapSwitchExistsAndWorks: baselineWall.hasWallBtn && baselineWall.hasMapBtn && mapInitial.heading.includes('Malaysia Map Mode') && wallAfterReturn.heading.includes('Camera Wall'),
  malaysiaMapRendersWithMarkers: mapInitial.hasMapContainer && mapInitial.markerCount > 0 && mapInitial.markerPositions.every(p => p.left.endsWith('%') && p.top.endsWith('%')),
  clickMarkerOpensLinkedCameraPanel: mapAfterClick.linkedTileExists,
  markerSelectionVisiblyChanges: !!mapAfterClick.activeMarkerId,
  linkedCameraMatchesMarkerSelection: !!mapAfterClick.activeMarkerId && mapAfterClick.activeMarkerId === mapAfterClick.linkedTileId,
  switchingBackToWallWorks: wallAfterReturn.wallTileCount > 0 && wallAfterReturn.heading.includes('Camera Wall'),
  filtersAffectMapMarkersAndLinkedSet: mapAfterFilter.markerCount > 0 && !!mapAfterFilter.filteredStat && mapAfterFilter.linkedLocation?.includes('Johor') === true,
  t1t10CoreFeaturesStillIntact: baselineWall.hasFilterPanel && baselineWall.hasStats && baselineWall.hasStatusBadges && baselineWall.hasSnapshotIndicators && wallAfterReturn.hasStatusBadges && wallAfterReturn.hasSnapshotIndicators,
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

const result = {
  verdict,
  checks,
  baselineWall,
  mapInitial,
  mapAfterClick,
  mapAfterFilter,
  wallAfterReturn,
  evidencePath,
  evidenceExists: fs.existsSync(evidencePath),
};

console.log(JSON.stringify(result, null, 2));
await browser.close();