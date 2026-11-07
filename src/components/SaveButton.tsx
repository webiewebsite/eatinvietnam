'use client';

import { Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { isSaved, toggleSaved, useSavedStore } from '@/lib/saved';
import { track } from '@/lib/tracking';

export function SaveButton({
  slug,
  name,
  variant = 'plain',
  className,
}: {
  slug: string;
  name: string;
  variant?: 'plain' | 'overlay';
  className?: string;
}) {
  const store = useSavedStore();
  const saved = isSaved(store, slug);
  const [blocked, setBlocked] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu quán ${name}` : `Lưu quán ${name}`}
      title={blocked ? 'Trình duyệt đang chặn lưu trữ, không lưu được quán' : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = toggleSaved(slug);
        if (next === null) return setBlocked(true);
        track('save', { slug, saved: next });
      }}
      className={clsx(
        'grid size-11 shrink-0 place-items-center rounded-full transition-colors',
        variant === 'overlay' ? 'bg-surface/95 shadow-card' : 'hover:bg-sunken',
        className,
      )}
    >
      <Heart
        aria-hidden
        className={clsx('size-5', saved ? 'fill-thanhlong stroke-thanhlong' : 'stroke-ink')}
        strokeWidth={1.9}
      />
    </button>
  );
}
