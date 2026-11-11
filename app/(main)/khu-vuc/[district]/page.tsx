import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Map as MapIcon, Moon, Wallet } from 'lucide-react';
import { FaqList } from '@/components/FaqList';
import { DishBadge } from '@/components/icons/food/FoodIcon';
import { RestaurantCard } from '@/components/RestaurantCard';
import { TrackedLink } from '@/components/TrackedLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CHEAP_MAX, districtDescription, districtFaq, districtStats, getDistrictCopy } from '@/lib/district-landing';
import { currentDate } from '@/lib/hours';
import { searchRestaurants, toCard } from '@/lib/restaurants';
import { MIN_INDEXABLE_DISTRICT, breadcrumbJsonLd, clamp, faqJsonLd, itemListJsonLd, jsonLdString } from '@/lib/seo';
import { getDistrict } from '@/lib/taxonomy';

export const revalidate = 3600;

export function generateStaticParams(): { district: string }[] {
  // Rendered on the first request, then cached by ISR: never read data during `next build`
  // (the build may not see DATABASE_URL, and pages built from demo data would be served for an hour).
  return [];
}

type Props = { params: Promise<{ district: string }> };

/** Every verified restaurant of the district (a few hundred at most per legacy district). */
const LIMIT = 300;
/** Rows shown under "Quán ngon" before linking to the full search. */
const LIST_MAX = 30;

// cache(): generateMetadata and the page share one query per request.
const load = cache(async (slug: string) => {
  const now = currentDate();
  const d = getDistrict(slug);
  if (!d) return null;
  const { items, total } = await searchRestaurants({ terms: [], dishes: [], district: d.slug }, { now, limit: LIMIT });
  return { d, items, total, stats: districtStats(items.map((h) => h.restaurant)), copy: getDistrictCopy(d.slug) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).district);
  if (!data) return {};
  const { d, total, stats, copy } = data;
  const title = clamp(total ? `Ăn gì ở ${d.label}? ${total} quán ngon đã xác minh` : `Ăn gì ở ${d.label}?`, 45);
  const description = clamp(districtDescription(d, stats, copy), 155);
  return {
    title,
    description,
    alternates: { canonical: `/khu-vuc/${d.slug}` },
    openGraph: { title, description, url: `/khu-vuc/${d.slug}` },
    robots: total >= MIN_INDEXABLE_DISTRICT ? undefined : { index: false, follow: true },
  };
}

