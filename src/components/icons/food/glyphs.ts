/**
 * 14 solid dish glyphs on one 24 px grid (ops doc, item 9). Pure data, no imports, so
 * FoodIcon renders it and scripts can draw previews from the same paths.
 *
 * - `fill`: solid shape in the glyph colour (--dish-fg)
 * - `line`: stroke in the glyph colour (chopsticks, steam, skewer)
 * - `cut`:  stroke in the badge colour (--dish-bg) — knock-out details drawn on top
 *
 * Shapes stay inside 1.5–22.5 so they read at 30 px; details are ≥ 1.1 px wide.
 */
export type GlyphPart =
  | { fill: string }
  | { line: string; w?: number }
  | { cut: string; w?: number }
  | { dot: [number, number, number]; tone?: 'fg' | 'bg' };

const BOWL = 'M2.5 11h19c0 4.7-4.3 8.5-9.5 8.5S2.5 15.7 2.5 11Z M9 18.6h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1Z';
const STEAM = 'M8.5 7c-.8-.9-.8-1.9 0-2.8s.8-1.9 0-2.8M12 7c-.8-.9-.8-1.9 0-2.8s.8-1.9 0-2.8M15.5 7c-.8-.9-.8-1.9 0-2.8s.8-1.9 0-2.8';

