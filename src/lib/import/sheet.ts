/**
 * Maps the ops restaurant template (sheet "Quán", #48) to admin `RestaurantInput`s.
 * Pure apart from the types: the script (scripts/import-restaurants.ts) does the I/O.
 *
 * Rules (ops decisions 09/11 + data checks 12/11):
 * - The import never publishes. Rows land as `draft`; a row that is complete AND carries
 *   the three verification columns lands as `pending` so an admin can verify it in one click.
 * - Guesses are marked so `missingForPublish` blocks them: placeholder coordinates when the
 *   row has none, menu copied from ShopeeFood in an "unchecked" group.
 * - ShopeeFood-derived text (auto "highlight", delivery hours) is not copied into public
 *   fields; it goes to the internal note stored in the restaurant's history.
 * - Vibe tags are only suggested in the note: a tag needs the editor to tick all 3 criteria.
 */
import { parseCoords } from '@/lib/admin/coords';
import { UNCHECKED_MENU_GROUP, placeholderFor } from '@/lib/admin/placeholders';
import { RestaurantInput, missingForPublish, type RestaurantInputT, type VerificationMethod } from '@/lib/admin/schemas';
import { toSearchText } from '@/lib/search/normalize';
import { DISHES, DISTRICTS } from '@/lib/taxonomy';
import { excelDate, type Cell, type SheetRows } from './xlsx';

export const SHEET_NAME = 'Quán';

/** Column → normalised header prefix (headers end with " *" when required; order may change). */
const COLUMNS = {
  name: 'ten quan',
  address: 'dia chi',
  ward: 'phuong',
  district: 'quan cu',
  coords: 'toa do',
  mainDish: 'mon chinh',
  otherDishes: 'mon khac',
  venueType: 'loai hinh',
  hours: 'gio mo cua',
  closedDays: 'ngay nghi',
  priceMin: 'gia thap nhat',
  priceMax: 'gia cao nhat',
  highlight: 'diem noi bat',
  tip: 'meo cua bien tap',
  menu: 'mon nen goi',
  features: 'dac diem',
  amenities: 'tien ich',
  vibes: 'tag vibe',
  editorPick: 'bien tap chon',
  phone: 'so dien thoai',
  grabUrl: 'link grabfood',
  shopeeUrl: 'link shopeefood',
  photoFolder: 'link thu muc anh',
  method: 'cach xac minh',
  verifier: 'nguoi xac minh',
  verifiedOn: 'ngay xac minh',
  notes: 'ghi chu noi bo',
} as const;
type Col = keyof typeof COLUMNS;
const REQUIRED_COLUMNS: Col[] = ['name', 'address', 'district', 'venueType'];

export interface ImportRow {
  /** Spreadsheet row number (1-based, as shown in Excel). */
  row: number;
  name: string;
  /** Null when the row cannot be imported (see `error`). */
  input: RestaurantInputT | null;
  error: string | null;
  status: 'draft' | 'pending';
  /** What still blocks verification (same list the admin shows), plus soft gaps for the report. */
  missing: string[];
  warnings: string[];
  /** Internal note saved to the restaurant's history (never public). */
  note: string;
}

// ── Small parsers (exported for tests) ───────────────────────────────────────

const str = (c: Cell | undefined): string => (c == null ? '' : String(c).replace(/\s+/g, ' ').trim());

/** "45.000đ", "45,000", "45k", 45000 → 45000. */
export function parseVnd(c: Cell | undefined): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? Math.round(c) : null;
  const s = str(c).toLowerCase();
  if (!s) return null;
  const k = /^\s*(\d+(?:[.,]\d+)?)\s*k\b/.exec(s);
  if (k) return Math.round(Number(k[1]!.replace(',', '.')) * 1000);
  const digits = s.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

const list = (c: Cell | undefined) =>
  str(c)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Lowercase without diacritics, punctuation kept (toSearchText drops ":" "-" ","). */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const DAY_WORDS: [RegExp, number][] = [
  [/^(chu nhat|cn)$/, 0],
  [/^(thu 2|thu hai|t2)$/, 1],
  [/^(thu 3|thu ba|t3)$/, 2],
  [/^(thu 4|thu tu|t4)$/, 3],
  [/^(thu 5|thu nam|t5)$/, 4],
  [/^(thu 6|thu sau|t6)$/, 5],
  [/^(thu 7|thu bay|t7)$/, 6],
];

