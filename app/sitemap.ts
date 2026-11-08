import type { MetadataRoute } from 'next';
import { listSlugs, topForDish } from '@/lib/restaurants';
import { MIN_INDEXABLE, siteUrl } from '@/lib/seo';
import { DISHES, DISTRICTS } from '@/lib/taxonomy';

/** Generated from data. Thin landing pages (< 3 verified restaurants) are left out, matching their noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const dishPages = DISHES.filter((d) => topForDish(d.slug).length >= MIN_INDEXABLE).map((d) => `/mon/${d.slug}`);
  const districtDish = DISTRICTS.flatMap((dist) =>
    DISHES.filter((d) => topForDish(d.slug, dist.slug).length >= MIN_INDEXABLE).map((d) => `/khu-vuc/${dist.slug}/${d.slug}`),
  );
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/chinh-sach-bao-mat`, changeFrequency: 'yearly', priority: 0.2 },
    ...listSlugs().map((s) => ({ url: `${base}/quan/${s}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...dishPages.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...DISTRICTS.map((d) => ({ url: `${base}/khu-vuc/${d.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...districtDish.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
