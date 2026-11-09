'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Check } from 'lucide-react';

type State = 'idle' | 'sending' | 'done' | 'error' | 'rate_limited';

/** City waitlist (ops decision D, 09/11): stored in `newsletter_subscribers` via /api/newsletter. */
export function WaitlistForm({ cities }: { cities: { slug: string; label: string }[] }) {
  const id = useId();
  const [state, setState] = useState<State>('idle');

  if (state === 'done') {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-raurau">
        <Check aria-hidden className="size-5" /> Đã ghi nhận. Chúng tôi sẽ email cho bạn khi thành phố mở.
      </p>
    );
  }

  return (
    <form
      className="mt-3 flex flex-col gap-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setState('sending');
        try {
          const res = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              email: form.get('email'),
              city: form.get('city') || null,
              consent: form.get('consent') === 'on',
              website: form.get('website') || null,
            }),
          });
          setState(res.ok ? 'done' : res.status === 429 ? 'rate_limited' : 'error');
        } catch {
          setState('error');
        }
      }}
    >
      <label htmlFor={`${id}-city`} className="sr-only">
        Thành phố
      </label>
      <select
        id={`${id}-city`}
        name="city"
        required
        className="h-11 rounded-input border border-line bg-surface px-3"
        defaultValue=""
      >
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
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="Email của bạn"
        className="h-11 rounded-input border border-line bg-surface px-3"
      />
      {/* Honeypot: hidden from people, filled by naive bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex items-start gap-2 text-[13px]">
        <input name="consent" type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-thanhlong" />
        <span>
          Tôi đồng ý nhận email thông báo từ EatInVietnam và đã đọc{' '}
          <Link href="/chinh-sach-bao-mat#pp-newsletter" className="font-semibold text-thanhlong underline">
            chính sách bảo mật
          </Link>
          . Hủy bất cứ lúc nào bằng link trong email.
        </span>
      </label>
      <button
        type="submit"
        disabled={state === 'sending'}
        className="h-11 rounded-full bg-ink text-[15px] font-bold text-surface disabled:opacity-60"
      >
        {state === 'sending' ? 'Đang gửi…' : 'Báo tôi khi mở'}
      </button>
      {(state === 'error' || state === 'rate_limited') && (
        <p role="alert" className="text-[13px] text-danger">
          {state === 'rate_limited' ? 'Bạn gửi hơi nhiều lần, thử lại sau 10 phút.' : 'Chưa gửi được, thử lại sau ít phút.'}
        </p>
      )}
    </form>
  );
}
