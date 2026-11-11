import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_COORDS, UNCHECKED_MENU_GROUP, isPlaceholderCoords } from '@/lib/admin/placeholders';
import { RestaurantInput, missingForPublish } from '@/lib/admin/schemas';
import { dedupeKeys, parseClosedDays, parseHours, parseMenuCell, parseSheet, parseVnd } from '@/lib/import/sheet';
import { Workbook, columnIndex, excelDate } from '@/lib/import/xlsx';

const fixture = readFileSync(new URL('../fixtures/import-sample.xlsx', import.meta.url));

describe('xlsx reader', () => {
  it('lists sheets and reads shared strings, numbers and dates', () => {
    const wb = new Workbook(fixture);
    expect([...wb.sheets.keys()]).toEqual(['Quán', 'Danh mục']);
    const rows = wb.rows('Quán');
    expect(rows.get(1)?.[0]).toBe('Tên quán *');
    expect(rows.get(3)?.[0]).toBe('Bánh xèo Cô Út (CI)');
    expect(rows.get(3)?.[10]).toBe(60000);
    expect(excelDate(rows.get(3)?.[25] as number)).toBe('2026-11-10');
  });
  it('maps column letters', () => {
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('Z9')).toBe(25);
    expect(columnIndex('AB12')).toBe(27);
  });
  it('rejects files that are not xlsx', () => {
    expect(() => new Workbook(Buffer.from('tên quán,địa chỉ\n'))).toThrow(/xlsx/);
  });
});

describe('cell parsers', () => {
  it('reads prices written several ways', () => {
    expect(parseVnd('45.000đ')).toBe(45000);
    expect(parseVnd('45k')).toBe(45000);
    expect(parseVnd(45000)).toBe(45000);
    expect(parseVnd('')).toBeNull();
  });
  it('reads closed days', () => {
    expect(parseClosedDays('Thứ 2, Chủ nhật').days).toEqual([1, 0]);
    expect(parseClosedDays('thứ hai và thứ bảy').days).toEqual([1, 6]);
    expect(parseClosedDays('Không')).toEqual({ days: [], unknown: [] });
    expect(parseClosedDays('Rằm').unknown).toHaveLength(1);
  });
  it('turns uniform opening hours into slots for open days', () => {
    const { slots, ok } = parseHours('06:00-14:00, 17:00-22:30', [1]);
    expect(ok).toBe(true);
    expect(slots).toHaveLength(12);
    expect(slots.some((s) => s.day === 1)).toBe(false);
    expect(parseHours('6h30 - 22h').slots[0]).toEqual({ day: 0, open: '06:30', close: '22:00' });
    // 24:00 = midnight; close ≤ open means the window runs past midnight.
    expect(parseHours('17:00-24:00').slots[0]).toEqual({ day: 0, open: '17:00', close: '00:00' });
    expect(parseHours('24/24').slots).toHaveLength(7);
  });
  it('leaves per-day or free-text hours to the editor', () => {
    expect(parseHours('T2-T6: 7h-21h').ok).toBe(false);
    expect(parseHours('sáng 6h-10h').ok).toBe(false);
    expect(parseHours('').ok).toBe(true);
  });
  it('reads "name: price" menus and drops duplicates', () => {
    expect(parseMenuCell('Phở tái: 55000; Phở đặc biệt: 75.000; Quẩy: 5k; Phở tái: 1')).toEqual([
      { name: 'Phở tái', price: 55000 },
      { name: 'Phở đặc biệt', price: 75000 },
      { name: 'Quẩy', price: 5000 },
    ]);
  });
});

