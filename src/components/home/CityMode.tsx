import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { FoodIcon } from '@/components/icons/food/FoodIcon';
import { WaitlistForm } from '@/components/home/WaitlistForm';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tag } from '@/components/ui/Tag';
import { getDish } from '@/lib/taxonomy';

interface City {
  slug: string;
  label: string;
  status: string;
  sub: string;
}
interface Stop {
  city: string;
  dish: string;
  dishSlug: string | null;
}

/** "Khắp Việt Nam" mode: cities, North → South food route, regional dishes available in Saigon, waitlist. */
export function CityMode({ cities, route, regional }: { cities: City[]; route: Stop[]; regional: string[] }) {
  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="cities">
        <SectionHeader id="cities" title="Chọn thành phố" />
        <ul className="snap-rail -mx-4 mt-2.5 gap-2.5 px-4">
          {cities.map((c) => {
            const open = c.status === 'open';
            const body = (
              <>
                <span className="font-display text-[17px] font-extrabold">{c.label}</span>
                <Tag tone={open ? 'open' : 'neutral'}>{open ? 'Đang mở' : 'Sắp có'}</Tag>
              </>
            );
            return (
              <li key={c.slug} className="shrink-0">
                {open ? (
                  <Link
                    href="/"
                    className="flex h-24 w-32 flex-col justify-between rounded-card bg-xoai p-3 text-on-xoai shadow-card"
                  >
                    {body}
                  </Link>
                ) : (
                  <a
                    href="#bao-toi-khi-mo"
                    className="flex h-24 w-32 flex-col justify-between rounded-card border border-line bg-surface p-3"
                  >
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="food-route">
        <SectionHeader id="food-route" title="Hành trình ăn Bắc → Nam" />
        {/* A route of stops, never a drawn map of Vietnam (territorial accuracy risk). */}
        <ol className="relative mt-3 ml-3 border-l-2 border-dashed border-line-strong/40 pl-5">
          {route.map((s, i) => (
            <li key={s.city} className="relative pb-4 last:pb-0">
              <span
                aria-hidden
                className={clsx(
                  'absolute top-0.5 -left-[31px] grid size-5 place-items-center rounded-full border border-line-strong text-badge font-bold',
                  s.city === 'Sài Gòn' ? 'bg-thanhlong text-on-thanhlong' : 'bg-surface',
                )}
              >
                {i + 1}
              </span>
              <p className="text-[15px] font-bold">
                {s.city} <span className="font-normal text-muted">· {s.dish}</span>
              </p>
              {s.dishSlug ? (
                <Link href={`/mon/${s.dishSlug}`} className="inline-flex min-h-8 items-center gap-1 text-meta font-semibold text-thanhlong">
                  Ăn {s.dish.toLowerCase()} ở Sài Gòn <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              ) : (
                <p className="text-meta text-muted">Chưa có quán ở Sài Gòn</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="regional">
        <SectionHeader id="regional" title="Món vùng miền, ăn ngay ở Sài Gòn" />
        <ul className="mt-2.5 grid grid-cols-2 gap-2.5">
          {regional.map((slug) => {
            const d = getDish(slug);
            if (!d) return null;
            return (
              <li key={slug}>
                <Link href={`/mon/${slug}`} className="flex items-center gap-2.5 rounded-card bg-surface p-2.5 shadow-card">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-thanhlong-soft">
                    <FoodIcon slug={slug} size={28} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold">{d.label}</span>
                    <span className="block truncate text-[12px] text-muted">{d.origin}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="bao-toi-khi-mo" aria-labelledby="waitlist" className="scroll-mt-4 rounded-card bg-thanhlong-soft p-4">
        <h2 id="waitlist" className="font-display text-section font-bold">
          Báo tôi khi mở thành phố mới
        </h2>
        <p className="mt-1 text-meta text-muted">Chỉ gửi một email khi thành phố bạn chọn có quán. Không spam.</p>
        <WaitlistForm cities={cities.filter((c) => c.status !== 'open')} />
      </section>
    </div>
  );
}
