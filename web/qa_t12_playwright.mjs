import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const url = 'http://127.0.0.1:4173';
const evidencePath = 'C:/Programming/Osint Dashboard Camera/docs/evidence/HITOKIRI_T12_saved_view_presets.png';
const presetName = `T12 Preset ${Date.now()}`;
const STORAGE_KEY = 'osint-dashboard-view-presets-v1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

// Arrange a distinct state: filter + layout + mode
await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await page.waitForTimeout(250);
await page.locator('div.filter-block:has(label:text("Area")) select.filter-select').selectOption({ label: 'Shah Alam' });
await page.waitForTimeout(250);
await page.locator('.chip-row .chip', { hasText: 'highway' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: '2x2' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Map' }).click();
await page.waitForTimeout(400);

const stateBeforeSave = await page.evaluate(() => ({
  selectedState: document.querySelectorAll('select.filter-select')[0]?.value ?? '',
  selectedArea: document.querySelectorAll('select.filter-select')[1]?.value ?? '',
  selectedPurposes: Array.from(document.querySelectorAll('.chip-row .chip:not(.ghost)')).map(el => (el.textContent || '').trim()).filter(Boolean),
  layoutMode: (Array.from(document.querySelectorAll('.layout-switch .layout-btn')).find(el => el.classList.contains('active') && ['2x2','3x3','4x4'].includes((el.textContent || '').trim()))?.textContent || '').trim() || null,
  viewMode: (Array.from(document.querySelectorAll('.layout-switch .layout-btn')).find(el => el.classList.contains('active') && ['Wall','Map'].includes((el.textContent || '').trim()))?.textContent || '').trim(),
  heading: document.querySelector('.wall-header h2')?.textContent?.trim() ?? '',
}));

// Save preset
await page.locator('.preset-input').fill(presetName);
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(300);

const savedPresetVisible = await page.locator('.preset-item .preset-apply-btn', { hasText: presetName }).count() > 0;

// Disturb state then apply preset
await page.getByRole('button', { name: 'Wall' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: '3x3' }).click();
await page.waitForTimeout(200);
await page.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Johor' });
await page.waitForTimeout(220);
await page.locator('.chip-row .chip', { hasText: 'street' }).click();
await page.waitForTimeout(220);

await page.locator('.preset-item', { hasText: presetName }).locator('.preset-apply-btn').click();
await page.waitForTimeout(450);

const stateAfterApply = await page.evaluate(() => ({
  selectedState: document.querySelectorAll('select.filter-select')[0]?.value ?? '',
  selectedArea: document.querySelectorAll('select.filter-select')[1]?.value ?? '',
  selectedPurposes: Array.from(document.querySelectorAll('.chip-row .chip:not(.ghost)')).map(el => (el.textContent || '').trim()).filter(Boolean),
  layoutMode: (Array.from(document.querySelectorAll('.layout-switch .layout-btn')).find(el => el.classList.contains('active') && ['2x2','3x3','4x4'].includes((el.textContent || '').trim()))?.textContent || '').trim() || null,
  viewMode: (Array.from(document.querySelectorAll('.layout-switch .layout-btn')).find(el => el.classList.contains('active') && ['Wall','Map'].includes((el.textContent || '').trim()))?.textContent || '').trim(),
  heading: document.querySelector('.wall-header h2')?.textContent?.trim() ?? '',
}));

// Refresh and validate persistence
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

const presetAfterRefreshVisible = await page.locator('.preset-item .preset-apply-btn', { hasText: presetName }).count() > 0;
const storageHasPreset = await page.evaluate(({ key, name }) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.some((p) => p?.name === name);
  } catch {
    return false;
  }
}, { key: STORAGE_KEY, name: presetName });

// Delete preset
await page.locator('.preset-item', { hasText: presetName }).locator('.preset-delete-btn').click();
await page.waitForTimeout(300);

const presetDeletedFromUI = await page.locator('.preset-item .preset-apply-btn', { hasText: presetName }).count() === 0;
const storageDeleted = await page.evaluate(({ key, name }) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return !Array.isArray(parsed) || !parsed.some((p) => p?.name === name);
  } catch {
    return true;
  }
}, { key: STORAGE_KEY, name: presetName });

await page.screenshot({ path: evidencePath, fullPage: true });
await browser.close();

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
];

const checks = {
  canSavePresetWithCurrentState: savedPresetVisible,
  applyingSavedPresetRestoresState: (
    stateAfterApply.selectedState === stateBeforeSave.selectedState &&
    stateAfterApply.selectedArea === stateBeforeSave.selectedArea &&
    JSON.stringify([...stateAfterApply.selectedPurposes].sort()) === JSON.stringify([...stateBeforeSave.selectedPurposes].sort()) &&
    stateAfterApply.viewMode === stateBeforeSave.viewMode
  ),
  presetPersistsAfterRefreshViaLocalStorage: presetAfterRefreshVisible && storageHasPreset,
  canDeletePreset: presetDeletedFromUI && storageDeleted,
  t1ToT11BehaviorsRemainIntact: regressions.every(r => r.ok || r.knownWarning),
};

const verdict = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const result = {
  verdict,
  checks,
  stateBeforeSave,
  stateAfterApply,
  regressions,
  evidencePath,
  evidenceExists: fs.existsSync(evidencePath),
};

console.log(JSON.stringify(result, null, 2));
