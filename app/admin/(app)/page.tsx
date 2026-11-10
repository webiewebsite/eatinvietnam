import type { Metadata } from 'next';
import Link from 'next/link';
import { RestaurantList } from '@/components/admin/RestaurantList';
import { inputClass } from '@/components/admin/ui';
import { staffPage } from '@/lib/admin/guard';
import { listAdminRestaurants, listAreas } from '@/lib/admin/restaurants';
import { STATUS_LABEL } from '@/lib/admin/schemas';
import { currentDate } from '@/lib/hours';

export const metadata: Metadata = { title: 'Quán' };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminHome({ searchParams }: Props) {
  const user = await staffPage();
  const sp = await searchParams;
  const now = currentDate();
  const [rows, areaRows] = await Promise.all([
    listAdminRestaurants(user, { q: sp.q?.slice(0, 80), status: sp.trang_thai, district: sp.quan }, now),
    listAreas(),
  ]);
  const districts = areaRows.filter((a) => a.kind === 'legacy_district' && (user.isAdmin || user.areaIds.includes(a.id)));
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1 font-extrabold">Quán</h1>
        <Link href="/admin/quan/moi" className="inline-flex min-h-11 items-center rounded-input bg-thanhlong px-4 text-[14px] font-semibold text-on-thanhlong">
          + Thêm quán
        </Link>
      </div>
      {!user.isAdmin && !user.areaIds.length && (
        <p className="rounded-input border border-xoai bg-xoai-soft px-3 py-2 text-[14px]">Bạn chưa được giao khu vực nào. Nhờ quản trị viên giao khu trong mục Người dùng.</p>
      )}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_180px_180px_auto]" role="search">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Tìm tên quán, món…" className={`${inputClass} col-span-2 sm:col-span-1`} />
        <select name="trang_thai" defaultValue={sp.trang_thai ?? ''} className={inputClass} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="quan" defaultValue={sp.quan ?? ''} className={inputClass} aria-label="Quận">
          <option value="">Mọi quận</option>
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="col-span-2 min-h-11 rounded-input border border-line bg-surface px-4 text-[14px] font-semibold sm:col-span-1">Lọc</button>
      </form>
      <p className="text-[13px] text-muted">
        {rows.length} quán
        {Object.keys(counts).length > 0 &&
          ` · ${Object.entries(counts)
            .map(([s, n]) => `${STATUS_LABEL[s] ?? s}: ${n}`)
            .join(' · ')}`}
      </p>
      <RestaurantList rows={rows} now={now} empty="Không có quán nào khớp bộ lọc." />
    </div>
  );
}
