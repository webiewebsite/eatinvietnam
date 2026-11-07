'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, Map as MapIcon, Search, UserRound } from 'lucide-react';
import { clsx } from 'clsx';
import { track } from '@/lib/tracking';

const TABS = [
  { href: '/', label: 'Khám phá', Icon: Compass, match: (p: string) => p === '/' || p.startsWith('/mon') || p.startsWith('/khu-vuc') },
  { href: '/tim-kiem', label: 'Tìm', Icon: Search, match: (p: string) => p.startsWith('/tim-kiem') },
  { href: '/ban-do', label: 'Bản đồ', Icon: MapIcon, match: (p: string) => p.startsWith('/ban-do') },
  { href: '/da-luu', label: 'Đã lưu', Icon: Heart, match: (p: string) => p.startsWith('/da-luu') },
  { href: '/toi', label: 'Tôi', Icon: UserRound, match: (p: string) => p.startsWith('/toi') },
] as const;

/** 5 tabs; the middle one is the floating MapFab (60px, raised 26px). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-[480px] grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          if (href === '/ban-do') {
            return (
              <li key={href} className="relative flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => track('map_open', { source: 'fab' })}
                  className="flex flex-col items-center"
                >
                  <span
                    className={clsx(
                      'sticker -mt-6.5 grid size-15 place-items-center rounded-full',
                      active ? 'bg-xoai text-on-xoai' : 'bg-thanhlong text-on-thanhlong',
                    )}
                  >
                    <Icon aria-hidden className="size-6.5" strokeWidth={2.2} />
                  </span>
                  <span className={clsx('mt-0.5 text-badge font-semibold', active ? 'text-ink' : 'text-muted')}>{label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-badge font-semibold',
                  active ? 'text-thanhlong' : 'text-muted',
                )}
              >
                <Icon aria-hidden className="size-5.5" strokeWidth={active ? 2.3 : 1.9} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
