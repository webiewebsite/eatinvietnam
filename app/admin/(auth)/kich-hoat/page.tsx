import type { Metadata } from 'next';
import Link from 'next/link';
import { ActivateForm } from '@/components/admin/AuthForms';
import { Notice } from '@/components/admin/ui';
import { tokenInfo } from '@/lib/admin/accounts';

export const metadata: Metadata = { title: 'Đặt mật khẩu', referrer: 'no-referrer' };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ActivatePage({ searchParams }: Props) {
  const token = (await searchParams).token ?? '';
  const info = process.env.DATABASE_URL ? await tokenInfo(token) : null;
  if (!info) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="warn">Link đã hết hạn, đã được dùng hoặc không đúng. Nhờ quản trị viên tạo link mới.</Notice>
        <Link href="/admin/dang-nhap" className="font-semibold text-thanhlong underline">Về trang đăng nhập</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">{info.purpose === 'invite' ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu'}</h1>
      <ActivateForm token={token} email={info.email} displayName={info.displayName} />
    </div>
  );
}
