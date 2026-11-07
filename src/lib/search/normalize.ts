/** Lowercase, strip Vietnamese diacritics, collapse whitespace. Used for `search_text` and query matching. */
export const toSearchText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Stored form: padded with spaces so `LIKE '% term %'` matches whole words only. */
export const toStoredSearchText = (...parts: string[]) => ` ${toSearchText(parts.join(' '))} `;

/** True when every term appears as a whole word (or word prefix sequence) in `haystack` (stored form). */
export function matchesAllTerms(haystack: string, terms: string[]): boolean {
  return terms.every((t) => haystack.includes(` ${t} `));
}