export const GLYPHS: Record<string, GlyphPart[]> = {
  // Bowl + chopsticks + noodle wave
  pho: [
    { line: 'M12.5 10 19.5 2.5M15 10.5l6.5-6', w: 1.6 },
    { fill: BOWL },
    { cut: 'M6 14.5c1.3.8 2.7.8 4 0s2.7-.8 4 0 2.7.8 4 0', w: 1.3 },
  ],
  // Bowl + chilli (Huế: spicy)
  'bun-bo': [
    { fill: 'M8.6 9.6c.4-3.3 3-5.7 6.4-6.1 1.5-.2 2.6.4 2.9 1.2-3 .5-5.5 2.2-7 4.9Z' },
    { line: 'M17.4 4.4c.7-1 1.8-1.6 3-1.6', w: 1.4 },
    { fill: BOWL },
    { cut: 'M5.5 14.2h13', w: 1.3 },
    { dot: [9, 16.4, 0.9], tone: 'bg' },
    { dot: [14.5, 16.4, 0.9], tone: 'bg' },
  ],
  // Bowl + curled shrimp (Nam Vang)
  'hu-tieu': [
    { line: 'M16.4 3.4c-3.6-.4-6.7 1.8-6.7 4.9 0 .9.2 1.6.6 2.2', w: 3 },
    { dot: [16.6, 3.5, 1.8] },
    { fill: 'M10.4 9.4 7.4 10.9l3.4.4.6-1.9Z' },
    { cut: 'M12.4 3.3l.8 2M10.5 5.4l1.9.9M9.9 8l2-.2', w: 0.9 },
    { line: 'M18 2.7l3.2-1', w: 1 },
    { fill: BOWL },
    { cut: 'M6 14.2h5M13 14.2h5', w: 1.3 },
  ],
  // Bowl + thick wavy noodles lifted on chopsticks
  'banh-canh': [
    { line: 'M4.5 6.2 20.5 1.8', w: 1.5 },
    { line: 'M8.6 5.4c-.7 1.7.5 3-.2 5.4M12.6 4.3c.7 1.9-.5 3.5.2 6.4', w: 2.4 },
    { fill: BOWL },
    { cut: 'M5.5 14.2c2.2 1 4.3 1 6.5 0s4.3-1 6.5 0', w: 1.3 },
  ],
  // Heaped porridge + spoon
  chao: [
    { line: 'M14.2 8.2 19.8 2.6', w: 1.8 },
    { fill: 'M3.6 11.2c.9-2.8 4.4-4.6 8.4-4.6s7.5 1.8 8.4 4.6Z' },
    { fill: BOWL },
    { cut: 'M2.4 11.1h19.2', w: 1.3 },
    { dot: [8.6, 9.4, 0.9], tone: 'bg' },
    { dot: [11.6, 8.5, 0.9], tone: 'bg' },
  ],
  // Plate from above: rim, rice, grilled pork chop
  'com-tam': [
    { dot: [12, 12, 9.8] },
    { cut: 'M12 3.9a8.1 8.1 0 1 1 0 16.2 8.1 8.1 0 0 1 0-16.2Z', w: 1.1 },
    { cut: 'M9 7.4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z', w: 1.2 },
    { dot: [8.1, 10, 0.6], tone: 'bg' },
    { dot: [9.9, 11.4, 0.6], tone: 'bg' },
    { dot: [8.4, 12.3, 0.6], tone: 'bg' },
    { cut: 'M10.84 15.97a4 2.6 -20 1 0 7.52-2.74 4 2.6 -20 1 0-7.52 2.74Z', w: 1.2 },
    { cut: 'M13 14.4l3.6-1.3', w: 1 },
    { dot: [16.2, 8.4, 1.2], tone: 'bg' },
  ],
  // Snail: spiral shell on a foot
  oc: [
    { fill: 'M2.5 19.2c0-.9.7-1.7 1.6-1.7h13.4l2.8-3.5h1.2v2.4c0 2.1-1.7 3.8-3.8 3.8H4.2c-.9 0-1.7-.1-1.7-1Z' },
    { line: 'M20.4 14.2l-.9-3.1M21.7 14.4l1-2.9', w: 1.2 },
    { fill: 'M11 4.3a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z' },
    { cut: 'M11 11.3c0-1 .8-1.6 1.7-1.5 1.3.1 2 1.3 1.8 2.5-.3 1.8-2 2.8-3.8 2.6-2.4-.3-3.9-2.5-3.6-4.9.4-3 3.2-4.9 6.1-4.5', w: 1.3 },
  ],
  // Fish-ball skewer
  'an-vat': [
    { line: 'M3.2 20.8 20.8 3.2', w: 1.6 },
    { dot: [8, 16, 3.3] },
    { dot: [12.4, 11.6, 3.3] },
    { dot: [16.6, 7.4, 2.7] },
    { cut: 'M8 12.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 1 0 0-6.6M12.4 8.3a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 1 0 0-6.6', w: 1.1 },
    { dot: [6.8, 14.8, 0.8], tone: 'bg' },
    { dot: [11.2, 10.4, 0.8], tone: 'bg' },
    { dot: [15.6, 6.4, 0.7], tone: 'bg' },
  ],
  // Phin filter on a glass
  'ca-phe': [
    { fill: 'M10.5 2h3v2h-3Z M8 4h8v4.2H8Z M5.5 8.4h13v1.5h-13Z' },
    { fill: 'M6 10.6h12l-1.4 10.1a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3Z' },
    { cut: 'M6.6 15.4h10.8', w: 1.3 },
  ],
  // Baguette with three scores
  'banh-mi': [
    { fill: 'M3.2 17.6c-1.3-1.3-.6-3.8 1.9-6.3l5.3-5.3c2.5-2.5 5-3.2 6.3-1.9l3.3 3.3c1.3 1.3.6 3.8-1.9 6.3l-5.3 5.3c-2.5 2.5-5 3.2-6.3 1.9Z' },
    { cut: 'M6.4 12.6l2.8 1.4M9.9 9.1l2.8 1.4M13.4 5.6l2.8 1.4', w: 1.3 },
  ],
  // Hot pot with handles and steam
  lau: [
    { line: STEAM, w: 1.4 },
    { fill: 'M3 9.2h18v1.6H3Z M4 11.4h16v4.6c0 2.8-2.2 5-5 5H9c-2.8 0-5-2.2-5-5Z M1.5 12.4H4v2H1.5Z M20 12.4h2.5v2H20Z' },
    { dot: [9, 15.4, 1], tone: 'bg' },
    { dot: [12.6, 17, 0.9], tone: 'bg' },
    { dot: [15, 14.4, 0.8], tone: 'bg' },
  ],
  // Folded half-moon crêpe with bean sprouts
  'banh-xeo': [
    { fill: 'M2 17.5a10 10 0 0 1 20 0Z' },
    { cut: 'M7.6 13.6l1.8 1.5M12 11.4v2.3M16.4 13.6l-1.8 1.5', w: 1.3 },
    { line: 'M1.5 20h21', w: 1.4 },
  ],
  // Layered glass with spoon
  che: [
    { line: 'M14.4 7.4 18 1.8', w: 1.5 },
    { fill: 'M7 6.2h10l-1.3 14.4a1.5 1.5 0 0 1-1.5 1.4H9.8a1.5 1.5 0 0 1-1.5-1.4Z' },
    { cut: 'M7.6 11.4h8.8M8 16.2h8', w: 1.3 },
    { dot: [10.2, 8.8, 0.8], tone: 'bg' },
    { dot: [12.6, 13.8, 0.8], tone: 'bg' },
  ],
  // Leaf
  'mon-chay': [
    { fill: 'M4 20C4 11 10 4.5 20 4c0 9.5-6.5 16-16 16Z' },
    { cut: 'M4.8 19.2 15.4 8.6M9 15v-3.4M12 12h3.4', w: 1.3 },
  ],
};

/** A dish without its own glyph (added later) gets the plain bowl. */
export const FALLBACK_GLYPH: GlyphPart[] = [{ fill: BOWL }];
