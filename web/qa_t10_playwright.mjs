import { chromium } from 'playwright';
import fs from 'node:fs';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T10_focus_mode.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

const baseline = await page.evaluate(() => {
  const selects = document.querySelectorAll('select.filter-select');
  const stateSelect = selects[0];
  const areaSelect = selects[1];
  const activeLayout = document.querySelector('.layout-btn.active')?.textContent?.trim() ?? null;
  const tileCount = document.querySelectorAll('.camera-grid .camera-tile').length;
  const healthBadgeCount = document.querySelectorAll('.camera-grid .camera-tile .tile-status').length;
  const snapshotIndicatorCount = document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length;
  return {
    selectedState: (stateSelect && 'value' in stateSelect) ? stateSelect.value : '',
    selectedArea: (areaSelect && 'value' in areaSelect) ? areaSelect.value : '',
    activeLayout,
    tileCount,
    healthBadgeCount,
    snapshotIndicatorCount,
  };
});

// Apply filter + layout to validate state persistence through focus mode.
await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await page.waitForTimeout(250);
await page.getByRole('button', { name: '2x2' }).click();
await page.waitForTimeout(300);

const preFocus = await page.evaluate(() => {
  const selects = document.querySelectorAll('select.filter-select');
  const stateSelect = selects[0];
  const areaSelect = selects[1];
  const activeLayout = document.querySelector('.layout-btn.active')?.textContent?.trim() ?? null;
  const firstTile = document.querySelector('.camera-grid .camera-tile');
  const firstTileId = firstTile?.querySelector('.tile-id')?.textContent?.trim() ?? null;
  const tileCount = document.querySelectorAll('.camera-grid .camera-tile').length;
  const healthBadgeCount = document.querySelectorAll('.camera-grid .camera-tile .tile-status').length;
  const snapshotIndicatorCount = document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length;
  return {
    selectedState: (stateSelect && 'value' in stateSelect) ? stateSelect.value : '',
    selectedArea: (areaSelect && 'value' in areaSelect) ? areaSelect.value : '',
    activeLayout,
    firstTileId,
    tileCount,
    healthBadgeCount,
    snapshotIndicatorCount,
  };
});

// Clicking wall tile enters focus mode
await page.locator('.camera-grid .camera-tile').first().click();
await page.waitForTimeout(350);

const focusState = await page.evaluate(() => {
  const isFocusHeading = document.querySelector('.wall-header h2')?.textContent?.includes('Focus Mode') ?? false;
  const hasExit = Array.from(document.querySelectorAll('.layout-switch .layout-btn')).some(btn => btn.textContent?.trim() === 'Exit Focus');
  const focusWrap = document.querySelector('.focus-mode-wrap');
  const mainTileCount = document.querySelectorAll('.focus-main .camera-tile').length;
  const sidebarCount = document.querySelectorAll('.focus-list .focus-list-item').length;
  const mainCameraId = document.querySelector('.focus-main .camera-tile .tile-id')?.textContent?.trim() ?? null;
  const activeSidebarId = document.querySelector('.focus-list .focus-list-item.active span')?.textContent?.trim() ?? null;
  return { isFocusHeading, hasExit, hasFocusWrap: !!focusWrap, mainTileCount, sidebarCount, mainCameraId, activeSidebarId };
});

// Switch sidebar item and verify focused camera changes
const sidebarItems = page.locator('.focus-list .focus-list-item');
const sidebarCount = await sidebarItems.count();
let switchResult = { attempted: false, from: focusState.mainCameraId, to: focusState.mainCameraId, changed: false };
if (sidebarCount > 1) {
  const targetIdx = 1;
  const targetId = (await sidebarItems.nth(targetIdx).locator('span').innerText()).trim();
  await sidebarItems.nth(targetIdx).click();
  await page.waitForTimeout(300);
  const mainAfterSwitchRaw = (await page.locator('.focus-main .camera-tile .tile-id').innerText()).trim();
  const mainAfterSwitch = mainAfterSwitchRaw.replace(/^#/, '');
  const fromId = (focusState.mainCameraId ?? '').replace(/^#/, '');
  switchResult = {
    attempted: true,
    from: fromId,
    to: mainAfterSwitch,
    targetId,
    changed: mainAfterSwitch !== fromId && mainAfterSwitch === targetId,
  };
}

await page.screenshot({ path: evidencePath, fullPage: true });

// Exit focus and verify wall restored with filters/layout/indicators intact
await page.getByRole('button', { name: 'Exit Focus' }).click();
await page.waitForTimeout(350);

const postExit = await page.evaluate(() => {
  const selects = document.querySelectorAll('select.filter-select');
  const stateSelect = selects[0];
  const areaSelect = selects[1];
  const activeLayout = document.querySelector('.layout-btn.active')?.textContent?.trim() ?? null;
  const isWallHeading = document.querySelector('.wall-header h2')?.textContent?.includes('Camera Wall') ?? false;
  const focusWrapExists = !!document.querySelector('.focus-mode-wrap');
  const tileCount = document.querySelectorAll('.camera-grid .camera-tile').length;
  const healthBadgeCount = document.querySelectorAll('.camera-grid .camera-tile .tile-status').length;
  const snapshotIndicatorCount = document.querySelectorAll('.camera-grid .camera-tile .snapshot-observability').length;
  return {
    selectedState: (stateSelect && 'value' in stateSelect) ? stateSelect.value : '',
    selectedArea: (areaSelect && 'value' in areaSelect) ? areaSelect.value : '',
    activeLayout,
    isWallHeading,
    focusWrapExists,
    tileCount,
    healthBadgeCount,
    snapshotIndicatorCount,
  };
});

const checks = {
  clickTileOpensFocusMode: focusState.hasFocusWrap && focusState.isFocusHeading,
  focusShowsMainAndSidebar: focusState.mainTileCount === 1 && focusState.sidebarCount >= 1,
  switchSidebarChangesFocus: switchResult.attempted ? switchResult.changed : false,
  exitFocusReturnsWall: postExit.isWallHeading && !postExit.focusWrapExists,
  filtersLayoutIndicatorsIntact: (
    postExit.selectedState === preFocus.selectedState &&
    postExit.selectedArea === preFocus.selectedArea &&
    postExit.activeLayout === preFocus.activeLayout &&
    postExit.healthBadgeCount > 0 &&
    postExit.snapshotIndicatorCount > 0
  ),
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

const result = {
  verdict,
  checks,
  baseline,
  preFocus,
  focusState,
  switchResult,
  postExit,
  evidencePath,
  evidenceExists: fs.existsSync(evidencePath),
};

console.log(JSON.stringify(result, null, 2));
await browser.close();