export default async function DistrictPage({ params }: Props) {
  const data = await load((await params).district);
  if (!data) notFound();
  const { d, items, total, stats, copy } = data;
  const path = `/khu-vuc/${d.slug}`;
  const faq = districtFaq(d, stats, copy);
  // Editor picks get their own section; the list below shows the rest (search order: picks, then rating).
  const picks = items.filter((h) => h.restaurant.editorPick).slice(0, 6);
  const pickSlugs = new Set(picks.map((h) => h.restaurant.slug));
  const rest = items.filter((h) => !pickSlugs.has(h.restaurant.slug));
  const shown = rest.slice(0, LIST_MAX);
  const searchAll = `/tim-kiem?quan=${d.slug}`;

  const facts = [
    `${total} quán đã xác minh`,
    stats.typicalPrice && `giá phổ biến ${stats.typicalPrice}`,
    stats.late.length > 0 && `${stats.late.length} quán mở khuya`,
  ].filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([
            breadcrumbJsonLd([
              { name: 'TP.HCM', path: '/' },
              { name: d.label, path },
            ]),
            ...(items.length
              ? [itemListJsonLd(`Quán ngon ${d.label}`, items.slice(0, 20).map((h) => ({ name: h.restaurant.name, path: `/quan/${h.restaurant.slug}` })))]
              : []),
            ...(faq.length ? [faqJsonLd(faq)] : []),
          ]),
        }}
      />

      <header className="-mx-4 bg-thanhlong-soft px-4 pt-5 pb-5">
        <nav aria-label="Breadcrumb" className="text-badge font-bold tracking-wide text-thanhlong uppercase">
          <Link href="/">TP.HCM</Link> <span aria-hidden>›</span> {d.label}
        </nav>
        <h1 className="mt-1 font-display text-h1 font-extrabold text-balance">{`Ăn gì ở ${d.label}?`}</h1>
        <p className="mt-1 text-meta text-muted">{facts.join(' · ')}</p>
        {copy.intro && <p className="mt-3 text-[15px] leading-relaxed">{copy.intro}</p>}
        <p className="mt-2 text-[12px] text-muted">
          Từ 01/07/2025 TP.HCM không còn cấp quận; EatInVietnam vẫn gọi theo tên quận cũ cho dễ tìm.
        </p>
      </header>

      {total === 0 ? (
        <EmptyState className="mt-5" title={`Chưa có quán ở ${d.label}`} hint="Đội biên tập đang xác minh quán, quay lại sau nhé." />
      ) : (
        <>
          {stats.dishes.length > 0 && (
            <section aria-labelledby="theo-mon" className="mt-4">
              <h2 id="theo-mon" className="font-display text-section font-bold">
                Theo món
              </h2>
              <ul className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1">
                {stats.dishes.map((dish) => (
                  <li key={dish.slug}>
                    <Link
                      href={`${path}/${dish.slug}`}
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface pr-3.5 pl-1.5 text-[14px] font-semibold whitespace-nowrap"
                    >
                      <DishBadge slug={dish.slug} size={30} />
                      {dish.label}
                      <span className="text-muted">{dish.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav aria-label="Lối tắt" className="mt-3 grid grid-cols-3 gap-2">
            <TrackedLink
              href={`/ban-do?quan=${d.slug}`}
              event="map_open"
              props={{ source: 'district' }}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-card bg-surface p-2 text-center text-[13px] font-semibold shadow-card"
            >
              <MapIcon aria-hidden className="size-4.5" /> Bản đồ
            </TrackedLink>
            <Link
              href={`/tim-kiem?quan=${d.slug}&khuya=1`}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-card bg-surface p-2 text-center text-[13px] font-semibold shadow-card"
            >
              <Moon aria-hidden className="size-4.5" /> Ăn khuya
            </Link>
            <Link
              href={`/tim-kiem?quan=${d.slug}&gia=${CHEAP_MAX}`}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-card bg-surface p-2 text-center text-[13px] font-semibold shadow-card"
            >
              <Wallet aria-hidden className="size-4.5" /> Dưới 50k
            </Link>
          </nav>

          {picks.length > 0 && (
            <section aria-labelledby="bien-tap-chon" className="mt-6">
              <SectionHeader id="bien-tap-chon" title="Biên tập chọn" />
              <ul className="mt-1 divide-y divide-line">
                {picks.map((h) => (
                  <li key={h.restaurant.slug}>
                    <RestaurantCard card={toCard(h)} variant="row" showDistance={false} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {shown.length > 0 && (
            <section aria-labelledby="quan-ngon" className="mt-6">
              <SectionHeader
                id="quan-ngon"
                title={picks.length ? `Thêm quán ngon ở ${d.label}` : `Quán ngon ở ${d.label}`}
                href={rest.length > LIST_MAX ? searchAll : undefined}
                linkLabel={`Xem tất cả ${total}`}
              />
              <ul className="mt-1 divide-y divide-line">
                {shown.map((h) => (
                  <li key={h.restaurant.slug}>
                    <RestaurantCard card={toCard(h)} variant="row" showDistance={false} />
                  </li>
                ))}
              </ul>
              {rest.length > LIST_MAX && (
                <Link
                  href={searchAll}
                  className="mt-3 flex h-12 items-center justify-center rounded-full border border-line bg-surface font-bold shadow-card"
                >
                  Xem tất cả {total} quán ở {d.label}
                </Link>
              )}
            </section>
          )}

          {faq.length > 0 && <FaqList faq={faq} />}
        </>
      )}
    </>
  );
}
