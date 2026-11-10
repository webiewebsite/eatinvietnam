import type { Metadata } from 'next';
import { RestaurantList } from '@/components/admin/RestaurantList';
import { staffPage } from '@/lib/admin/guard';
import { DUE_SOON_DAYS, listAdminRestaurants } from '@/lib/admin/restaurants';
import { currentDate } from '@/lib/hours';
import { REVERIFY_DAYS } from '@/lib/verification';

export const metadata: Metadata = { title: 'Sắp quá hạn xác minh' };

/** Decision A: the in-admin list (the Monday email sends the same list per area). */
export default async function DuePage() {
  const user = await staffPage();
  const now = currentDate();
  const rows = await listAdminRestaurants(user, { due: true }, now);
  const overdue = rows.filter((r) => !r.reverifyDueAt || new Date(r.reverifyDueAt) <= now).length;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Sắp quá hạn xác minh</h1>
      <p className="text-[14px] text-muted">
        Quán phải được xác minh lại {REVERIFY_DAYS} ngày một lần. Quá hạn thì trang quán hiện nhãn &quot;Chưa cập nhật&quot;. Danh sách gồm quán đã quá
        hạn ({overdue}) và quán đến hạn trong {DUE_SOON_DAYS} ngày tới{user.isAdmin ? '' : ', trong khu bạn phụ trách'}. Mỗi sáng thứ Hai, mỗi
        người nhận email tóm tắt cùng danh sách này.
      </p>
      <RestaurantList rows={rows} now={now} empty="Không có quán nào sắp quá hạn." />
    </div>
  );
}
