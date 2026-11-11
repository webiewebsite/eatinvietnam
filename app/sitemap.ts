import type { MetadataRoute } from 'next';
import { listIndex } from '@/lib/restaurants';
import { MIN_INDEXABLE, MIN_INDEXABLE_DISTRICT, siteUrl } from '@/lib/seo';
import { DISHES, DISTRICTS } from '@/lib/taxonomy';

// Built per request from the data source: with a database, `next build` must not query it,
// and new restaurants should appear without a redeploy. A few cheap queries per crawl.
export const dynamic = 'force-dynamic';

/** Generated from data. Thin landing pages are left out, matching their noindex (seo.ts thresholds). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const index = await listIndex();
  const count = (dish: string, district?: string) =>
    index.filter((r) => r.dishes.includes(dish) && (!district || r.district === district)).length;

  const dishPages = DISHES.filter((d) => count(d.slug) >= MIN_INDEXABLE).map((d) => `/mon/${d.slug}`);
  const districtDish = DISTRICTS.flatMap((dist) =>
    DISHES.filter((d) => count(d.slug, dist.slug) >= MIN_INDEXABLE).map((d) => `/khu-vuc/${dist.slug}/${d.slug}`),
  );
  // Same thresholds as the pages' robots meta: a noindex page must not be in the sitemap.
  const districtPages = DISTRICTS.filter((d) => index.filter((r) => r.district === d.slug).length >= MIN_INDEXABLE_DISTRICT);
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/chinh-sach-bao-mat`, changeFrequency: 'yearly', priority: 0.2 },
    ...index.map((r) => ({ url: `${base}/quan/${r.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...dishPages.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...districtPages.map((d) => ({ url: `${base}/khu-vuc/${d.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...districtDish.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