/** "Thứ 2, Chủ nhật" → [1, 0]; "Không" → []. Unknown words are returned in `unknown`. */
export function parseClosedDays(text: string): { days: number[]; unknown: string[] } {
  const days: number[] = [];
  const unknown: string[] = [];
  for (const part of fold(text).split(/[,;/]| va /)) {
    const t = part.trim();
    if (!t || t === 'khong' || t === 'khong nghi') continue;
    const hit = DAY_WORDS.find(([re]) => re.test(t));
    if (hit) days.push(hit[1]);
    else unknown.push(part.trim());
  }
  return { days: [...new Set(days)], unknown };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "06:00-14:00, 17:00-22:30", "6h-14h", "6h30 - 22h", "24/24" → the same windows every open
 * day. Per-day schedules ("T2-T6 …") are not guessed: `ok` is false and the editor fills them in.
 */
export function parseHours(text: string, closedDays: number[] = []): { slots: RestaurantInputT['hours']; ok: boolean } {
  const t = fold(text);
  if (!t) return { slots: [], ok: true };
  const openDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !closedDays.includes(d));
  if (/^(24\/24|ca ngay|mo ca ngay)$/.test(t)) {
    return { slots: openDays.map((day) => ({ day, open: '00:00', close: '23:59' })), ok: true };
  }
  if (/\b(thu|t[2-7]|cn|chu nhat)\b/.test(t)) return { slots: [], ok: false };
  const windows: { open: string; close: string }[] = [];
  const re = /(\d{1,2})(?:\s*[:h.]\s*(\d{2})?)?\s*(?:-|–|den)\s*(\d{1,2})(?:\s*[:h.]\s*(\d{2})?)?/g;
  let rest = t;
  for (const m of t.matchAll(re)) {
    const [h1, m1, h2, m2] = [Number(m[1]), Number(m[2] ?? 0), Number(m[3]), Number(m[4] ?? 0)];
    if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) return { slots: [], ok: false };
    // 24:00 closes at midnight; close ≤ open already means "past midnight" (opening_hours rule).
    const open = `${pad(h1 % 24)}:${pad(m1)}`;
    const close = `${pad(h2 % 24)}:${pad(m2)}`;
    if (open === close) return { slots: [], ok: false };
    windows.push({ open, close });
    rest = rest.replace(m[0], ' ');
  }
  // Leftover text other than separators means a format we do not understand.
  if (!windows.length || rest.replace(/[\s,;&+]|va/g, '') !== '') return { slots: [], ok: false };
  if (windows.length > 4) return { slots: [], ok: false };
  return { slots: openDays.flatMap((day) => windows.map((w) => ({ day, ...w }))), ok: true };
}

/** "Phở tái: 55000; Phở đặc biệt: 75.000" → [{ name, price }], duplicates dropped. */
export function parseMenuCell(text: string): { name: string; price: number }[] {
  const seen = new Set<string>();
  const out: { name: string; price: number }[] = [];
  for (const part of text.split(/;|\n/)) {
    const i = part.lastIndexOf(':');
    if (i < 1) continue;
    const name = part.slice(0, i).replace(/\s+/g, ' ').trim().slice(0, 120);
    const price = parseVnd(part.slice(i + 1));
    const key = toSearchText(name);
    if (!name || price == null || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, price });
  }
  return out.slice(0, 150);
}

const DISH_LOOKUP = new Map(DISHES.flatMap((d) => [d.label, d.slug, ...d.keywords].map((k) => [toSearchText(k), d.slug] as const)));
const DISTRICT_LOOKUP = new Map(
  DISTRICTS.flatMap((d) => [d.label, d.short, d.slug, ...d.keywords].map((k) => [toSearchText(k), d.slug] as const)),
);
export const dishSlug = (label: string) => DISH_LOOKUP.get(toSearchText(label)) ?? null;
export const districtSlug = (label: string) => DISTRICT_LOOKUP.get(toSearchText(label)) ?? null;

const METHODS: [RegExp, VerificationMethod][] = [
  [/den an/, 'visited'],
  [/anh/, 'photo'],
  [/goi/, 'phone'],
];

// ── Sheet → rows ─────────────────────────────────────────────────────────────

export function mapHeader(header: Cell[]): Partial<Record<Col, number>> {
  const cols: Partial<Record<Col, number>> = {};
  header.forEach((h, i) => {
    const t = toSearchText(str(h));
    if (!t) return;
    for (const [col, prefix] of Object.entries(COLUMNS) as [Col, string][]) {
      if (cols[col] === undefined && t.startsWith(prefix)) {
        cols[col] = i;
        break;
      }
    }
  });
  const missing = REQUIRED_COLUMNS.filter((c) => cols[c] === undefined);
  if (missing.length) throw new Error(`Sheet "${SHEET_NAME}" thiếu cột: ${missing.map((c) => COLUMNS[c]).join(', ')}`);
  return cols;
}

