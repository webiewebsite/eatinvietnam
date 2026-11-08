import type { OpeningSlot } from '@/lib/types';

export const TIMEZONE = 'Asia/Ho_Chi_Minh';
const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** Request-time clock. Wrapped so render code stays free of direct impure calls. */
export const currentDate = () => new Date();

export const toMinutes =(hhmm: string) => {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/** Weekday (0 = Sunday) and minutes since midnight in Saigon time, regardless of server TZ. */
export function saigonClock(date: Date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const isOvernight = (s: OpeningSlot) => toMinutes(s.close) <= toMinutes(s.open);

export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; opensAt?: string; opensDayOffset?: number };

/** Whether the restaurant is open at `date`, handling windows that run past midnight. */
export function openState(hours: OpeningSlot[], date: Date = new Date()): OpenState {
  const { day, minutes } = saigonClock(date);
  const yesterday = (day + 6) % 7;

  for (const s of hours) {
    const open = toMinutes(s.open);
    const close = toMinutes(s.close);
    if (s.day === day) {
      if (!isOvernight(s) && minutes >= open && minutes < close) return { open: true, closesAt: s.close };
      if (isOvernight(s) && minutes >= open) return { open: true, closesAt: s.close };
    }
    // Yesterday's late window still running after midnight.
    if (s.day === yesterday && isOvernight(s) && minutes < close) return { open: true, closesAt: s.close };
  }

  // Next opening within the coming 7 days.
  for (let offset = 0; offset < 7; offset++) {
    const d = (day + offset) % 7;
    const next = hours
      .filter((s) => s.day === d && (offset > 0 || toMinutes(s.open) > minutes))
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))[0];
    if (next) return { open: false, opensAt: next.open, opensDayOffset: offset };
  }
  return { open: false };
}

/** Short Vietnamese status line: "Đang mở · đến 21:00" / "Mở lúc 15:00" / "Mở thứ 2, 06:00". */
export function openLabel(state: OpenState): string {
  if (state.open) return `Đang mở · đến ${state.closesAt}`;
  if (!state.opensAt) return 'Đã đóng cửa';
  if (state.opensDayOffset === 0) return `Mở lúc ${state.opensAt}`;
  if (state.opensDayOffset === 1) return `Mở ngày mai, ${state.opensAt}`;
  return `Đóng cửa hôm nay`;
}

/** Chip "Ăn khuya" (ops, 09/11): open past 22:00 — closes after 22:00 or runs past midnight. */
export const LATE_NIGHT_AFTER = '22:00';
export const isLateNight = (hours: OpeningSlot[]) =>
  hours.some((s) => isOvernight(s) || toMinutes(s.close) > toMinutes(LATE_NIGHT_AFTER));

/** Group identical windows: "06:00–21:00 hằng ngày" or per-day lines. */
export function hoursSummary(hours: OpeningSlot[]): { label: string; lines: { day: string; text: string }[] } {
  const lines = DAY_LABELS.map((label, day) => {
    const slots = hours
      .filter((s) => s.day === day)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))
      .map((s) => `${s.open}–${s.close}`);
    return { day: label, text: slots.length ? slots.join(', ') : 'Nghỉ' };
  });
  const unique = new Set(lines.map((l) => l.text));
  const label = unique.size === 1 ? `${lines[0]!.text} hằng ngày` : 'Giờ mở thay đổi theo ngày';
  // Monday first reads more naturally in Vietnamese.
  return { label, lines: [...lines.slice(1), lines[0]!] };
}

/** Builds the same window(s) for all 7 days. */
export function everyDay(...windows: [string, string][]): OpeningSlot[] {
  return [0, 1, 2, 3, 4, 5, 6].flatMap((day) => windows.map(([open, close]) => ({ day, open, close })));
}
