// Contact sheet of the 14 dish icons (light, dark, large) for design review — ops doc item 9.
// Same paths and colours as the app (glyphs.ts + content/taxonomy.json).
// Usage: node --experimental-strip-types scripts/dish-icons-preview.mts [out.png]
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { GLYPHS, type GlyphPart } from '../src/components/icons/food/glyphs.ts';

const out = process.argv[2] ?? 'screenshots/12-dish-icons.png';
const tax = JSON.parse(await readFile(new URL('../content/taxonomy.json', import.meta.url), 'utf8')) as {
  dishes: { slug: string; label: string; color: { bg: string; fg: string; bgDark: string; fgDark: string } }[];
};

const svg = (parts: GlyphPart[], size: number, fg: string, bg: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${parts
    .map((p) => {
      if ('fill' in p) return `<path d="${p.fill}" fill="${fg}"/>`;
      if ('dot' in p) return `<circle cx="${p.dot[0]}" cy="${p.dot[1]}" r="${p.dot[2]}" fill="${p.tone === 'bg' ? bg : fg}"/>`;
      const cut = 'cut' in p;
      return `<path d="${cut ? p.cut : p.line}" fill="none" stroke="${cut ? bg : fg}" stroke-width="${p.w ?? (cut ? 1.3 : 1.5)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('')}</svg>`;

const row = (dark: boolean, badge: number) =>
  `<div class="row${dark ? ' dark' : ''}">${tax.dishes
    .map((d) => {
      const bg = dark ? d.color.bgDark : d.color.bg;
      const fg = dark ? d.color.fgDark : d.color.fg;
      return `<div class="cell"><span class="b" style="width:${badge}px;height:${badge}px;background:${bg}">${svg(GLYPHS[d.slug]!, Math.round(badge * 0.58), fg, bg)}</span><span>${d.label}</span></div>`;
    })
    .join('')}</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:12px system-ui,sans-serif;background:#fff8ee;color:#1c1530}
.row{display:grid;grid-template-columns:repeat(7,1fr);gap:14px 6px;padding:16px}
.dark{background:#15101f;color:#fff8ee}
.cell{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.b{display:grid;place-items:center;border-radius:50%}
h2{margin:0;padding:12px 16px 0;font-size:13px}
</style>
<h2>52 px badge · 30 px glyph (trang chủ)</h2>${row(false, 52)}
<h2 style="background:#15101f;color:#fff8ee">Nền tối</h2>${row(true, 52)}
<h2>96 px (soát nét)</h2>${row(false, 96)}`;

await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 400 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.warn(`wrote ${out}`);
