import Link from 'next/link';
import { clsx } from 'clsx';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { SaveButton } from '@/components/SaveButton';
import { Rating } from '@/components/ui/Rating';
import { Tag } from '@/components/ui/Tag';
import type { CardData } from '@/lib/restaurants';

type Variant = 'rail' | 'grid' | 'row' | 'map';

/** Restaurant card — 4 variants from the design system (rail 136px, grid 2-col, row ~100px, map carousel). */
export function RestaurantCard({
  card,
  variant,
  rank,
  showDistance = true,
  className,
}: {
  card: CardData;
  variant: Variant;
  rank?: number;
  showDistance?: boolean;
  className?: string;
}) {
  const href = `/quan/${card.slug}`;
  const meta = [showDistance ? card.distanceLabel : null, card.priceLabel].filter(Boolean).join(' · ');

  if (variant === 'rail') {
    return (
      <Link href={href} className={clsx('block w-34 shrink-0', className)}>
        <div className="relative">
          <RestaurantPhoto photo={card.photo} dish={card.dish} sizes="136px" className="aspect-[4/3]" />
          {showDistance && (
            <span className="absolute bottom-1.5 left-1.5 rounded-tag bg-surface/95 px-1.5 py-0.5 text-badge font-semibold">
              {card.distanceLabel}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-tight">{card.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
          <Rating avg={card.rating.avg} count={card.rating.count} className="text-[12px]" />
          {card.priceLabel && <span>· {card.priceLabel}</span>}
        </p>
      </Link>
    );
  }

  if (variant === 'grid') {
    return (
      <Link href={href} className={clsx('block', className)}>
        <div className="relative">
          <RestaurantPhoto photo={card.photo} dish={card.dish} sizes="(max-width: 480px) 50vw, 220px" className="h-28" />
          {rank != null && (
            <span className="absolute top-1.5 left-1.5 rounded-tag bg-xoai px-1.5 py-0.5 text-badge font-bold text-on-xoai">
              Top {rank}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-tight">{card.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
          <Rating avg={card.rating.avg} count={card.rating.count} className="text-[12px]" />
          <span>· {card.districtLabel}</span>
        </p>
      </Link>
    );
  }

  if (variant === 'map') {
    return (
      <Link
        href={href}
        className={clsx('flex w-[300px] shrink-0 gap-3 rounded-card bg-surface p-2.5 shadow-card', className)}
      >
        <RestaurantPhoto photo={card.photo} dish={card.dish} sizes="84px" className="size-21 shrink-0" />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate font-display text-[15px] font-bold">{card.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-muted">
            <Rating avg={card.rating.avg} count={card.rating.count} className="text-[12px]" />
            {meta && <span>· {meta}</span>}
          </p>
          <p className={clsx('mt-1 text-[12px] font-semibold', card.isOpen ? 'text-raurau' : 'text-danger')}>
            {card.openLabel}
          </p>
        </div>
      </Link>
    );
  }

  // row — results list (~100px, 4 lines)
  return (
    <div className={clsx('relative flex gap-3 py-3', className)}>
      <Link href={href} className="flex min-w-0 flex-1 gap-3">
        <div className="relative shrink-0">
          <RestaurantPhoto photo={card.photo} dish={card.dish} sizes="84px" className="size-21" />
          {card.editorPick && (
            <Tag tone="pick" className="absolute -top-1 -left-1 shadow-card">
              Đáng thử
            </Tag>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-10">
          <p className="line-clamp-2 font-display text-[16px] font-bold leading-snug">{card.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
            <Rating avg={card.rating.avg} count={card.rating.count} showCount className="text-[13px]" />
            {showDistance && <span>· {card.distanceLabel}</span>}
            <span>· {card.districtLabel}</span>
          </p>
          <p className="mt-0.5 text-[13px]">
            <span className={clsx('font-semibold', card.isOpen ? 'text-raurau' : 'text-danger')}>{card.openLabel}</span>
            {card.priceLabel && <span className="text-muted"> · {card.priceLabel}</span>}
          </p>
          <p className="mt-1 truncate text-[12px] text-muted">{card.highlight}</p>
        </div>
      </Link>
      <SaveButton slug={card.slug} name={card.name} className="absolute top-2 right-0" />
    </div>
  );
}
