import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto('http://127.0.0.1:4173');
await p.locator('div.filter-block:has(label:text("State")) select.filter-select').selectOption({ label: 'Selangor' });
await p.waitForTimeout(250);
await p.locator('div.filter-block:has(label:text("Area")) select.filter-select').selectOption({ label: 'Shah Alam' });
let hits = 0;
for (let i = 0; i < 14; i++) {
  const s = await p.evaluate(() => {
    const t = document.querySelector('.camera-tile');
    return {
      fb: !!t?.querySelector('.fallback-pill'),
      upd: t?.querySelector('.updated-pill')?.textContent?.trim() ?? null,
      hasImg: !!t?.querySelector('img.live-image'),
      status: t?.querySelector('.tile-status')?.textContent?.trim() ?? null,
    };
  });
  if (s.fb) hits++;
  console.log(i, s);
  await p.waitForTimeout(1000);
}
console.log('fallbackHits', hits);
await b.close();