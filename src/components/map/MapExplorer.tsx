'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import { FilterBar } from '@/components/FilterBar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { FallbackMap } from '@/components/map/FallbackMap';
import type { MapHandle } from '@/components/map/types';
import { distanceFields } from '@/lib/distance';
import { inBBox, type BBox } from '@/lib/geo';
import { requestViewerLocation, useViewerLocation } from '@/lib/location-client';
import type { CardData } from '@/lib/restaurants';
import { track } from '@/lib/tracking';
import type { SearchFilters } from '@/lib/types';

// Mapbox (~200 KB gz) is fetched only on this route and only with a token.
const MapboxView = dynamic(() => import('@/components/map/MapboxView'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sunken" />,
});
const HAS_TOKEN = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function MapExplorer({ cards: all, filters, q }: { cards: CardData[]; filters: SearchFilters; q: string }) {
  const mapRef = useRef<MapHandle>(null);
  const carousel = useRef<HTMLUListElement>(null);
  // Same rounded location (cookie) every other screen uses → identical distances.
  const user = useViewerLocation();
  const [area, setArea] = useState<BBox | null>(null);
  const [moved, setMoved] = useState(false);
  const [selected, setSelected] = useState<string | null>(all[0]?.slug ?? null);
  const [geoDenied, setGeoDenied] = useState(false);

  // The map is the one screen allowed to ask on arrival. Denied → no distances, pins stay.
  const locate = useCallback(() => {
    requestViewerLocation().then(
      () => setGeoDenied(false),
      () => setGeoDenied(true),
    );
  }, []);
  useEffect(() => {
    if (!user) locate();
    // Only on arrival; later the button asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    const inArea = all.filter((c) => !area || inBBox(c, area)).map((c) => ({ ...c, ...distanceFields(user, c) }));
    // No location: keep the server's editorial order.
    return user ? inArea.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) : inArea;
  }, [all, user, area]);

  const select = useCallback((slug: string) => {
    setSelected(slug);
    track('map_pin_select', { slug });
    const el = carousel.current?.querySelector<HTMLElement>(`[data-slug="${slug}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  // Swiping the carousel moves the selected pin.
  useEffect(() => {
    const root = carousel.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setSelected((visible.target as HTMLElement).dataset.slug ?? null);
      },
      { root, threshold: 0.75 },
    );
    root.querySelectorAll('[data-slug]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cards]);

  const searchHere = () => {
    const b = mapRef.current?.getBounds();
    if (!b) return;
    setArea(b);
    setMoved(false);
    track('search', { source: 'map' });
  };

  const mapProps = { ref: mapRef, cards, selected, onSelect: select, user, onMoved: () => setMoved(true) };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))] mx-auto max-w-[480px] overflow-hidden">
      <div className="absolute inset-0">{HAS_TOKEN ? <MapboxView {...mapProps} /> : <FallbackMap {...mapProps} />}</div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto">
          <SearchBar variant="map" defaultValue={q} key={q} />
        </div>
        <div className="pointer-events-auto">
          <FilterBar filters={filters} basePath="/ban-do" variant="map" />
        </div>
        {moved && (
          <button
            type="button"
            onClick={searchHere}
            className="pointer-events-auto mx-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-bold text-surface shadow-card"
          >
            <Search aria-hidden className="size-4" /> Tìm trong khu vực này
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="rounded-full bg-surface/95 px-3 py-1 text-[13px] font-semibold shadow-card" aria-live="polite">
            {cards.length} quán{area ? ' · trong khu vực' : user ? ' · gần bạn' : ''}
          </p>
          <button
            type="button"
            onClick={locate}
            aria-label="Về vị trí của tôi"
            className="grid size-11 place-items-center rounded-full bg-surface shadow-card"
          >
            <LocateFixed aria-hidden className={user ? 'size-5 text-vitri' : 'size-5'} />
          </button>
        </div>
        {geoDenied && !user && (
          <p className="mx-3 mb-2 rounded-input bg-surface/95 px-3 py-1.5 text-[12px] text-muted shadow-card">
            Không lấy được vị trí nên chưa hiện khoảng cách. Bấm nút định vị để thử lại.
          </p>
        )}
        <ul ref={carousel} aria-label="Quán trên bản đồ" className="snap-rail gap-2.5 px-3 scroll-px-3">
          {cards.map((c) => (
            <li key={c.slug} data-slug={c.slug} className={c.slug === selected ? 'rounded-card ring-2 ring-line-strong' : undefined}>
              <RestaurantCard card={c} variant="map" />
            </li>
          ))}
          {cards.length === 0 && (
            <li className="w-full rounded-card bg-surface p-4 text-center text-[14px] shadow-card">
              Chưa có quán phù hợp — thử bỏ bớt bộ lọc.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
