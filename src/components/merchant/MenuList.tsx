'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { formatPrice } from '@/lib/format';
import type { MenuItem } from '@/lib/types';

/** Group chips + rows: text left, 64px thumb right. */
export function MenuList({ items, dish }: { items: MenuItem[]; dish: string }) {
  const groups = [...new Set(items.map((i) => i.group))];
  const [group, setGroup] = useState<string | null>(null);
  const shown = group ? items.filter((i) => i.group === group) : items;

  return (
    <div>
      <div role="group" aria-label="Nhóm món" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 py-1">
        {groups.map((g) => {
          const count = items.filter((i) => i.group === g).length;
          const on = group === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => setGroup(on ? null : g)}
              className={clsx(
                'inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-semibold',
                on ? 'border-line-strong bg-xoai text-on-xoai' : 'border-line bg-surface',
              )}
            >
              {g} · {count}
            </button>
          );
        })}
      </div>
      <ul className="mt-1 divide-y divide-line">
        {shown.map((m) => (
          <li key={`${m.group}-${m.name}`} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{m.name}</p>
              {m.desc && <p className="text-[13px] text-muted">{m.desc}</p>}
              <p className="mt-0.5 text-[14px] font-bold">{formatPrice(m.price)}</p>
            </div>
            {m.photo && <RestaurantPhoto photo={m.photo} dish={dish} sizes="64px" className="size-16 shrink-0" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
