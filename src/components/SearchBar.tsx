'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { track } from '@/lib/tracking';

const PLACEHOLDER = {
  near: 'Thèm món nước, gần đây, dưới 50k…',
  city: 'Đặc sản Hà Nội, Huế… hoặc món vùng miền ở Sài Gòn',
  map: 'Tìm món trên bản đồ…',
} as const;

/** Natural-language search box. Enter → /tim-kiem?q= (or stays on /ban-do for the map variant). */
export function SearchBar({
  mode = 'near',
  variant = 'home',
  defaultValue = '',
  autoFocus = false,
}: {
  mode?: 'near' | 'city';
  variant?: 'home' | 'compact' | 'map';
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const id = useId();
  const placeholder = variant === 'map' ? PLACEHOLDER.map : PLACEHOLDER[mode];

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        track('search', { source: variant, length: q.length });
        const target = variant === 'map' ? '/ban-do' : '/tim-kiem';
        router.push(`${target}?q=${encodeURIComponent(q)}`);
      }}
      className={clsx(
        // The input hides its own outline, so the whole pill carries the focus ring.
        'flex items-center gap-2 bg-surface pr-1.5 pl-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-thanhlong',
        variant === 'home' ? 'h-12 rounded-full border border-line shadow-card' : 'h-11 rounded-full border border-line',
        variant === 'map' && 'shadow-card',
      )}
    >
      <label htmlFor={id} className="sr-only">
        Tìm quán hoặc món
      </label>
      <Search aria-hidden className="size-5 shrink-0 stroke-ink" strokeWidth={2} />
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
      />
      {variant === 'home' && (
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-thanhlong-soft px-2 py-1 text-badge font-bold text-thanhlong min-[375px]:inline-flex">
          <Sparkles aria-hidden className="size-3.5" />
          AI
        </span>
      )}
    </form>
  );
}
