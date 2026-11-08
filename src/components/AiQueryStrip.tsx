import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { describeFilters, filtersToQuery, withoutFilter } from '@/lib/search/url';
import type { SearchFilters } from '@/lib/types';

/** "Hiểu là: món nước · ≤ 50.000đ · trong 2 km · Sửa" — each understood filter is removable. */
export function AiQueryStrip({ q, filters }: { q: string; filters: SearchFilters }) {
  const chips = describeFilters(filters);
  if (!q || !chips.length) return null;

  return (
    <div className="flex items-start gap-2 rounded-input bg-thanhlong-soft px-3 py-2">
      <Sparkles aria-hidden className="mt-1.5 size-4 shrink-0 text-thanhlong" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-thanhlong">Hiểu là:</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li key={c.key}>
              <Link
                href={`/tim-kiem${filtersToQuery(withoutFilter(filters, c.key))}`}
                aria-label={`Bỏ điều kiện ${c.label}`}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-surface pr-2 pl-2.5 text-[13px] font-semibold"
              >
                {c.label}
                <X aria-hidden className="size-3.5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="#o-tim"
        className="inline-flex h-8 shrink-0 items-center text-[13px] font-bold text-thanhlong underline"
      >
        Sửa
      </Link>
    </div>
  );
}