export function parseSheet(rows: SheetRows, opts: { file: string }): ImportRow[] {
  const header = rows.get(1);
  if (!header) throw new Error(`Sheet "${SHEET_NAME}" không có dòng tiêu đề`);
  const cols = mapHeader(header);
  const out: ImportRow[] = [];
  for (const [r, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (r === 1) continue;
    const get = (c: Col) => (cols[c] === undefined ? null : (cells[cols[c]!] ?? null));
    const name = str(get('name'));
    // Row 2 is the grey example row; blank template rows only carry the check formula.
    if (r === 2 || /\(ví dụ\)/i.test(name)) continue;
    if (!name && !str(get('address'))) continue;
    out.push(parseRow(r, get, opts.file));
  }
  return out;
}

function parseRow(row: number, get: (c: Col) => Cell, file: string): ImportRow {
  const warnings: string[] = [];
  const noteLines: string[] = [`Nhập từ file "${file}", dòng ${row}.`];
  const name = str(get('name'));
  const rawNote = str(get('notes'));
  const fromShopee = toSearchText(rawNote).includes('nguon shopeefood');
  const fail = (error: string): ImportRow => ({
    row,
    name,
    input: null,
    error,
    status: 'draft',
    missing: [],
    warnings,
    note: '',
  });

  if (!name) return fail('Thiếu tên quán');
  const districtRaw = str(get('district'));
  const district = districtSlug(districtRaw);
  if (!district) return fail(`Quận cũ "${districtRaw}" không có trong taxonomy`);

  // Coordinates: real ones if parseable, otherwise the district placeholder (blocks verification).
  const coordsRaw = str(get('coords'));
  const coords = coordsRaw ? parseCoords(coordsRaw) : null;
  if (coordsRaw && !coords) warnings.push(`Tọa độ "${coordsRaw}" không đọc được`);
  if (!coords) warnings.push('Dùng tọa độ tạm của quận');
  const { lat, lng } = coords ?? placeholderFor(district);

  // Dishes
  const dishLabels = [...list(get('mainDish')), ...list(get('otherDishes'))];
  const dishes: string[] = [];
  for (const label of dishLabels) {
    const slug = dishSlug(label);
    if (slug) {
      if (!dishes.includes(slug)) dishes.push(slug);
    } else warnings.push(`Món "${label}" không có trong taxonomy`);
  }
  const primaryDish = dishSlug(list(get('mainDish'))[0] ?? '') ?? dishes[0] ?? null;

  // Hours (never from ShopeeFood: those are delivery windows)
  const closed = parseClosedDays(str(get('closedDays')));
  if (closed.unknown.length) warnings.push(`Ngày nghỉ không đọc được: ${closed.unknown.join(', ')}`);
  const hoursRaw = str(get('hours'));
  const hours = parseHours(hoursRaw, closed.days);
  if (!hours.ok) {
    warnings.push(`Giờ mở cửa "${hoursRaw}" cần nhập tay trong admin`);
    noteLines.push(`Giờ mở cửa theo file: ${hoursRaw}`);
  }

  // Prices
  let priceMin = parseVnd(get('priceMin'));
  let priceMax = parseVnd(get('priceMax'));
  if (/nghi sai/i.test(toSearchText(rawNote)) && (priceMin != null || priceMax != null)) {
    warnings.push('Giá ShopeeFood nghi sai, chưa nhập giá');
    noteLines.push(`Giá theo file (nghi sai): ${priceMin ?? '?'}–${priceMax ?? '?'}đ`);
    priceMin = priceMax = null;
  }
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    warnings.push('Giá thấp nhất > giá cao nhất, chưa nhập giá');
    priceMin = priceMax = null;
  }

  // Highlight: ShopeeFood auto-text is a draft for the note, not editorial copy.
  let highlight = str(get('highlight'));
  if (fromShopee && toSearchText(highlight).includes('tren shopeefood')) {
    noteLines.push(`Gợi ý điểm nổi bật (tự trích ShopeeFood): ${highlight}`);
    highlight = '';
  } else if (highlight.length > 160) {
    warnings.push('Điểm nổi bật dài hơn 160 ký tự, đã cắt');
    highlight = highlight.slice(0, 159).trimEnd() + '…';
  }

  // Menu: ShopeeFood items go to the unchecked group (delivery prices).
  const menu = parseMenuCell(str(get('menu'))).map((m) => ({
    group: fromShopee ? UNCHECKED_MENU_GROUP : 'Món nên gọi',
    name: m.name,
    desc: null,
    price: m.price,
    mustTry: !fromShopee,
    photoId: null,
  }));

  const short = (label: string, items: string[]) => {
    if (items.some((s) => s.length > 40) || items.length > 12) warnings.push(`${label}: tối đa 12 mục, mỗi mục 40 ký tự`);
    return items.map((s) => s.slice(0, 40)).slice(0, 12);
  };

  // A phone typed as a number loses its leading 0 in Excel.
  const phoneCell = get('phone');
  const phoneRaw = typeof phoneCell === 'number' ? `0${phoneCell}` : str(phoneCell);
  const phone = /^[0-9 +.()-]{6,20}$/.test(phoneRaw) ? phoneRaw : null;
  if (phoneRaw && !phone) warnings.push(`Số điện thoại "${phoneRaw}" không hợp lệ`);
  const link = (c: Col, label: string) => {
    const v = str(get(c));
    if (!v) return null;
    if (/^https:\/\/\S+$/.test(v) && v.length <= 500) return v;
    warnings.push(`${label} không phải link https hợp lệ`);
    return null;
  };

  const vibes = list(get('vibes'));
  if (vibes.length) noteLines.push(`Tag vibe đề xuất: ${vibes.join(', ')} (biên tập tick đủ 3 tiêu chí mới gắn)`);
  const folder = str(get('photoFolder'));
  if (folder) noteLines.push(`Thư mục ảnh: ${folder}`);

  let venueType = str(get('venueType'));
  if (!venueType) {
    venueType = 'Khác';
    warnings.push('Thiếu loại hình, tạm ghi "Khác"');
  }
  const ward = str(get('ward'));

  const parsed = RestaurantInput.safeParse({
    name,
    venueType,
    address: str(get('address')),
    lat,
    lng,
    district,
    ward: ward || null,
    priceMin,
    priceMax,
    highlight,
    tip: str(get('tip')).slice(0, 255) || null,
    phone,
    grabUrl: link('grabUrl', 'Link GrabFood'),
    shopeeUrl: link('shopeeUrl', 'Link ShopeeFood'),
    editorPick: toSearchText(str(get('editorPick'))) === 'co',
    features: short('Đặc điểm', list(get('features'))),
    amenities: short('Tiện ích', list(get('amenities'))),
    dishes: dishes.slice(0, 6),
    primaryDish,
    hours: hours.slots,
    menu,
    source: 'editor',
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue ? `${issue.path.join('.') || 'dòng'}: ${issue.message}` : 'Dữ liệu không hợp lệ');
  }
  const input = parsed.data;

  // Verification columns: an admin still clicks "Xác minh" (method + person are recorded then).
  const methodRaw = toSearchText(str(get('method')));
  const method = METHODS.find(([re]) => re.test(methodRaw))?.[1] ?? null;
  const verifier = str(get('verifier'));
  const verifiedOnCell = get('verifiedOn');
  const verifiedOn = typeof verifiedOnCell === 'number' ? excelDate(verifiedOnCell) : str(verifiedOnCell);
  const verifiedInFile = !!(method && verifier && verifiedOn);
  if (verifiedInFile) noteLines.push(`File ghi đã xác minh: ${str(get('method'))}, ${verifier}, ${verifiedOn}`);

  const missing = missingForPublish(input);
  const status = verifiedInFile && missing.length === 0 ? 'pending' : 'draft';
  const soft = [...(ward ? [] : ['phường mới']), ...(verifiedInFile ? [] : ['thông tin xác minh'])];

  if (rawNote) noteLines.push(`Ghi chú nội bộ: ${rawNote}`);
  if (warnings.length) noteLines.push(`Cảnh báo khi nhập: ${warnings.join('; ')}`);

  return { row, name, input, error: null, status, missing: [...missing, ...soft], warnings, note: noteLines.join('\n') };
}

/** Identity used to skip rows already in the database (re-running the import is safe). */
export function dedupeKeys(r: Pick<RestaurantInputT, 'name' | 'address' | 'grabUrl' | 'shopeeUrl'>) {
  return {
    links: [r.shopeeUrl, r.grabUrl].filter((u): u is string => !!u).map((u) => u.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase()),
    nameAddress: `${toSearchText(r.name)}|${toSearchText(r.address)}`,
  };
}
