import type { Metadata } from 'next';
import { PasswordForm, TwoFactorSettings } from '@/components/admin/AuthForms';
import { Card } from '@/components/admin/ui';
import { staffPage } from '@/lib/admin/guard';
import { twoFactorRequired } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Tài khoản' };

export default async function AccountPage() {
  const user = await staffPage();
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Tài khoản</h1>
      <Card title="Thông tin">
        <p className="text-[14px]">
          {user.displayName} · {user.email}
          <br />
          <span className="text-muted">{user.isAdmin ? 'Quản trị viên' : `Biên tập · khu: ${user.areaSlugs.join(', ') || 'chưa giao'}`}</span>
        </p>
      </Card>
      <Card title="Xác thực 2 bước">
        <TwoFactorSettings enabled={user.totpEnabled} required={twoFactorRequired()} email={user.email} />
      </Card>
      <Card title="Đổi mật khẩu">
        <PasswordForm />
      </Card>
    </div>
  );
}
