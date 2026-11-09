import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DishLanding } from '@/components/DishLanding';
import { currentDate } from '@/lib/hours';
import { topForDish } from '@/lib/restaurants';
import { MIN_INDEXABLE, clamp } from '@/lib/seo';
import { getDish, getDistrict } from '@/lib/taxonomy';

export const revalidate = 3600;

export function generateStaticParams(): { district: string; dish: string }[] {
  // Rendered on the first request, then cached by ISR: never read data during `next build`
  // (the build may not see DATABASE_URL, and pages built from demo data would be served for an hour).
  return [];
}

type Props = { params: Promise<{ district: string; dish: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const dish = getDish(p.dish);
  const district = getDistrict(p.district);
  if (!dish || !district) return {};
  const count = (await topForDish(dish.slug, district.slug)).length;
  return {
    title: clamp(`${dish.label} ngon ở ${district.label}`, 60),
    description: clamp(`${count} quán ${dish.label.toLowerCase()} được chọn lọc ở ${district.label}, Sài Gòn.`, 155),
    alternates: { canonical: `/khu-vuc/${district.slug}/${dish.slug}` },
    robots: count >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
  };
}

export default async function DistrictDishPage({ params }: Props) {
  const p = await params;
  const dish = getDish(p.dish);
  const district = getDistrict(p.district);
  if (!dish || !district) notFound();
  return <DishLanding dish={dish} district={district.slug} hits={await topForDish(dish.slug, district.slug, currentDate())} />;
}
