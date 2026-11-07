import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DishLanding, getDishCopy } from '@/components/DishLanding';
import { currentDate } from '@/lib/hours';
import { topForDish } from '@/lib/restaurants';
import { MIN_INDEXABLE, clamp } from '@/lib/seo';
import { DISHES, getDish } from '@/lib/taxonomy';

export const revalidate = 3600;

export function generateStaticParams() {
  return DISHES.map((d) => ({ dish: d.slug }));
}

type Props = { params: Promise<{ dish: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dish = getDish((await params).dish);
  if (!dish) return {};
  const count = topForDish(dish.slug).length;
  const copy = getDishCopy(dish);
  return {
    title: clamp(copy.title, 60),
    description: clamp(`${count} quán ${dish.label.toLowerCase()} được chọn lọc ở Sài Gòn. ${copy.intro}`, 155),
    alternates: { canonical: `/mon/${dish.slug}` },
    // Thin-content guard: index only with ≥ 3 verified restaurants.
    robots: count >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
  };
}

export default async function DishPage({ params }: Props) {
  const dish = getDish((await params).dish);
  if (!dish) notFound();
  return <DishLanding dish={dish} hits={topForDish(dish.slug, undefined, currentDate())} />;
}
