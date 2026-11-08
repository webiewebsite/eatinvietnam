import Link from 'next/link';
import { saigonClock } from '@/lib/hours';

const SLOTS = [
  { from: 5 * 60, to: 10 * 60 + 30, title: 'ăn sáng gì đây?', chips: ['Phở', 'Bánh mì', 'Bún bò', 'Cà phê sữa đá'] },
  { from: 10 * 60 + 30, to: 14 * 60, title: 'trưa nay ăn gì?', chips: ['Cơm tấm', 'Bún bò', 'Món chay', 'Bánh xèo'] },
  { from: 14 * 60, to: 17 * 60 + 30, title: 'ăn xế gì đây?', chips: ['Bánh tráng trộn', 'Ốc', 'Chè mát', 'Bột chiên'] },
  { from: 17 * 60 + 30, to: 21 * 60, title: 'tối nay ăn gì?', chips: ['Ốc', 'Lẩu', 'Bánh xèo', 'Hủ tiếu'] },
  { from: 21 * 60, to: 29 * 60, title: 'đói khuya rồi?', chips: ['Cháo', 'Hủ tiếu gõ', 'Ốc', 'Bún bò'] },
];

/** "16:30 rồi — ăn xế gì đây?" with time-of-day suggestions (server time, Asia/Ho_Chi_Minh). */
export function TimeSuggest({ now }: { now: Date }) {
  const { minutes } = saigonClock(now);
  const m = minutes < 5 * 60 ? minutes + 24 * 60 : minutes;
  const slot = SLOTS.find((s) => m >= s.from && m < s.to) ?? SLOTS[0]!;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');

  return (
    <section aria-labelledby="time-suggest">
      <h2 id="time-suggest" className="font-display text-section font-bold">
        {hh}:{mm} rồi — {slot.title}
      </h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {slot.chips.map((c) => (
          <li key={c}>
            <Link
              href={`/tim-kiem?q=${encodeURIComponent(c)}`}
              className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold"
            >
              {c}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
