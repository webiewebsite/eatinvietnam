import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/AuthForms';
import { Notice } from '@/components/admin/ui';
import { setupAvailable } from '@/lib/admin/accounts';
import { readSession } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default async function LoginPage() {
  if (!process.env.DATABASE_URL) {
    return <Notice tone="warn">Admin cần database. Máy chủ này đang chạy dữ liệu demo (chưa có DATABASE_URL).</Notice>;
  }
  const s = await readSession();
  if (s) redirect(s.twoFactorPassed ? '/admin' : '/admin/2fa');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Đăng nhập</h1>
      <LoginForm />
      <p className="text-[13px] text-muted">
        Quên mật khẩu? Nhờ quản trị viên tạo link đặt lại trong mục Người dùng.
        {setupAvailable() && (
          <>
            {' '}
            Quản trị viên đầu tiên: <Link href="/admin/thiet-lap" className="font-semibold text-thanhlong underline">thiết lập tài khoản</Link>.
          </>
        )}
      </p>
    </div>
  );
}
