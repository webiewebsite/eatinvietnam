import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { History } from '@/components/admin/History';
import { RestaurantEditor } from '@/components/admin/RestaurantEditor';
import { Notice } from '@/components/admin/ui';
import { canEditAreas, staffPage } from '@/lib/admin/guard';
import { getAdminRestaurant, listAreas, restaurantHistory } from '@/lib/admin/restaurants';
import { r2Configured } from '@/lib/admin/storage';

export const metadata: Metadata = { title: 'Sửa quán' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ moi?: string }> };

export default async function EditRestaurantPage({ params, searchParams }: Props) {
  const user = await staffPage();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [r, areaRows, history] = await Promise.all([getAdminRestaurant(id), listAreas(), restaurantHistory(id)]);
  if (!r) notFound();
  if (!canEditAreas(user, r.areaIds)) {
    return <Notice tone="warn">Quán này nằm ngoài khu vực bạn phụ trách.</Notice>;
  }
  const fresh = (await searchParams).moi === '1';
  const districts = areaRows.filter((a) => a.kind === 'legacy_district' && (user.isAdmin || user.areaIds.includes(a.id)));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin" className="text-[13px] font-semibold text-muted">
          ← Danh sách quán
        </Link>
        <h1 className="text-h1 font-extrabold">{r.input.name}</h1>
      </div>
      {fresh && <Notice tone="ok">Đã tạo quán ở trạng thái nháp. Thêm ảnh, kiểm tra giờ mở và thực đơn, rồi xác minh để đăng.</Notice>}
      <RestaurantEditor
        data={{ ...r }}
        districts={districts.map((a) => ({ slug: a.slug, name: a.name }))}
        wards={areaRows.filter((a) => a.kind === 'ward').map((a) => a.name)}
        r2Ready={r2Configured()}
        history={<History entries={history} />}
      />
    </div>
  );
}
