/** 45000 → "45.000đ" */
export const formatPrice = (vnd: number) => `${new Intl.NumberFormat('vi-VN').format(vnd)}đ`;

/** 45000, 65000 → "45–65k"; equal values → "50k"; missing → null. */
export function formatPriceRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const k = (v: number) => `${Math.round(v / 1000)}`;
  if (min != null && max != null && min !== max) return `${k(min)}–${k(max)}k`;
  return `${k((min ?? max)!)}k`;
}

/** 350 → "350 m"; 1234 → "1,2 km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** 4.7 → "4.7" (design uses dot for ratings, comma for distances). */
export const formatRating = (avg: number) => avg.toFixed(1);

/** ISO date → "12/10/2026" */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(iso),
  );
