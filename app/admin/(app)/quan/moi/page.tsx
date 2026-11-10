import type { Metadata } from 'next';
import Link from 'next/link';
import { RestaurantCreator } from '@/components/admin/RestaurantEditor';
import { Notice } from '@/components/admin/ui';
import { staffPage } from '@/lib/admin/guard';
import { listAreas } from '@/lib/admin/restaurants';

export const metadata: Metadata = { title: 'Thêm quán' };

export default async function NewRestaurantPage() {
  const user = await staffPage();
  const areaRows = await listAreas();
  const districts = areaRows.filter((a) => a.kind === 'legacy_district' && (user.isAdmin || user.areaIds.includes(a.id)));
  if (!districts.length) return <Notice tone="warn">Bạn chưa được giao khu vực nào nên chưa thêm quán được.</Notice>;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin" className="text-[13px] font-semibold text-muted">
          ← Danh sách quán
        </Link>
        <h1 className="text-h1 font-extrabold">Thêm quán</h1>
      </div>
      <RestaurantCreator
        districts={districts.map((a) => ({ slug: a.slug, name: a.name }))}
        wards={areaRows.filter((a) => a.kind === 'ward').map((a) => a.name)}
        defaultDistrict={districts.length === 1 ? districts[0]!.slug : ''}
      />
    </div>
  );
}
