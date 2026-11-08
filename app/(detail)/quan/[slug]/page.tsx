import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Clock, MapPin, Store } from 'lucide-react';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { ActionBar } from '@/components/merchant/ActionBar';
import { CopyButton } from '@/components/merchant/CopyButton';
import { MenuList } from '@/components/merchant/MenuList';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';
import { ReportIssue } from '@/components/merchant/ReportIssue';
import { ViewTracker } from '@/components/merchant/ViewTracker';
import { Rating } from '@/components/ui/Rating';
import { formatDate, formatPrice, formatPriceRange } from '@/lib/format';
import { currentDate, hoursSummary } from '@/lib/hours';
import { getHit, getRestaurant, listSlugs } from '@/lib/restaurants';
import { breadcrumbJsonLd, clamp, jsonLdString, restaurantBreadcrumb, restaurantJsonLd } from '@/lib/seo';
import { dishLabel, districtLabel } from '@/lib/taxonomy';

// ISR: admin saves call revalidatePath('/quan/<slug>') (issue #8).
export const revalidate = 3600;

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getRestaurant((await params).slug);
  if (!r) return {};
  const price = formatPriceRange(r.priceMin, r.priceMax);
  return {
    title: clamp(`${r.name} – ${districtLabel(r.district)}`, 60),
    description: clamp(
      `${r.name}: ${dishLabel(r.dish).toLowerCase()} ở ${districtLabel(r.district)}${price ? `, giá ${price}` : ''}. ${r.highlight}.`,
      155,
    ),
    alternates: { canonical: `/quan/${r.slug}` },
    openGraph: { images: r.photos[0] ? [{ url: r.photos[0].src, alt: r.photos[0].alt }] : undefined },
  };
}

