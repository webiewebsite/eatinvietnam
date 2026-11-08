'use client';

import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { ArrowDownUp, SlidersHorizontal, X } from 'lucide-react';
import { clsx } from 'clsx';
import { filtersToQuery, describeFilters } from '@/lib/search/url';
import { DISTRICTS } from '@/lib/taxonomy';
import type { SearchFilters } from '@/lib/types';

type Quick = { id: string; label: string; on: (f: SearchFilters) => boolean; toggle: (f: SearchFilters, on: boolean) => SearchFilters };

const QUICK: Record<'results' | 'map', Quick[]> = {
  results: [
    { id: 'mon-nuoc', label: 'Món nước', on: (f) => f.group === 'mon-nuoc', toggle: (f, on) => ({ ...f, dishes: [], group: on ? undefined : 'mon-nuoc' }) },
    { id: 'gia', label: '≤ 50k', on: (f) => f.priceMax === 50000, toggle: (f, on) => ({ ...f, priceMax: on ? undefined : 50000 }) },
    { id: 'mo', label: 'Đang mở', on: (f) => !!f.openNow, toggle: (f, on) => ({ ...f, openNow: on ? undefined : true }) },
    { id: 'khuya', label: 'Ăn khuya', on: (f) => !!f.lateNight, toggle: (f, on) => ({ ...f, lateNight: on ? undefined : true }) },
  ],
  map: [
    { id: 'all', label: 'Tất cả', on: (f) => !f.group && !f.dishes.length && !f.lateNight, toggle: (f) => ({ ...f, group: undefined, dishes: [], lateNight: undefined }) },
    { id: 'mon-nuoc', label: 'Món nước', on: (f) => f.group === 'mon-nuoc', toggle: (f, on) => ({ ...f, dishes: [], group: on ? undefined : 'mon-nuoc' }) },
    { id: 'com', label: 'Cơm & bánh', on: (f) => f.group === 'com-banh', toggle: (f, on) => ({ ...f, dishes: [], group: on ? undefined : 'com-banh' }) },
    { id: 'oc', label: 'Ốc', on: (f) => f.dishes.includes('oc'), toggle: (f, on) => ({ ...f, group: undefined, dishes: on ? [] : ['oc'] }) },
    { id: 'an-vat', label: 'Ăn vặt', on: (f) => f.group === 'an-vat', toggle: (f, on) => ({ ...f, dishes: [], group: on ? undefined : 'an-vat' }) },
    { id: 'khuya', label: 'Ăn khuya', on: (f) => !!f.lateNight, toggle: (f, on) => ({ ...f, lateNight: on ? undefined : true }) },
  ],
};

const chip =
  'inline-flex shrink-0 items-center gap-1 rounded-[10px] border px-3 text-[14px] font-semibold whitespace-nowrap transition-colors';

/** Quick filter chips + "Lọc" sheet. State lives in URL search params. */
export function FilterBar({
  filters,
  basePath,
  variant = 'results',
}: {
  filters: SearchFilters;
  basePath: '/tim-kiem' | '/ban-do';
  variant?: 'results' | 'map';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const activeCount = describeFilters(filters).filter((c) => c.key !== 'terms').length;

  const go = (next: SearchFilters) =>
    startTransition(() => router.push(`${basePath}${filtersToQuery(next)}`, { scroll: false }));

  return (
    <div className={clsx('relative', pending && 'opacity-70')}>
      <div className="no-scrollbar relative -mx-3 flex gap-2 overflow-x-auto px-3 py-1">
        {variant === 'results' && (
          <>
            <button
              type="button"
              onClick={() => dialog.current?.showModal()}
              className={clsx(chip, 'h-[34px] border-line-strong bg-surface')}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Lọc
              {activeCount > 0 && (
                <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-thanhlong px-1 text-badge font-bold text-on-thanhlong">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-pressed={filters.sort === 'rating'}
              onClick={() => go({ ...filters, sort: filters.sort === 'rating' ? undefined : 'rating' })}
              className={clsx(chip, 'h-[34px] border-line bg-surface')}
            >
              <ArrowDownUp aria-hidden className="size-4" />
              {filters.sort === 'rating' ? 'Đánh giá cao' : 'Gần nhất'}
            </button>
          </>
        )}
        {QUICK[variant].map((q) => {
          const on = q.on(filters);
          return (
            <button
              key={q.id}
              type="button"
              aria-pressed={on}
              onClick={() => go(q.toggle(filters, on))}
              className={clsx(
                chip,
                variant === 'map' ? 'h-9 rounded-full shadow-card' : 'h-[34px]',
                on ? 'border-line-strong bg-xoai text-on-xoai' : 'border-line bg-surface text-ink',
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {variant === 'results' && (
        <dialog
          ref={dialog}
          aria-labelledby="filter-title"
          className="m-0 mt-auto w-full max-w-none rounded-t-card bg-surface p-0 text-ink shadow-sheet backdrop:bg-scrim sm:mx-auto sm:max-w-[480px]"
        >
          <form
            method="dialog"
            className="flex flex-col gap-5 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              const data = new FormData(e.currentTarget);
              const gia = Number(data.get('gia'));
              go({
                ...filters,
                district: (data.get('quan') as string) || undefined,
                priceMax: gia > 0 ? gia : undefined,
                openNow: data.get('mo') === '1' || undefined,
              });
            }}
          >
            <div className="flex items-center justify-between">
              <h2 id="filter-title" className="font-display text-section font-bold">
                Bộ lọc
              </h2>
              <button
                type="button"
                aria-label="Đóng bộ lọc"
                onClick={() => dialog.current?.close()}
                className="grid size-10 place-items-center rounded-full hover:bg-sunken"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <fieldset>
              <legend className="mb-2 text-[14px] font-bold">Khu vực</legend>
              <div className="flex flex-wrap gap-2">
                {[{ slug: '', label: 'Tất cả' }, ...DISTRICTS].map((d) => (
                  <label key={d.slug} className="has-checked:border-line-strong has-checked:bg-xoai inline-flex h-10 items-center rounded-full border border-line px-3.5 text-[14px] font-semibold">
                    <input type="radio" name="quan" value={d.slug} defaultChecked={(filters.district ?? '') === d.slug} className="sr-only" />
                    {d.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[14px] font-bold">Giá mỗi người</legend>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 0, label: 'Mọi giá' },
                  { v: 40000, label: '≤ 40k' },
                  { v: 50000, label: '≤ 50k' },
                  { v: 80000, label: '≤ 80k' },
                  { v: 150000, label: '≤ 150k' },
                ].map((p) => (
                  <label key={p.v} className="has-checked:border-line-strong has-checked:bg-xoai inline-flex h-10 items-center rounded-full border border-line px-3.5 text-[14px] font-semibold">
                    <input type="radio" name="gia" value={p.v} defaultChecked={(filters.priceMax ?? 0) === p.v} className="sr-only" />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
              Chỉ quán đang mở
              <input type="checkbox" name="mo" value="1" defaultChecked={!!filters.openNow} className="size-5 accent-thanhlong" />
            </label>
            <button type="submit" className="sticker h-12 rounded-full bg-thanhlong text-[16px] font-bold text-on-thanhlong">
              Xem kết quả
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
