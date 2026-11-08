import { formatPriceRange } from '@/lib/format';
import type { Restaurant } from '@/lib/types';
import { dishLabel, districtLabel, getDish, getGroup } from '@/lib/taxonomy';

export const SITE_NAME = 'EatInVietnam';
export const SITE_TAGLINE = 'Ăn ngon, đúng chất Việt';

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eatinvietnam.com').replace(/\/$/, '');

/** Minimum verified restaurants before a dish/district landing page may be indexed (thin-content guard). */
export const MIN_INDEXABLE = 3;

const DAY_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function restaurantJsonLd(r: Restaurant) {
  const url = `${siteUrl()}/quan/${r.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': url,
    name: r.name,
    url,
    image: r.photos.map((p) => p.src),
    servesCuisine: ['Vietnamese', dishLabel(r.dish)],
    priceRange: formatPriceRange(r.priceMin, r.priceMax) ?? undefined,
    telephone: r.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: r.address,
      addressLocality: districtLabel(r.district),
      addressRegion: 'Hồ Chí Minh',
      addressCountry: 'VN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng },
    openingHoursSpecification: r.hours.map((s) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_SCHEMA[s.day],
      opens: s.open,
      closes: s.close,
    })),
    aggregateRating:
      r.rating.count >= 10
        ? { '@type': 'AggregateRating', ratingValue: r.rating.avg, reviewCount: r.rating.count, bestRating: 5 }
        : undefined,
    hasMenu: r.menu.length
      ? {
          '@type': 'Menu',
          hasMenuItem: r.menu.map((m) => ({
            '@type': 'MenuItem',
            name: m.name,
            description: m.desc,
            offers: { '@type': 'Offer', price: m.price, priceCurrency: 'VND' },
          })),
        }
      : undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${siteUrl()}${it.path}`,
    })),
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function restaurantBreadcrumb(r: Restaurant) {
  const dish = getDish(r.dish);
  const group = dish ? getGroup(dish.group) : undefined;
  return [
    { name: 'TP.HCM', path: '/' },
    ...(group ? [{ name: group.label, path: `/tim-kiem?nhom=${group.slug}` }] : []),
    ...(dish ? [{ name: dish.label, path: `/mon/${dish.slug}` }] : []),
  ];
}

/** Clamp to a max length on a word boundary (title ≤ 60, description ≤ 155). */
export function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Safe JSON for <script type="application/ld+json"> (prevents </script> injection). */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
