import { FoodIcon } from '@/components/icons/food/FoodIcon';
import { TrackedLink } from '@/components/TrackedLink';
import { RailIndicator } from '@/components/home/RailIndicator';
import { DISHES } from '@/lib/taxonomy';

/** 2-row horizontally scrolling dish rail (70px columns, 52px round sticker icons). ~10 visible at 360px. */
export function CategoryRail() {
  const railId = 'category-rail';
  return (
    <section aria-label="Món ăn">
      <ul
        id={railId}
        className="no-scrollbar -mx-4 grid snap-x snap-mandatory auto-cols-[70px] grid-flow-col grid-rows-2 gap-x-0.5 gap-y-3 overflow-x-auto px-3 scroll-px-3"
      >
        {DISHES.map((d) => (
          <li key={d.slug} className="snap-start">
            <TrackedLink
              href={`/mon/${d.slug}`}
              event="category_click"
              props={{ dish: d.slug }}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span className="grid size-13 place-items-center rounded-full border-2 border-line-strong bg-thanhlong-soft">
                <FoodIcon slug={d.slug} size={34} />
              </span>
              <span className="line-clamp-2 text-[12px] leading-tight font-medium">{d.label}</span>
            </TrackedLink>
          </li>
        ))}
      </ul>
      <RailIndicator targetId={railId} />
    </section>
  );
}