describe('placeholders block verification', () => {
  const base = RestaurantInput.parse({
    name: 'Quán thử',
    venueType: 'Quán vỉa hè',
    address: '1 Đường Thử',
    ...PLACEHOLDER_COORDS['quan-1']!,
    district: 'quan-1',
    highlight: 'Ngon',
    dishes: ['pho'],
    hours: [{ day: 0, open: '06:00', close: '10:00' }],
  });
  it('flags placeholder coordinates only', () => {
    expect(isPlaceholderCoords(base)).toBe(true);
    expect(isPlaceholderCoords({ lat: 10.7731, lng: 106.6985 })).toBe(false);
    expect(missingForPublish(base).join()).toMatch(/tọa độ thật/);
    expect(missingForPublish({ ...base, lat: 10.7731, lng: 106.6985 })).toEqual([]);
  });
  it('flags unchecked menu items', () => {
    const r = { ...base, lat: 10.7731, lng: 106.6985, menu: [{ group: UNCHECKED_MENU_GROUP, name: 'Phở', desc: null, price: 50000, mustTry: false, photoId: null }] };
    expect(missingForPublish(r).join()).toMatch(/kiểm tra thực đơn/);
  });
});

describe('parseSheet (fixture)', () => {
  const rows = parseSheet(new Workbook(fixture).rows('Quán'), { file: 'import-sample.xlsx' });
  const byRow = (n: number) => rows.find((r) => r.row === n)!;

  it('skips the example row and blank template rows', () => {
    expect(rows.map((r) => r.row)).toEqual([3, 4, 5, 6, 7]);
  });
  it('imports a complete, verified row as pending with real data', () => {
    const r = byRow(3);
    expect(r.status).toBe('pending');
    expect(r.missing).toEqual([]);
    expect(r.input).toMatchObject({
      district: 'quan-1',
      ward: 'Phường Bến Thành',
      lat: 10.7731,
      lng: 106.6985,
      dishes: ['banh-xeo', 'an-vat'],
      primaryDish: 'banh-xeo',
      priceMin: 60000,
      priceMax: 120000,
      editorPick: true,
      phone: '0909 111 222',
      vibes: [],
    });
    expect(r.input!.hours).toHaveLength(12);
    expect(r.input!.menu.every((m) => m.group === 'Món nên gọi' && m.mustTry)).toBe(true);
    expect(r.note).toMatch(/Tag vibe đề xuất: Đi nhóm bạn/);
    expect(r.note).toMatch(/Đến ăn, ci@webie\.test, 2026-11-10/);
  });
  it('keeps ShopeeFood guesses out of public fields', () => {
    const r = byRow(4);
    expect(r.status).toBe('draft');
    expect(r.input).toMatchObject({ district: 'quan-3', highlight: '', priceMin: null, priceMax: null, hours: [] });
    expect(isPlaceholderCoords(r.input!)).toBe(true);
    expect(r.input!.menu.map((m) => [m.group, m.name, m.mustTry])).toEqual([
      [UNCHECKED_MENU_GROUP, 'Cơm sườn', false],
      [UNCHECKED_MENU_GROUP, 'Cơm bì chả', false],
    ]);
    expect(r.note).toMatch(/Gợi ý điểm nổi bật \(tự trích ShopeeFood\)/);
    expect(r.note).toMatch(/Giá theo file \(nghi sai\): 25000–100000đ/);
    expect(r.missing).toEqual(expect.arrayContaining(['giờ mở cửa', 'điểm nổi bật', 'phường mới', 'thông tin xác minh']));
  });
  it('warns about unknown dishes and per-day hours, fixes numeric phones', () => {
    const r = byRow(5);
    expect(r.input).toMatchObject({ district: 'quan-2', dishes: ['lau'], primaryDish: 'lau', phone: '0909333444', hours: [] });
    expect(r.warnings.join()).toMatch(/Pizza/);
    expect(r.warnings.join()).toMatch(/T2-T6/);
  });
  it('rejects rows it cannot place', () => {
    expect(byRow(6).error).toMatch(/Quận 9/);
    expect(byRow(7).error).toBe('Thiếu tên quán');
  });
  it('builds de-duplication keys', () => {
    expect(dedupeKeys({ name: 'Bánh Xèo', address: '45 Đường A', grabUrl: 'https://Food.grab.com/x/?utm=1', shopeeUrl: null })).toEqual({
      links: ['https://food.grab.com/x'],
      nameAddress: 'banh xeo|45 duong a',
    });
  });
});
