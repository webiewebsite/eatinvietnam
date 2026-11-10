import type { RestaurantInputT } from './schemas';

/**
 * Bulk menu paste from the spreadsheet template: one item per line,
 * "Nhóm | Tên món | Giá | Mô tả" (tabs work too; group and description optional).
 */
export function parseMenuPaste(text: string, defaultGroup = 'Món chính'): RestaurantInputT['menu'] {
  return text
    .split('\n')
    .map((l) => l.split(/\t|\|/).map((c) => c.trim()))
    .filter((cells) => cells.some(Boolean))
    .flatMap((cells) => {
      const priceIdx = cells.findIndex((c) => /^\d[\d.,\s]*k?$/i.test(c));
      if (priceIdx < 1) return [];
      const raw = cells[priceIdx]!.toLowerCase();
      const price = raw.endsWith('k') ? Math.round(Number(raw.replace(/[^\d.]/g, '')) * 1000) : Number(raw.replace(/[^\d]/g, ''));
      const before = cells.slice(0, priceIdx).filter(Boolean);
      const name = before[before.length - 1] ?? '';
      const group = before.length > 1 ? before[0]! : defaultGroup;
      const desc = cells.slice(priceIdx + 1).filter(Boolean).join(' ') || null;
      return name && Number.isFinite(price) ? [{ group, name, desc, price, mustTry: false, photoId: null }] : [];
    });
}

