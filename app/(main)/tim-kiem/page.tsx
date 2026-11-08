import type { Metadata } from 'next';
import { Map as MapIcon } from 'lucide-react';
import { AiQueryStrip } from '@/components/AiQueryStrip';
import { FilterBar } from '@/components/FilterBar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { TrackedLink } from '@/components/TrackedLink';
import { LocationPrompt } from '@/components/LocationPrompt';
import { EmptyState } from '@/components/ui/EmptyState';
import { currentDate } from '@/lib/hours';
import { getViewerLocation } from '@/lib/location-server';
import { searchRestaurants, toCard } from '@/lib/restaurants';
import { filtersToQuery, hasAnyFilter, readSearchParams } from '@/lib/search/url';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tìm quán',
  robots: { index: false },
};

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const { q, filters, page } = readSearchParams(await searchParams);
  const searched = hasAnyFilter(filters);
  const origin = await getViewerLocation();
  const now = currentDate();
  const { items, total, radiusIgnored } = searchRestaurants(filters, { origin, now, limit: PAGE_SIZE * page });
  const cards = items.map((h) => toCard(h, now));
  const query = filtersToQuery(filters);

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-2 bg-bg/95 px-3 pt-3 pb-2 backdrop-blur">
        <div id="o-tim" className="scroll-mt-20">
          <SearchBar variant="compact" defaultValue={q} autoFocus={!searched} key={q} />
        </div>
        <FilterBar filters={filters} basePath="/tim-kiem" />
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <AiQueryStrip q={q} filters={filters} />

        {searched ? (
          <>
            <p className="text-meta text-muted" aria-live="polite">
              <strong className="text-ink">{total} quán</strong> · sắp theo{' '}
              {filters.sort === 'rating' ? 'đánh giá' : origin ? 'khoảng cách' : 'gợi ý của biên tập'}
            </p>
            {!origin && (
              <LocationPrompt
                hint={radiusIgnored ? `Cần vị trí để lọc “trong ${filters.radiusKm} km”.` : 'Để sắp quán theo khoảng cách.'}
              />
            )}
            {cards.length ? (
              <ul className="divide-y divide-line">
                {cards.map((c) => (
                  <li key={c.slug}>
                    <RestaurantCard card={c} variant="row" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Chưa có quán phù hợp"
                hint="Thử bỏ bớt bộ lọc trong dải “Hiểu là” hoặc đổi từ khóa."
                action={
                  <Link href="/tim-kiem" className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-bold text-surface">
                    Xóa bộ lọc
                  </Link>
                }
              />
            )}
            {total > cards.length && (
              <Link
                href={`/tim-kiem${query}${query ? '&' : '?'}trang=${page + 1}`}
                scroll={false}
                className="mx-auto inline-flex h-11 items-center rounded-full border-2 border-line-strong bg-surface px-5 font-bold"
              >
                Xem thêm quán
              </Link>
            )}
          </>
        ) : (
          <EmptyState
            title="Bạn đang thèm gì?"
            hint="Gõ như nói chuyện: “bún bò gần đây dưới 60k”, “ăn khuya quận 4”, “cà phê đang mở”."
          />
        )}
      </div>

      {searched && cards.length > 0 && (
        <TrackedLink
          href={`/ban-do${query}`}
          event="map_open"
          props={{ source: 'results' }}
          className="fixed bottom-24 left-1/2 z-30 inline-flex h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4.5 text-[14px] font-bold text-surface shadow-card"
        >
          <MapIcon aria-hidden className="size-4.5" />
          Xem bản đồ
        </TrackedLink>
      )}
    </>
  );
}
