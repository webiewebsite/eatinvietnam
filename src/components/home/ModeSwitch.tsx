'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { clsx } from 'clsx';
import { track } from '@/lib/tracking';

export type Mode = 'near' | 'city';
const OPTIONS: { mode: Mode; label: string }[] = [
  { mode: 'near', label: 'Quanh đây' },
  { mode: 'city', label: 'Khắp Việt Nam' },
];

/** Quanh đây / Khắp Việt Nam. Writes to the URL (push) so Back restores the mode; no full reload. */
export function ModeSwitch({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="tablist" aria-label="Chế độ khám phá" className="grid h-12 grid-cols-2 gap-1 rounded-full bg-sunken p-1">
      {OPTIONS.map((o) => {
        const selected = o.mode === mode;
        return (
          <button
            key={o.mode}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="home-mode-panel"
            onClick={() => {
              if (selected) return;
              track('mode_switch', { to: o.mode });
              startTransition(() => router.push(o.mode === 'city' ? '/?che-do=khap-viet-nam' : '/', { scroll: false }));
            }}
            className={clsx(
              'rounded-full text-[15px] font-bold transition-colors',
              selected ? 'bg-surface text-ink shadow-card' : 'text-muted',
              pending && !selected && 'opacity-60',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
