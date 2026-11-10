import type { Metadata } from 'next';
import { UsersManager } from '@/components/admin/UsersManager';
import { listUsers } from '@/lib/admin/accounts';
import { staffPage } from '@/lib/admin/guard';
import { listAreas } from '@/lib/admin/restaurants';

export const metadata: Metadata = { title: 'Người dùng' };

export default async function UsersPage() {
  const me = await staffPage({ admin: true });
  const [users, areaRows] = await Promise.all([listUsers(), listAreas()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Người dùng</h1>
      <p className="text-[14px] text-muted">
        Mỗi người một tài khoản. Khi ai đó nghỉ, khóa tài khoản trong ngày: họ bị đăng xuất ngay. Mọi thay đổi đều ghi vào nhật ký.
      </p>
      <UsersManager
        users={users}
        meId={me.id}
        areas={areaRows.map((a) => ({ slug: a.slug, name: a.name, kind: a.kind }))}
      />
    </div>
  );
}
