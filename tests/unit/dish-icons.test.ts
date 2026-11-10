import { describe, expect, it } from 'vitest';
import { GLYPHS } from '@/components/icons/food/glyphs';
import { DISHES, GROUPS, dishColor, type DishColor } from '@/lib/taxonomy';

/** WCAG 2.x relative luminance / contrast ratio. */
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const pairs = (c: DishColor) => [
  ['light', contrast(c.fg, c.bg)],
  ['dark', contrast(c.fgDark, c.bgDark)],
] as const;

describe('dish icons (ops doc item 9)', () => {
  it('every dish has its own glyph and a colour', () => {
    for (const d of DISHES) {
      expect(GLYPHS[d.slug], d.slug).toBeDefined();
      expect(dishColor(d.slug), d.slug).not.toBeNull();
    }
    expect(dishColor('khong-co')).toBeNull();
  });

  it('colours are valid 6-digit hex', () => {
    for (const c of [...DISHES, ...GROUPS].flatMap((x) => (x.color ? [x.color] : []))) {
      for (const v of Object.values(c)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('the 14 launch dishes reach 4.1:1 (palette as proposed 09/11)', () => {
    for (const d of DISHES) {
      for (const [mode, ratio] of pairs(dishColor(d.slug)!)) expect(ratio, `${d.slug} ${mode}`).toBeGreaterThanOrEqual(4.1);
    }
  });

  it('group tones (used by dishes added later) reach the 3:1 graphics minimum', () => {
    for (const g of GROUPS) {
      expect(g.color, g.slug).toBeDefined();
      for (const [mode, ratio] of pairs(g.color!)) expect(ratio, `${g.slug} ${mode}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('a dish without its own colour uses its group tone', () => {
    const pho = DISHES.find((d) => d.slug === 'pho')!;
    const group = GROUPS.find((g) => g.slug === pho.group)!;
    const saved = pho.color;
    try {
      delete pho.color;
      expect(dishColor('pho')).toEqual(group.color);
    } finally {
      pho.color = saved;
    }
  });
});
