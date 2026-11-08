import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OpenStat } from '@/components/OpenStatus';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { SaveButton } from '@/components/SaveButton';
import { DistanceStat } from '@/components/merchant/DistanceStat';
import { ShareButton } from '@/components/merchant/ShareButton';
import { Tag } from '@/components/ui/Tag';
import { formatPriceRange, formatRating } from '@/lib/format';
import type { RestaurantHit } from '@/lib/restaurants';
import { dishLabel, districtLabel } from '@/lib/taxonomy';

/** Hero 210px + info card overlapping 44px + 4-column stat strip + one-line tip. */
export function MerchantHeader({ hit }: { hit: RestaurantHit }) {
  const r = hit.restaurant;
  const price = formatPriceRange(r.priceMin, r.priceMax);
  const photo = r.photos[0];

  return (
    <header>
      <div className="relative">
        <RestaurantPhoto photo={photo} dish={r.dish} sizes="(max-width: 480px) 100vw, 480px" priority rounded="rounded-none" className="h-[210px]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Link href="/" aria-label="Quay lại" className="grid size-11 place-items-center rounded-full bg-surface/95 shadow-card">
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
          <div className="flex gap-2">
            <ShareButton name={r.name} />
            <SaveButton slug={r.slug} name={r.name} variant="overlay" />
          </div>
        </div>
        {r.photos.length > 0 && (
          <span className="absolute right-3 bottom-14 rounded-tag bg-ink/75 px-1.5 py-0.5 text-badge font-semibold text-surface">
            1/{r.photos.length}
          </span>
        )}
      </div>

      <div className="relative z-10 mx-3 -mt-11 rounded-card bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-1.5">
          {r.editorPick && <Tag tone="pick">Đáng thử</Tag>}
          <span className="text-[12px] text-muted">
            {dishLabel(r.dish)} · {r.venueType} · {districtLabel(r.district)}
          </span>
        </div>
        <h1 className="mt-1.5 font-display text-h1 font-extrabold tracking-[-0.01em]">{r.name}</h1>

        <dl className="mt-3 grid grid-cols-4 divide-x divide-line rounded-tag bg-bg py-2 text-center">
          <div className="px-1">
            <dt className="sr-only">Đánh giá</dt>
            <dd className="font-display text-[17px] font-extrabold">
              {r.rating.count < 10 ? 'Mới' : <>★ {formatRating(r.rating.avg)}</>}
            </dd>
            <dd className="text-badge text-muted">{r.rating.count} lượt</dd>
          </div>
          <div className="px-1">
            <dt className="sr-only">Khoảng cách</dt>
            <DistanceStat place={{ lat: r.lat, lng: r.lng }} />
          </div>
          <div className="px-1">
            <dt className="sr-only">Giá</dt>
            <dd className="font-display text-[17px] font-extrabold">{price ?? '—'}</dd>
            <dd className="text-badge text-muted">{price ? '/người' : 'chưa có giá'}</dd>
          </div>
          <div className="px-1">
            <dt className="sr-only">Giờ mở</dt>
            <OpenStat hours={r.hours} serverState={hit.state} />
          </div>
        </dl>

        {r.tip && (
          <details className="group mt-3 rounded-tag bg-xoai-soft px-3 py-2">
            <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1 text-[13px]">
              <strong>Mẹo:</strong>
              <span className="truncate group-open:whitespace-normal">{r.tip}</span>
            </summary>
          </details>
        )}
      </div>
    </header>
  );
}
