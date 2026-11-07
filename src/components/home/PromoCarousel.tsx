'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { MapBannerArt } from '@/components/home/MapBannerArt';
import { track } from '@/lib/tracking';

export interface PromoSlide {
  id: string;
  kind: string;
  eyebrow: string;
  title: string;
  sub: string;
  href: string;
  tone: string;
  sponsored: boolean;
}

const TONE: Record<string, string> = {
  xoai: 'bg-xoai text-on-xoai',
  dem: 'bg-dem text-on-dem',
  raurau: 'bg-raurau text-on-raurau',
  thanhlong: 'bg-thanhlong text-on-thanhlong',
};

/**
 * Banner carousel: CSS scroll-snap, next slide peeks, dots follow the visible slide.
 * Slide 1 is always the map. No autoplay (it slides away while people read).
 */
export function PromoCarousel({ slides, openCount }: { slides: PromoSlide[]; openCount: number }) {
  const track_ = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const total = slides.length + 1;

  useEffect(() => {
    const root = track_.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => {
    const el = track_.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <section aria-roledescription="carousel" aria-label="Nổi bật">
      <div ref={track_} className="snap-rail -mx-4 gap-3 px-4">
        <Link
          href="/ban-do"
          data-index={0}
          aria-label={`Bản đồ món ngon, ${openCount} quán đang mở. Mở bản đồ`}
          onClick={() => track('map_open', { source: 'banner' })}
          className="relative flex h-33 w-79 shrink-0 overflow-hidden rounded-card bg-dem text-on-dem"
        >
          <div className="z-10 flex flex-1 flex-col justify-between p-3.5">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-raurau px-2 py-0.5 text-badge font-bold text-on-raurau">
                <span aria-hidden className="size-1.5 rounded-full bg-on-raurau" />
                {openCount} quán đang mở
              </span>
              <p className="mt-1.5 font-display text-[20px] leading-tight font-extrabold">
                Bản đồ món
                <br />
                ngon
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-xoai px-3 py-1.5 text-[13px] font-bold text-on-xoai">
              Mở bản đồ <ArrowRight aria-hidden className="size-4" />
            </span>
          </div>
          <div className="w-[150px] shrink-0">
            <MapBannerArt />
          </div>
        </Link>

        {slides.map((s, i) => (
          <Link
            key={s.id}
            href={s.href}
            data-index={i + 1}
            onClick={() => track('promo_click', { id: s.id, position: i + 2 })}
            className={clsx(
              'relative flex h-33 w-79 shrink-0 flex-col justify-between overflow-hidden rounded-card p-3.5',
              TONE[s.tone] ?? TONE.thanhlong,
            )}
          >
            <div>
              <p className="text-badge font-bold tracking-wide uppercase opacity-80">{s.eyebrow}</p>
              <p className="mt-1 font-display text-[20px] leading-tight font-extrabold">{s.title}</p>
            </div>
            <p className="flex items-center gap-1 text-[13px] font-semibold">
              {s.sub} <ArrowRight aria-hidden className="size-4" />
            </p>
            {s.sponsored && (
              <span className="absolute top-2.5 right-2.5 rounded-tag bg-surface/90 px-1.5 py-0.5 text-badge font-semibold text-ink">
                Tài trợ
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-2.5 flex justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1} / ${total}`}
            aria-current={active === i ? 'true' : undefined}
            className="grid h-6 min-w-6 place-items-center"
          >
            <span
              className={clsx(
                'block h-1.5 rounded-full transition-all',
                active === i ? 'w-5 bg-thanhlong' : 'w-1.5 bg-line-strong/30',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
