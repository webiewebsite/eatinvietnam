import Link from 'next/link';
import { Map as MapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { FaqList } from '@/components/FaqList';
import { DishBadge } from '@/components/icons/food/FoodIcon';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { TrackedLink } from '@/components/TrackedLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { Rating } from '@/components/ui/Rating';
import { formatPriceRange } from '@/lib/format';
import type { RestaurantHit } from '@/lib/cards';
import { faqJsonLd, jsonLdString, breadcrumbJsonLd } from '@/lib/seo';
import { DISTRICTS, getGroup, type Dish } from '@/lib/taxonomy';
import { isLateNight } from '@/lib/hours';
import dishCopy from '@content/dishes.json';

type Copy = { title: string; intro: string; faq: { q: string; a: string }[] };

export function getDishCopy(dish: Dish): Copy {
  const c = (dishCopy as unknown as Record<string, Copy | undefined>)[dish.slug];
  return (
    c ?? {
      title: `${dish.label} ngon ở Sài Gòn`,
      intro: `[Mô tả biên tập về ${dish.label.toLowerCase()}: hương vị, cách ăn, khác biệt ở Sài Gòn.]`,
      faq: [{ q: `${dish.label} ở Sài Gòn giá bao nhiêu?`, a: '[Câu trả lời biên tập]' }],
    }
  );
}

/** Dish landing page (dish × optional district) — SEO entry for domestic travellers. */
export function DishLanding({ dish, district, hits }: { dish: Dish; district?: string; hits: RestaurantHit[] }) {
  const copy = getDishCopy(dish);
  const group = getGroup(dish.group);
  const districtName = DISTRICTS.find((d) => d.slug === district)?.label;
  const prices = hits.flatMap((h) => [h.restaurant.priceMin, h.restaurant.priceMax]).filter((p): p is number => p != null);
  const typical = prices.length ? formatPriceRange(Math.min(...prices), Math.max(...prices)) : null;
  const title = districtName ? `${dish.label} ngon ở ${districtName}` : copy.title;

  // "auto:late" answers are generated from opening hours.
  const lateNames = hits.filter((h) => isLateNight(h.restaurant.hours)).map((h) => h.restaurant.name);
  const faq = copy.faq.map((f) =>
    f.a === 'auto:late'
      ? { q: f.q, a: lateNames.length ? `Mở khuya: ${lateNames.join(', ')}.` : 'Chưa có quán mở khuya trong danh sách.' }
      : f,
  );

  const path = districtName ? `/khu-vuc/${district}/${dish.slug}` : `/mon/${dish.slug}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([
            faqJsonLd(faq),
            breadcrumbJsonLd([
              { name: 'TP.HCM', path: '/' },
              { name: dish.label, path: `/mon/${dish.slug}` },
              ...(districtName ? [{ name: districtName, path }] : []),
            ]),
          ]),
        }}
      />

      <header className="-mx-4 bg-thanhlong-soft px-4 pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-badge font-bold tracking-wide text-thanhlong uppercase">
              {group?.label} · {dish.origin}
            </p>
            <h1 className="mt-1 font-display text-h1 font-extrabold text-balance">{title}</h1>
            <p className="mt-1 text-meta text-muted">
              {hits.length} quán được chọn{typical && ` · giá phổ biến ${typical}`}
            </p>
          </div>
          <DishBadge slug={dish.slug} size={64} className="shadow-card" />
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">{copy.intro}</p>
      </header>

      <nav aria-label="Khu vực" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1">
        <TrackedLink
          href={`/ban-do?mon=${dish.slug}`}
          event="map_open"
          props={{ source: 'dish' }}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold"
        >
          Gần tôi
        </TrackedLink>
        {DISTRICTS.map((d) => {
          const on = d.slug === district;
          return (
            <Link
              key={d.slug}
              href={on ? `/mon/${dish.slug}` : `/khu-vuc/${d.slug}/${dish.slug}`}
              aria-current={on ? 'page' : undefined}
              className={clsx(
                'inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-semibold',
                on ? 'border-xoai bg-xoai text-on-xoai' : 'border-line bg-surface',
              )}
            >
              {d.label}
            </Link>
          );
        })}
      </nav>

      <section aria-labelledby="top" className="mt-5">
        <h2 id="top" className="font-display text-section font-bold">
          Top quán {dish.label.toLowerCase()}
        </h2>
        {hits.length ? (
          <ol className="mt-2 flex flex-col gap-2.5">
            {hits.map((h, i) => {
              const r = h.restaurant;
              return (
                <li key={r.slug}>
                  <Link href={`/quan/${r.slug}`} className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card">
                    <span
                      className={clsx(
                        'grid size-8 shrink-0 place-items-center rounded-full font-display text-[16px] font-extrabold',
                        i === 0 ? 'bg-xoai text-on-xoai' : 'bg-sunken',
                      )}
                    >
                      {i + 1}
                    </span>
                    <RestaurantPhoto photo={r.photos[0]} dish={r.dish} sizes="64px" rounded="rounded-tag" className="size-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[16px] font-bold">{r.name}</p>
                      <p className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
                        <Rating avg={r.rating.avg} count={r.rating.count} className="text-[13px]" />
                        <span>· {DISTRICTS.find((d) => d.slug === r.district)?.label}</span>
                        {formatPriceRange(r.priceMin, r.priceMax) && <span>· {formatPriceRange(r.priceMin, r.priceMax)}</span>}
                      </p>
                      <p className="truncate text-[12px]">
                        <span className="font-semibold">Nổi tiếng:</span> {r.highlight.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState className="mt-2" title="Chưa có quán ở đây" hint="Đội biên tập đang tìm thêm quán, quay lại sau nhé." />
        )}
        {hits.length > 0 && (
          <TrackedLink
            href={`/ban-do?mon=${dish.slug}${district ? `&quan=${district}` : ''}`}
            event="map_open"
            props={{ source: 'dish' }}
            className="mt-3 flex h-12 items-center justify-center gap-1.5 rounded-full border border-line bg-surface shadow-card font-bold"
          >
            <MapIcon aria-hidden className="size-4.5" /> Xem tất cả trên bản đồ
          </TrackedLink>
        )}
      </section>

      <FaqList faq={faq} />
    </>
  );
}
