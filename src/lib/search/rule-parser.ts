/**
 * Deterministic query parser: Vietnamese free text → SearchFilters.
 * Used as the keyword fallback and, until the Haiku NL parser lands (issue #7),
 * as the only parser behind "Hiểu là: …".
 */
import { DISH_KEYWORDS, DISTRICT_KEYWORDS, GROUPS } from '@/lib/taxonomy';
import type { SearchFilters } from '@/lib/types';
import { toSearchText } from './normalize';

const GROUP_PHRASES: { key: string; slug: string }[] = [
  ...GROUPS.map((g) => ({ key: toSearchText(g.label), slug: g.slug })),
  { key: 'do nuoc', slug: 'mon-nuoc' },
  { key: 'mon nuoc', slug: 'mon-nuoc' },
  { key: 'an vat', slug: 'an-vat' },
  { key: 'hai san', slug: 'oc-hai-san' },
].sort((a, b) => b.key.length - a.key.length);

const NEAR = ['gan day', 'gan toi', 'gan nha', 'quanh day', 'xung quanh', 'gan'];
const OPEN_NOW = ['dang mo', 'mo cua', 'con mo', 'con ban'];
const LATE = ['an khuya', 'an dem', 'khuya', 'nua dem', 'dem khuya'];
const CHEAP = ['re', 'gia re', 'binh dan', 'sinh vien'];

// Filler words that should not become keyword terms.
const STOPWORDS = new Set(
  'toi minh tui muon them thich can tim kiem an uong cho voi o tai co khong gi nao mon quan nha hang ngon nhat di the la va hay mot vai cai do dau bao nhieu duoc nhe nha a oi'.split(
    ' ',
  ),
);

/** Removes `phrase` (whole words) from `text` and reports whether it was there. */
function take(text: string, phrase: string): [boolean, string] {
  const padded = ` ${text} `;
  const needle = ` ${phrase} `;
  if (!padded.includes(needle)) return [false, text];
  return [true, padded.replace(needle, ' ').trim()];
}

export function parseQuery(raw: string): SearchFilters {
  let text = toSearchText(raw);
  const filters: SearchFilters = { terms: [], dishes: [] };

  // Price: "duoi 50k", "<= 50 nghin", "toi da 50000", "50k tro xuong"
  const price = text.match(/(?:duoi|toi da|khong qua|max)\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|000)?/);
  const priceAfter = text.match(/(\d+)\s*(k|nghin|ngan)\s*(?:tro xuong|do lai)/);
  const pm = price ?? priceAfter;
  if (pm) {
    const n = Number(pm[1]!.replace(',', '.'));
    const unit = pm[2];
    filters.priceMax = unit === 'tr' ? n * 1_000_000 : n < 1000 ? n * 1000 : n;
    text = text.replace(pm[0], ' ');
  }

  for (const p of LATE) {
    const [hit, rest] = take(text, p);
    if (hit) {
      filters.lateNight = true;
      text = rest;
    }
  }
  for (const p of OPEN_NOW) {
    const [hit, rest] = take(text, p);
    if (hit) {
      filters.openNow = true;
      text = rest;
    }
  }
  for (const p of NEAR) {
    const [hit, rest] = take(text, p);
    if (hit) {
      filters.radiusKm = 2;
      text = rest;
      break;
    }
  }
  for (const p of CHEAP) {
    const [hit, rest] = take(text, p);
    if (hit) {
      filters.priceMax ??= 40000;
      text = rest;
    }
  }
  for (const { key, slug } of DISTRICT_KEYWORDS) {
    const [hit, rest] = take(text, key);
    if (hit) {
      filters.district = slug;
      text = rest;
      break;
    }
  }
  for (const { key, slug } of DISH_KEYWORDS) {
    const [hit, rest] = take(text, key);
    if (hit) {
      if (!filters.dishes.includes(slug)) filters.dishes.push(slug);
      text = rest;
    }
  }
  if (!filters.dishes.length) {
    for (const { key, slug } of GROUP_PHRASES) {
      const [hit, rest] = take(text, key);
      if (hit) {
        filters.group = slug;
        text = rest;
        break;
      }
    }
  }

  filters.terms = text.split(' ').filter((w) => w.length > 0 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return filters;
}
