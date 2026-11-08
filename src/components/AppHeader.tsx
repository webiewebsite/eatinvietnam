import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { SavedBadgeLink } from '@/components/SavedBadgeLink';

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between">
      <Link href="/" aria-label="EatInVietnam — Trang chủ" className="-ml-1 rounded-input p-1">
        <Logo />
      </Link>
      <SavedBadgeLink />
    </header>
  );
}
