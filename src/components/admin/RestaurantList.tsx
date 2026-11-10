import Link from 'next/link';
import type { AdminListRow } from '@/lib/admin/restaurants';
import { viDate } from '@/lib/admin/time';
import { StatusBadge } from './ui';

export function RestaurantList({ rows, now, empty }: { rows: AdminListRow[]; now: Date; empty: React.ReactNode }) {
  if (!rows.length) return <div className="rounded-card border border-dashed border-line p-6 text-center text-[14px] text-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {rows.map((r) => {
        const due = r.status === 'verified' ? r.reverifyDueAt : null;
        const overdue = r.status === 'verified' && (!due || new Date(due) <= now);
        return (
          <li key={r.id}>
            <Link href={`/admin/quan/${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-sunken">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                <span className="block truncate text-[12px] text-muted">
                  {r.district ?? 'Chưa có quận'} · sửa {viDate(r.updatedAt)}
                  {r.updatedByName ? ` bởi ${r.updatedByName}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={r.status} />
                {r.status === 'verified' && (
                  <span className={overdue ? 'text-[12px] font-semibold text-danger' : 'text-[12px] text-muted'}>
                    {overdue ? 'Quá hạn xác minh' : `Hạn ${viDate(due)}`}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
