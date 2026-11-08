// Takes full-page mobile screenshots of the main routes for PR review.
// Usage: BASE_URL=http://localhost:3000 node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'screenshots';

const ROUTES = [
  ['01-home', '/'],
  ['01b-home-khap-vn', '/?che-do=khap-viet-nam'],
  ['02-ban-do', '/ban-do'],
  ['03-tim-kiem', '/tim-kiem?q=' + encodeURIComponent('thèm món nước gần đây dưới 50k')],
  ['04-quan', '/quan/bun-bo-hue-o-xuan'],
  ['05-mon', '/mon/bun-bo'],
  ['06-da-luu', '/da-luu'],
  ['07-toi', '/toi'],
  ['08-chinh-sach', '/chinh-sach-bao-mat'],
  ['09-quan-chua-cap-nhat', '/quan/che-co-sau'],
];

const VIEWPORTS = [
  { w: 360, h: 780 },
  { w: 390, h: 844 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  // Seed saved restaurants so /da-luu is not empty.
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        'eiv:saved',
        JSON.stringify([
          { slug: 'bun-bo-hue-o-xuan', status: 'visited', savedAt: 1 },
          { slug: 'com-tam-suon-moc', status: 'want', savedAt: 2 },
          { slug: 'chao-ech-dem-sai-gon', status: 'want', savedAt: 3 },
        ]),
      );
    } catch {}
  });

  for (const [name, path] of ROUTES) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    try {
      const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
      // Let fonts, images and client effects settle (networkidle is unreliable with prefetching).
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${name}-${vp.w}.png`, fullPage: true });
      // Horizontal overflow check: layout must never scroll sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      report.push({ name, width: vp.w, status: res?.status(), overflow, errors });
    } catch (e) {
      report.push({ name, width: vp.w, status: 'error', errors: [...errors, String(e)] });
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.warn(JSON.stringify(report, null, 2));
if (report.some((r) => r.status !== 200 || r.overflow > 0 || r.errors.length)) process.exitCode = 1;
