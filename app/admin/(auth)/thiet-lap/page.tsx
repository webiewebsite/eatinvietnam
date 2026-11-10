import type { Metadata } from 'next';
import Link from 'next/link';
import { SetupForm } from '@/components/admin/AuthForms';
import { Notice } from '@/components/admin/ui';
import { setupAvailable } from '@/lib/admin/accounts';

export const metadata: Metadata = { title: 'Thiết lập lần đầu' };

export default function SetupPage() {
  if (!setupAvailable()) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="info">Thiết lập lần đầu đang tắt. Tài khoản mới do quản trị viên mời trong mục Người dùng.</Notice>
        <Link href="/admin/dang-nhap" className="font-semibold text-thanhlong underline">Về trang đăng nhập</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Quản trị viên đầu tiên</h1>
      <p className="text-[14px] text-muted">Chỉ các email đã khai trong hPanel (ADMIN_BOOTSTRAP_EMAILS) dùng được trang này, mỗi email một lần.</p>
      <SetupForm />
    </div>
  );
}
