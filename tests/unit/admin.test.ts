import { describe, expect, it } from 'vitest';
import { parseCoords } from '@/lib/admin/coords';
import { parseMenuPaste } from '@/lib/admin/menu-paste';
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  hashPassword,
  hashToken,
  totpCode,
  verifyPassword,
  verifyTotp,
} from '@/lib/admin/crypto';
import { diffFields } from '@/lib/admin/audit';
import { RestaurantInput, StatusInput, missingForPublish } from '@/lib/admin/schemas';
import { saigonIsoWeek, saigonWeekday } from '@/lib/admin/time';
import { reminderText, splitReminders } from '@/lib/admin/reminders';

describe('passwords', () => {
  it('hashes with a salt and verifies', async () => {
    const a = await hashPassword('một cụm từ dài 123');
    const b = await hashPassword('một cụm từ dài 123');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(await verifyPassword('một cụm từ dài 123', a)).toBe(true);
    expect(await verifyPassword('một cụm từ dài 124', a)).toBe(false);
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 appendix B, SHA-1 secret "12345678901234567890", 8 digits → last 6 here.
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it('matches the RFC test vectors', () => {
    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(totpCode(secret, 1_111_111_109_000)).toBe('081804');
    expect(totpCode(secret, 1_234_567_890_000)).toBe('005924');
    expect(totpCode(secret, 2_000_000_000_000)).toBe('279037');
  });
  it('accepts ±1 step of drift, rejects older codes and garbage', () => {
    const t = 1_700_000_000_000;
    expect(verifyTotp(secret, totpCode(secret, t - 30_000), t)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, t + 30_000), t)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, t - 90_000), t)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', t)).toBe(false);
  });
  it('base32 round-trips', () => {
    const buf = Buffer.from([0, 1, 2, 250, 251, 255, 17]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });
});

describe('secret encryption', () => {
  it('round-trips with ADMIN_SECRET_KEY and fails with another key', () => {
    process.env.ADMIN_SECRET_KEY = 'k'.repeat(40);
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
    process.env.ADMIN_SECRET_KEY = 'z'.repeat(40);
    expect(() => decryptSecret(enc)).toThrow();
    delete process.env.ADMIN_SECRET_KEY;
  });
  it('tokens are stored as SHA-256 hex', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('parseCoords', () => {
  it('reads plain pairs and map links', () => {
    expect(parseCoords('10.7769, 106.7009')).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(parseCoords('106.7009,10.7769')).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(parseCoords('https://www.google.com/maps/place/X/@10.7795,106.6992,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.7797!4d106.6990')).toEqual({
      lat: 10.7797,
      lng: 106.699,
    });
    expect(parseCoords('https://www.google.com/maps/search/?api=1&query=10.77,106.70')).toEqual({ lat: 10.77, lng: 106.7 });
    expect(parseCoords('https://www.openstreetmap.org/#map=18/10.77255/106.69802')).toEqual({ lat: 10.77255, lng: 106.69802 });
  });
  it('rejects text and points outside Vietnam', () => {
    expect(parseCoords('Quận 1')).toBeNull();
    expect(parseCoords('48.85, 2.35')).toBeNull();
  });
});

const base = {
  name: 'Bún bò Cô Ba',
  venueType: 'Quán vỉa hè',
  address: '12 Đường A, Phường Bến Thành',
  lat: 10.77,
  lng: 106.7,
  district: 'quan-1',
};

describe('RestaurantInput', () => {
  it('fills defaults and normalises empty strings to null', () => {
    const r = RestaurantInput.parse({ ...base, tip: '  ', phone: '', dishes: ['bun-bo'], ratingAvg: 4.44 });
    expect(r.tip).toBeNull();
    expect(r.phone).toBeNull();
    expect(r.ratingAvg).toBe(4.4);
    expect(r.menu).toEqual([]);
    expect(r.source).toBe('editor');
  });
  it('rejects bad prices, coordinates, hours and links', () => {
    expect(RestaurantInput.safeParse({ ...base, priceMin: 60000, priceMax: 40000 }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, lat: 106.7, lng: 10.77 }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, hours: [{ day: 1, open: '08:00', close: '08:00' }] }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, hours: [{ day: 1, open: '8:00', close: '20:00' }] }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, grabUrl: 'http://food.grab.com' }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, dishes: ['pizza'] }).success).toBe(false);
    expect(RestaurantInput.safeParse({ ...base, dishes: ['pho'], primaryDish: 'bun-bo' }).success).toBe(false);
  });
  it('allows overnight hours (close before open)', () => {
    expect(RestaurantInput.safeParse({ ...base, hours: [{ day: 5, open: '18:00', close: '02:00' }] }).success).toBe(true);
  });
  it('knows what is missing before publishing', () => {
    const r = RestaurantInput.parse(base);
    expect(missingForPublish(r)).toEqual(['ít nhất 1 món', 'giờ mở cửa', 'điểm nổi bật']);
    const ready = { ...r, dishes: ['pho'], hours: [{ day: 0, open: '06:00', close: '10:00' }], highlight: 'Nước dùng thanh' };
    expect(missingForPublish(ready)).toEqual([]);
  });
  it('verify needs a method', () => {
    expect(StatusInput.safeParse({ action: 'verify' }).success).toBe(false);
    expect(StatusInput.safeParse({ action: 'verify', method: 'phone' }).success).toBe(true);
  });
});

describe('audit diff', () => {
  it('lists only changed fields', () => {
    expect(diffFields({ a: 1, b: [1], c: null }, { a: 1, b: [1, 2], c: undefined, d: 'x' })).toEqual({ b: [[1], [1, 2]], d: [null, 'x'] });
    expect(diffFields(null, { a: 1 })).toEqual({ a: [null, 1] });
  });
});

