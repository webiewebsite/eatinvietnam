/**
 * Imports the ops restaurant sheet (.xlsx, sheet "Quán") as drafts (#48).
 *
 *   npm run db:import -- <file.xlsx> --as <admin email>            # dry run: report only
 *   npm run db:import -- <file.xlsx> --as <admin email> --apply    # write to DATABASE_URL
 *   options: --report <out.csv> (default: <file>.import-report.csv)
 *
 * Without DATABASE_URL a dry run still checks the file (no de-duplication against the DB).
 *
 * Never publishes: rows become `draft` (or `pending` when complete + verified in the file).
 * Re-running skips restaurants already in the database (same ShopeeFood/GrabFood link, or
 * same name + address), so a corrected file can be imported again.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { restaurants, users } from '@/db/schema';
import { audit } from '@/lib/admin/audit';
import { saveRestaurant, setRestaurantStatus } from '@/lib/admin/restaurants';
import { loadAdminUser } from '@/lib/admin/session';
import { SHEET_NAME, dedupeKeys, parseSheet, type ImportRow } from '@/lib/import/sheet';
import { Workbook } from '@/lib/import/xlsx';

function args(argv: string[]) {
  const out: { file?: string; as?: string; apply: boolean; report?: string } = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--apply') out.apply = true;
    else if (a === '--as') out.as = argv[++i];
    else if (a === '--report') out.report = argv[++i];
    else if (!a.startsWith('--')) out.file = a;
  }
  return out;
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function writeReport(path: string, rows: (ImportRow & { result: string })[]) {
  const header = ['Dòng', 'Tên quán', 'Quận', 'Kết quả', 'Trạng thái', 'Còn thiếu để xác minh', 'Cảnh báo / lỗi'];
  const lines = rows.map((r) =>
    [
      r.row,
      r.name,
      r.input?.district ?? '',
      r.result,
      r.input ? (r.status === 'pending' ? 'Chờ duyệt' : 'Nháp') : '',
      r.missing.join('; '),
      [r.error, ...r.warnings].filter(Boolean).join('; '),
    ]
      .map(csvCell)
      .join(','),
  );
  // BOM so Excel opens the UTF-8 file with Vietnamese intact.
  writeFileSync(path, `﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`);
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.file || !a.as) {
    console.error('Usage: npm run db:import -- <file.xlsx> --as <admin email> [--apply] [--report out.csv]');
    process.exit(2);
  }
  const file = basename(a.file);
  const wb = new Workbook(readFileSync(a.file));
  if (!wb.sheets.has(SHEET_NAME)) throw new Error(`File không có sheet "${SHEET_NAME}" (có: ${[...wb.sheets.keys()].join(', ')})`);
  const parsed = parseSheet(wb.rows(SHEET_NAME), { file });

  const online = !!process.env.DATABASE_URL;
  if (a.apply && !online) throw new Error('--apply cần DATABASE_URL');
  const db = online ? getDb() : null;
  let user: Awaited<ReturnType<typeof loadAdminUser>> = null;
  if (db) {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, a.as.trim().toLowerCase())).limit(1);
    user = u ? await loadAdminUser(u.id) : null;
    if (!user?.isAdmin) throw new Error(`${a.as} không phải tài khoản admin đang hoạt động`);
  }

  // Existing restaurants, for de-duplication.
  const existing = db
    ? await db
        .select({ name: restaurants.name, address: restaurants.address, grabUrl: restaurants.grabUrl, shopeeUrl: restaurants.shopeeUrl })
        .from(restaurants)
    : [];
  const seenLinks = new Set<string>();
  const seenNameAddress = new Set<string>();
  const remember = (r: Parameters<typeof dedupeKeys>[0]) => {
    const k = dedupeKeys(r);
    k.links.forEach((l) => seenLinks.add(l));
    seenNameAddress.add(k.nameAddress);
  };
  existing.forEach(remember);

  const results: (ImportRow & { result: string })[] = [];
  let created = 0;
  for (const r of parsed) {
    if (!r.input) {
      results.push({ ...r, result: 'Lỗi, bỏ qua' });
      continue;
    }
    const k = dedupeKeys(r.input);
    if (k.links.some((l) => seenLinks.has(l)) || seenNameAddress.has(k.nameAddress)) {
      results.push({ ...r, result: 'Đã có, bỏ qua' });
      continue;
    }
    remember(r.input);
    if (!a.apply || !db || !user) {
      results.push({ ...r, result: 'Sẽ tạo' });
      continue;
    }
    const { id, slug } = await saveRestaurant(user, null, r.input, { revalidate: false });
    await audit(db, { userId: user.id, action: 'import', entity: 'restaurant', entityId: id, diff: { file, row: r.row, note: r.note } });
    if (r.status === 'pending') await setRestaurantStatus(user, id, { action: 'submit' }, new Date(), { revalidate: false });
    created++;
    results.push({ ...r, result: `Đã tạo /admin/quan/${id} (${slug})` });
  }

  const reportPath = a.report ?? `${a.file.replace(/\.xlsx$/i, '')}.import-report.csv`;
  writeReport(reportPath, results);

  const count = (f: (r: (typeof results)[number]) => boolean) => results.filter(f).length;
  const byDistrict = Object.entries(
    results.reduce<Record<string, number>>((acc, r) => {
      if (r.input) acc[r.input.district] = (acc[r.input.district] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([d, n]) => `${d}: ${n}`)
    .join(', ');
  const total = db
    ? ((await db.select({ n: sql<number>`COUNT(*)`.mapWith(Number) }).from(restaurants))[0]?.n ?? 0)
    : 'không kết nối DB (chưa so trùng)';
  console.warn(
    [
      `${a.apply ? 'ĐÃ GHI' : 'CHẠY THỬ (thêm --apply để ghi)'} — ${file}`,
      `  Dòng có dữ liệu: ${results.length} (${byDistrict || 'không có'})`,
      `  ${a.apply ? 'Đã tạo' : 'Sẽ tạo'}: ${a.apply ? created : count((r) => r.result === 'Sẽ tạo')}` +
        ` · đã có: ${count((r) => r.result.startsWith('Đã có'))} · lỗi: ${count((r) => !r.input)}`,
      `  Chờ duyệt (đủ thông tin + đã xác minh trong file): ${count((r) => !!r.input && r.status === 'pending')}`,
      `  Dùng tọa độ tạm: ${count((r) => r.warnings.includes('Dùng tọa độ tạm của quận'))} · thiếu giờ mở: ${count((r) => !!r.input && r.input.hours.length === 0)} · thiếu món: ${count((r) => !!r.input && r.input.dishes.length === 0)}`,
      `  Quán trong DB: ${total}`,
      `  Báo cáo từng dòng: ${reportPath}`,
    ].join('\n'),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
