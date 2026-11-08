'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * UI only. Backend (separate `waitlist` table with consent_at, never in `events`)
 * waits for decision #1 item 4 — submitting shows a confirmation without storing anything.
 */
export function WaitlistForm({ cities }: { cities: { slug: string; label: string }[] }) {
  const id = useId();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-raurau">
        <Check aria-hidden className="size-5" /> Đã ghi nhận (bản demo chưa lưu email).
      </p>
    );
  }

  return (
    <form
      className="mt-3 flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor={`${id}-city`} className="sr-only">
        Thành phố
      </label>
      <select id={`${id}-city`} required className="h-11 rounded-input border border-line bg-surface px-3" defaultValue="">
        <option value="" disabled>
          Chọn thành phố
        </option>
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-email`} className="sr-only">
        Email
      </label>
      <input
        id={`${id}-email`}
        type="email"
        required
        autoComplete="email"
        placeholder="Email của bạn"
        className="h-11 rounded-input border border-line bg-surface px-3"
      />
      <label className="flex items-start gap-2 text-[13px]">
        <input type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-thanhlong" />
        <span>
          Tôi đồng ý nhận email thông báo và đã đọc{' '}
          <Link href="/chinh-sach-bao-mat" className="font-semibold text-thanhlong underline">
            chính sách bảo mật
          </Link>
          .
        </span>
      </label>
      <button type="submit" className="h-11 rounded-full bg-ink text-[15px] font-bold text-surface">
        Báo tôi khi mở
      </button>
    </form>
  );
}