const TABS = [
  { id: 'thuc-don', label: 'Thực đơn' },
  { id: 'danh-gia', label: 'Đánh giá' },
  { id: 'anh', label: 'Ảnh' },
  { id: 'thong-tin', label: 'Thông tin' },
];

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  // Distance from the default centre at build/revalidate time; live distance needs client geo.
  const hit = getHit(slug, undefined, currentDate());
  if (!hit) notFound();
  const r = hit.restaurant;
  const hours = hoursSummary(r.hours);
  const mustTry = r.menu.filter((m) => m.mustTry).slice(0, 3);
  const crumbs = restaurantBreadcrumb(r);

  return (
    <main className="pb-28">
      <ViewTracker slug={r.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([restaurantJsonLd(r), breadcrumbJsonLd([...crumbs, { name: r.name, path: `/quan/${r.slug}` }])]),
        }}
      />

      <MerchantHeader hit={hit} />

      <nav aria-label="Mục trong trang" className="sticky top-0 z-30 mt-3 border-b border-line bg-bg/95 backdrop-blur">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto px-3">
          {TABS.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="inline-flex h-11 items-center px-3 text-[14px] font-semibold whitespace-nowrap text-muted hover:text-ink">
                {t.label}
                {t.id === 'anh' && r.photos.length > 0 && <span className="ml-1 text-muted">· {r.photos.length}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-7 px-3 pt-4">
        <section id="thuc-don" aria-labelledby="menu-title" className="scroll-mt-14">
          {mustTry.length > 0 && (
            <>
              <h2 className="font-display text-section font-bold">Món nên thử</h2>
              <ul className="snap-rail -mx-3 mt-2 gap-2.5 px-3">
                {mustTry.map((m) => (
                  <li key={m.name} className="w-[132px] shrink-0">
                    <div className="relative">
                      <RestaurantPhoto photo={m.photo ?? r.photos[0]} dish={r.dish} sizes="132px" className="aspect-square" />
                      {/* Editor pick label replaces "N người khen" until user reviews (phase 2). */}
                      <span className="absolute top-1.5 left-1.5 rounded-tag bg-xoai px-1.5 py-0.5 text-badge font-bold text-on-xoai">
                        Đáng thử
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[14px] leading-tight font-semibold">{m.name}</p>
                    <p className="text-[13px] font-bold">{formatPrice(m.price)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 id="menu-title" className="mt-5 font-display text-section font-bold">
            Thực đơn
          </h2>
          {r.menu.length ? (
            <MenuList items={r.menu} dish={r.dish} />
          ) : (
            <p className="mt-2 text-meta text-muted">Quán chưa có thực đơn trên EatInVietnam.</p>
          )}
          <div className="mt-2 text-[12px] text-muted">
            Giá cập nhật {formatDate(r.priceUpdatedAt)} · <ReportIssue slug={r.slug} />
          </div>
        </section>

        <section id="danh-gia" aria-labelledby="rating-title" className="scroll-mt-14">
          <h2 id="rating-title" className="font-display text-section font-bold">
            Đánh giá
          </h2>
          {/* Editorial aggregate only; star distribution + review quotes are phase 2 (decision #1, item 3). */}
          <div className="mt-2 flex items-center gap-4 rounded-card bg-surface p-4 shadow-card">
            <div className="text-center">
              <p className="font-display text-display font-extrabold">
                {r.rating.count < 10 ? 'Mới' : r.rating.avg.toFixed(1)}
              </p>
              <Rating avg={r.rating.avg} count={r.rating.count} className="text-[12px]" />
              <p className="text-[12px] text-muted">{r.rating.count} lượt</p>
            </div>
            <ul className="flex flex-1 flex-wrap gap-1.5">
              {r.features.map((f) => (
                <li key={f} className="rounded-full bg-raurau-soft px-2.5 py-1 text-[13px] font-semibold text-raurau">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {r.photos.length > 0 && (
          <section id="anh" aria-labelledby="photo-title" className="scroll-mt-14">
            <h2 id="photo-title" className="font-display text-section font-bold">
              Ảnh · {r.photos.length}
            </h2>
            <ul className="mt-2 grid grid-cols-3 gap-1.5">
              {r.photos.map((p) => (
                <li key={p.src}>
                  <RestaurantPhoto photo={p} dish={r.dish} sizes="(max-width: 480px) 33vw, 160px" className="aspect-square" />
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted">Ảnh minh họa từ Pexels — sẽ thay bằng ảnh thật của quán.</p>
          </section>
        )}

        <section id="thong-tin" aria-labelledby="info-title" className="scroll-mt-14">
          <h2 id="info-title" className="font-display text-section font-bold">
            Thông tin
          </h2>
          <ul className="mt-2 divide-y divide-line rounded-card bg-surface px-3 shadow-card">
            <li className="flex items-center gap-3 py-2.5">
              <MapPin aria-hidden className="size-5 shrink-0 text-thanhlong" />
              <span className="flex-1 text-[14px]">{r.address}</span>
              <CopyButton text={r.address} />
            </li>
            <li className="py-1">
              <details>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                  <Clock aria-hidden className="size-5 shrink-0 text-thanhlong" />
                  <span className="flex-1 text-[14px]">
                    {hours.label}
                    {r.busyHint && <span className="text-muted"> · {r.busyHint}</span>}
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-muted" />
                </summary>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 pb-2 pl-8 text-[13px]">
                  {hours.lines.map((l) => (
                    <div key={l.day} className="contents">
                      <dt className="text-muted">{l.day}</dt>
                      <dd>{l.text}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
            <li className="flex items-center gap-3 py-2.5">
              <Store aria-hidden className="size-5 shrink-0 text-thanhlong" />
              <span className="flex-1 text-[14px]">{r.amenities.join(' · ')}</span>
            </li>
          </ul>
          <div className="mt-2 text-[12px] text-muted">
            Thông tin chưa đúng? <ReportIssue slug={r.slug} label="Báo sai thông tin" defaultReason="hours" />
          </div>
        </section>

        <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((c) => (
              <li key={c.path} className="flex items-center gap-1">
                <Link href={c.path} className="underline-offset-2 hover:underline">
                  {c.name}
                </Link>
                <ChevronRight aria-hidden className="size-3" />
              </li>
            ))}
            <li aria-current="page" className="font-semibold text-ink">
              {r.name}
            </li>
          </ol>
        </nav>

        <p className="rounded-input bg-sunken p-3 text-[12px] text-muted">
          Dữ liệu demo: tên quán, địa chỉ, số điện thoại và đánh giá là giả lập để phát triển giao diện.
        </p>
      </div>

      <ActionBar
        slug={r.slug}
        name={r.name}
        phone={r.phone}
        lat={r.lat}
        lng={r.lng}
        grabUrl={r.grabUrl}
        shopeeUrl={r.shopeeUrl}
      />
    </main>
  );
}
