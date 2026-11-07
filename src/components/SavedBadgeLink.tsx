'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useSavedStore } from '@/lib/saved';

export function SavedBadgeLink() {
  const { items } = useSavedStore();
  const count = items.length;
  return (
    <Link
      href="/da-luu"
      aria-label={count ? `Đã lưu, ${count} quán` : 'Đã lưu'}
      className="relative grid size-11 place-items-center rounded-full bg-surface shadow-card"
    >
      <Heart aria-hidden className="size-5 stroke-ink" strokeWidth={1.9} />
      {/* Badge space is always reserved so it never shifts layout after hydration. */}
      <span
        aria-hidden
        className={
          count
            ? 'absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-bg bg-thanhlong px-1 text-badge font-bold text-on-thanhlong'
            : 'hidden'
        }
      >
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
