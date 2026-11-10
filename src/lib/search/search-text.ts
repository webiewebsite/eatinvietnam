import { toStoredSearchText } from '@/lib/search/normalize';
import { dishLabel, districtLabel } from '@/lib/taxonomy';

/** restaurants.search_text — the same fields for demo data, the seed and admin saves. */
export function searchTextFor(r: {
  name: string;
  dishes: string[];
  district: string;
  venueType: string;
  highlight: string;
  features: string[];
  menu: { name: string }[];
}): string {
  return toStoredSearchText(
    r.name,
    r.dishes.map(dishLabel).join(' '),
    districtLabel(r.district),
    r.venueType,
    r.highlight,
    r.features.join(' '),
    r.menu.map((m) => m.name).join(' '),
  );
}
