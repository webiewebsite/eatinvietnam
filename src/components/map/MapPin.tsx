'use client';

import { clsx } from 'clsx';
import type { CardData } from '@/lib/restaurants';

/** Dish-label pin. Selected = bigger, mango sticker with rating; others = white pill. */
export function MapPin({
  card,
  selected,
  onSelect,
}: {
  card: CardData;
  selected: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${card.name}, ${card.dishLabel}, ${card.distanceLabel}`}
      onClick={() => onSelect(card.slug)}
      className={clsx(
        'relative -translate-x-1/2 -translate-y-full rounded-full border-2 border-line-strong px-2.5 py-1 text-[12px] font-bold whitespace-nowrap transition-transform',
        selected ? 'z-20 scale-110 bg-xoai text-on-xoai shadow-sticker' : 'z-10 bg-surface text-ink shadow-card',
      )}
    >
      {card.dishLabel}
      {selected && card.rating.count >= 10 && <span className="ml-1">★{card.rating.avg.toFixed(1)}</span>}
      <span
        aria-hidden
        className={clsx(
          'absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1 rotate-45 border-r-2 border-b-2 border-line-strong',
          selected ? 'bg-xoai' : 'bg-surface',
        )}
      />
    </button>
  );
}
