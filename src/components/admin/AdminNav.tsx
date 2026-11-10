'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: '/admin', label: 'Quán', active: path === '/admin' || path.startsWith('/admin/quan') },
    { href: '/admin/sap-qua-han', label: 'Sắp quá hạn', active: path.startsWith('/admin/sap-qua-han') },
    ...(isAdmin ? [{ href: '/admin/nguoi-dung', label: 'Người dùng', active: path.startsWith('/admin/nguoi-dung') }] : []),
    { href: '/admin/tai-khoan', label: 'Tài khoản', active: path.startsWith('/admin/tai-khoan') },
  ];
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? 'page' : undefined}
          className={clsx(
            'inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-[14px] font-semibold',
            i.active ? 'bg-ink text-bg' : 'text-muted hover:bg-sunken',
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
