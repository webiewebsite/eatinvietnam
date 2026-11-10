// Mobile (390 px) + desktop (1280 px) screenshots of the admin for PR review, signed in with the
// session written by scripts/admin-e2e.mjs. Reports console errors and horizontal overflow.
// Usage: BASE_URL=http://localhost:3100 node scripts/admin-screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = 'admin-screenshots';
const { cookies } = JSON.parse(await readFile('admin-session.json', 'utf8'));
const host = new URL(BASE).hostname;

const ROUTES = [
  ['a1-dang-nhap', '/admin/dang-nhap', false],
  ['a2-danh-sach', '/admin', true],
  ['a3-sua-quan', '/admin/quan/1', true],
  ['a4-them-quan', '/admin/quan/moi', true],
  ['a5-sap-qua-han', '/admin/sap-qua-han', true],
  ['a6-nguoi-dung', '/admin/nguoi-dung', true],
  ['a7-tai-khoan', '/admin/tai-khoan', true],
];
const VIEWPORTS = [
  { w: 390, h: 844, mobile: true },
  { w: 1280, h: 900, mobile: false },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
let failed = false;

for (const vp of VIEWPORTS) {
  for (const [name, path, signedIn] of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    if (signedIn) await context.addCookies(cookies.map((c) => ({ ...c, domain: host, path: '/', httpOnly: true, secure: false })));
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    // Page-level scroll AND cards poking past the right edge (clipped overflow does not scroll).
    const overflow = await page.evaluate(() => {
      const page = document.documentElement.scrollWidth - window.innerWidth;
      const cards = [...document.querySelectorAll('main section, main form, main > div > ul')].map((e) => e.getBoundingClientRect().right - window.innerWidth);
      return Math.max(page, ...cards, 0);
    });
    // Pexels demo photos are hot-linked; offline runners may fail them — not an app error.
    const appErrors = errors.filter((e) => !/images\.pexels\.com|net::ERR_/i.test(e));
    report.push({ name, width: vp.w, status: res?.status(), url: page.url(), overflow, errors: appErrors });
    if (res?.status() !== 200 || overflow > 1 || appErrors.length) failed = true;
    await page.screenshot({ path: `${OUT}/${name}-${vp.w}.png`, fullPage: true });
    await context.close();
  }
}
await browser.close();
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.warn(JSON.stringify(report, null, 2));
if (failed) {
  console.error('Admin screenshots: a page failed, overflowed horizontally or logged errors (see report.json).');
  process.exit(1);
}
