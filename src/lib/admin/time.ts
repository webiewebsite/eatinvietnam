import { TIMEZONE } from '@/lib/hours';

/** 'YYYY-MM-DD' in Saigon time (price_updated_at, report dates). */
export function saigonDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** ISO week label in Saigon time, e.g. '2026-W46' — one reminder email per week. */
export function saigonIsoWeek(d: Date = new Date()): string {
  const [y, m, day] = saigonDate(d).split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, day));
  const dow = t.getUTCDay() || 7; // Mon = 1 … Sun = 7
  t.setUTCDate(t.getUTCDate() + 4 - dow); // Thursday of this week decides the year
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** 0 = Sunday … 6 = Saturday, Saigon time. */
export function saigonWeekday(d: Date = new Date()): number {
  const w = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(w);
}

/** "12/11/2026" or "—". */
export const viDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIMEZONE }).format(new Date(iso))
    : '—';

export const viDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TIMEZONE,
      }).format(new Date(iso))
    : '—';
