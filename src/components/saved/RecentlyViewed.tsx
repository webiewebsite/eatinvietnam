'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import type { CardData } from '@/lib/restaurants';
import { useSavedStore } from '@/lib/saved';

export function RecentlyViewed() {
  const { recent } = useSavedStore();
  const key = recent.join(',');
  const [cards, setCards] = useState<CardData[]>([]);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/restaurants?slugs=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: CardData[] }) => setCards(d.items))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);

  return (
    <section aria-labelledby="recent">
      <h2 id="recent" className="font-display text-section font-bold">
        Quán đã xem gần đây
      </h2>
      {key && cards.length ? (
        <ul className="snap-rail -mx-4 mt-2 gap-3 px-4">
          {cards.map((c) => (
            <li key={c.slug} className="w-28 shrink-0">
              <Link href={`/quan/${c.slug}`}>
                <RestaurantPhoto photo={c.photo} dish={c.dish} sizes="112px" className="aspect-square" />
                <p className="mt-1 line-clamp-2 text-[13px] leading-tight font-semibold">{c.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[14px] text-muted">Chưa xem quán nào trên máy này.</p>
      )}
    </section>
  );
}
