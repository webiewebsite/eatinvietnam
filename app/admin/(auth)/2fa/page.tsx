import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LogoutButton, TwoFactorForm } from '@/components/admin/AuthForms';
import { readSession } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Xác thực 2 bước' };

export default async function TwoFactorPage() {
  const s = await readSession();
  if (!s) redirect('/admin/dang-nhap');
  if (s.twoFactorPassed) redirect('/admin');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-extrabold">Xác thực 2 bước</h1>
      <TwoFactorForm enrolled={s.user.totpEnabled} email={s.user.email} />
      <LogoutButton />
    </div>
  );
}
