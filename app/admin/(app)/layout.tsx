import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/admin/AuthForms';
import { LogoMark } from '@/components/Logo';
import { staffPage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const user = await staffPage();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-1 px-4 pt-2 pb-1">
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin" className="flex items-center gap-2 font-display text-[17px] font-extrabold">
              <LogoMark size={26} /> Admin
            </Link>
            <div className="flex items-center gap-1 text-[13px] text-muted">
              <span className="hidden truncate sm:inline">
                {user.displayName} · {user.isAdmin ? 'Quản trị' : `Biên tập (${user.areaSlugs.length} khu)`}
              </span>
              <LogoutButton />
            </div>
          </div>
          <AdminNav isAdmin={user.isAdmin} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[960px] px-4 pt-4 pb-24">{children}</main>
    </>
  );
}
