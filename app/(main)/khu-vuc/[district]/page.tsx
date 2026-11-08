import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FoodIcon } from '@/components/icons/food/FoodIcon';
import { RestaurantCard } from '@/components/RestaurantCard';
import { currentDate } from '@/lib/hours';
import { searchRestaurants, toCard } from '@/lib/restaurants';
import { MIN_INDEXABLE } from '@/lib/seo';
import { DISHES, DISTRICTS, getDistrict } from '@/lib/taxonomy';

export const revalidate = 3600;

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ district: d.slug }));
}

type Props = { params: Promise<{ district: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = getDistrict((await params).district);
  if (!d) return {};
  const { total } = searchRestaurants({ terms: [], dishes: [], district: d.slug });
  return {
    title: `Quán ngon ${d.label}`,
    description: `${total} quán ăn được chọn lọc ở ${d.label}, Sài Gòn: món nước, cơm, ốc, ăn vặt, cà phê.`,
    alternates: { canonical: `/khu-vuc/${d.slug}` },
    robots: total >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
  };
}

export default async function DistrictPage({ params }: Props) {
  const d = getDistrict((await params).district);
  if (!d) notFound();
  const { items, total } = searchRestaurants(
    { terms: [], dishes: [], district: d.slug, sort: 'rating' },
    { now: currentDate(), limit: 50 },
  );
  const dishesHere = DISHES.filter((dish) => items.some((h) => h.restaurant.dishes.includes(dish.slug)));

  return (
    <>
      <header className="pt-5">
        <p className="text-badge font-bold tracking-wide text-thanhlong uppercase">TP.HCM</p>
        <h1 className="font-display text-h1 font-extrabold">Quán ngon {d.label}</h1>
        <p className="text-meta text-muted">{total} quán được chọn</p>
      </header>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1">
        {dishesHere.map((dish) => (
          <li key={dish.slug}>
            <Link
              href={`/khu-vuc/${d.slug}/${dish.slug}`}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface pr-3.5 pl-1.5 text-[14px] font-semibold"
            >
              <FoodIcon slug={dish.slug} size={26} />
              {dish.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-2 divide-y divide-line">
        {items.map((h) => (
          <li key={h.restaurant.slug}>
            <RestaurantCard card={toCard(h)} variant="row" showDistance={false} />
          </li>
        ))}
      </ul>
    </>
  );
}