describe('reminders (decision A)', () => {
  const now = new Date('2026-11-16T02:00:00Z'); // Monday 09:00 Saigon
  const row = (id: number, due: string | null) => ({
    id,
    slug: `q${id}`,
    name: `Quán ${id}`,
    status: 'verified',
    district: 'Quận 1',
    verifiedAt: null,
    reverifyDueAt: due,
    updatedAt: now.toISOString(),
    updatedByName: null,
  });
  it('splits by area; admins get everything; nobody gets an empty email', () => {
    const due = [
      { row: row(1, '2026-11-01T00:00:00Z'), areaIds: [1] },
      { row: row(2, '2026-11-20T00:00:00Z'), areaIds: [3] },
    ];
    const mails = splitReminders(
      due,
      [
        { email: 'a@x.vn', name: 'Admin', isAdmin: true, areaIds: [] },
        { email: 'q1@x.vn', name: 'Q1', isAdmin: false, areaIds: [1] },
        { email: 'q4@x.vn', name: 'Q4', isAdmin: false, areaIds: [4] },
      ],
      now,
    );
    expect(mails.map((m) => m.to)).toEqual(['a@x.vn', 'q1@x.vn']);
    expect(mails[0]!.overdue.map((r) => r.id)).toEqual([1]);
    expect(mails[0]!.dueSoon.map((r) => r.id)).toEqual([2]);
    expect(reminderText(mails[1]!)).toContain('Quán 1');
    expect(reminderText(mails[1]!)).not.toContain('Quán 2');
  });
  it('weeks and weekdays are Saigon time', () => {
    expect(saigonWeekday(now)).toBe(1);
    expect(saigonWeekday(new Date('2026-11-15T18:00:00Z'))).toBe(1); // Sun 18:00 UTC = Mon 01:00 Saigon
    expect(saigonIsoWeek(now)).toBe('2026-W47');
    expect(saigonIsoWeek(new Date('2027-01-01T03:00:00Z'))).toBe('2026-W53');
  });
});

describe('menu paste (spreadsheet template)', () => {
  it('reads "Nhóm | Tên | Giá | Mô tả", tabs, 45k and 45.000', () => {
    const items = parseMenuPaste('Bún | Bún bò đặc biệt | 65.000 | Giò, nạm\nBún bò tái\t50k\n\nĐồ uống | Trà đá | 3000\nkhông giá');
    expect(items).toEqual([
      { group: 'Bún', name: 'Bún bò đặc biệt', desc: 'Giò, nạm', price: 65000, mustTry: false, photoId: null },
      { group: 'Món chính', name: 'Bún bò tái', desc: null, price: 50000, mustTry: false, photoId: null },
      { group: 'Đồ uống', name: 'Trà đá', desc: null, price: 3000, mustTry: false, photoId: null },
    ]);
  });
});

describe('OSM suggestions (#30)', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    osm_type: 'node',
    osm_id: 123,
    lat: '10.7798123',
    lon: '106.6889456',
    category: 'amenity',
    type: 'restaurant',
    name: 'Bún bò Gánh',
    display_name: 'Bún bò Gánh, 110 Lý Chính Thắng, Phường Xuân Hòa, Thành phố Hồ Chí Minh',
    address: { house_number: '110', road: 'Lý Chính Thắng', quarter: 'Phường Xuân Hòa', city: 'Thành phố Hồ Chí Minh' },
    extratags: { opening_hours: 'Mo-Su 06:00-21:00', 'contact:phone': '+84 28 0000 0000', cuisine: 'vietnamese' },
    ...over,
  });

  it('maps Nominatim results, food places first, ignores broken rows', async () => {
    const { parseNominatim } = await import('@/lib/admin/osm');
    const out = parseNominatim([item({ type: 'house', name: 'Nhà 12', osm_id: 1 }), item(), { lat: 'x', lon: '1' }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      name: 'Bún bò Gánh',
      address: '110 Lý Chính Thắng, Phường Xuân Hòa, Thành phố Hồ Chí Minh',
      lat: 10.779812,
      lng: 106.688946,
      kind: 'restaurant',
      cuisine: 'vietnamese',
      openingHours: 'Mo-Su 06:00-21:00',
      phone: '+84 28 0000 0000',
      osmUrl: 'https://www.openstreetmap.org/node/123',
    });
    expect(parseNominatim({ error: 'x' })).toEqual([]);
  });

  it('identifies itself, waits ≥ 1.1 s between requests and caches', async () => {
    const { resetOsmState, searchOsm } = await import('@/lib/admin/osm');
    resetOsmState();
    let clock = 1_000_000;
    const calls: { at: number; ua: string | null; url: string }[] = [];
    const fakeFetch = (async (url: URL, init?: RequestInit) => {
      calls.push({ at: clock, ua: new Headers(init?.headers).get('user-agent'), url: String(url) });
      return new Response(JSON.stringify([item()]), { status: 200 });
    }) as unknown as typeof fetch;
    const deps = { fetch: fakeFetch, now: () => clock, sleep: async (ms: number) => void (clock += ms) };
    await Promise.all([searchOsm('bún bò', deps), searchOsm('phở', deps)]);
    await searchOsm('  Bún   Bò ', deps); // cached (normalised)
    expect(calls).toHaveLength(2);
    expect(calls[1]!.at - calls[0]!.at).toBeGreaterThanOrEqual(1100);
    expect(calls[0]!.ua).toMatch(/^EatInVietnam-admin\//);
    expect(calls[0]!.url).toContain('countrycodes=vn');
    expect(calls[0]!.url).toContain('bounded=1');
  });
});
