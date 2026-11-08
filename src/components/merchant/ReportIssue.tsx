'use client';

import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { track } from '@/lib/tracking';

const REASONS = [
  { value: 'price', label: 'Giá sai' },
  { value: 'hours', label: 'Giờ mở sai' },
  { value: 'closed', label: 'Quán đã đóng cửa' },
  { value: 'address', label: 'Sai địa chỉ' },
  { value: 'other', label: 'Khác' },
];

/** "Báo sai thông tin" — short form, no login. */
export function ReportIssue({ slug, label = 'Báo giá sai', defaultReason = 'price' }: { slug: string; label?: string; defaultReason?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState('idle');
          dialog.current?.showModal();
        }}
        className="font-semibold text-thanhlong underline underline-offset-2"
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="report-title"
        className="m-0 mt-auto w-full max-w-none rounded-t-card bg-surface p-0 text-ink shadow-sheet backdrop:bg-scrim sm:mx-auto sm:max-w-[480px]"
      >
        <form
          className="flex flex-col gap-3 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setState('sending');
            try {
              const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ slug, reason: data.get('reason'), note: data.get('note'), website: data.get('website') }),
              });
              if (!res.ok) throw new Error(String(res.status));
              track('report_issue', { slug, reason: String(data.get('reason')) });
              setState('done');
            } catch {
              setState('error');
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 id="report-title" className="font-display text-section font-bold">
              Báo sai thông tin
            </h2>
            <button type="button" aria-label="Đóng" onClick={() => dialog.current?.close()} className="grid size-10 place-items-center rounded-full hover:bg-sunken">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {state === 'done' ? (
            <p role="status" className="flex items-center gap-2 py-4 font-semibold text-raurau">
              <Check aria-hidden className="size-5" /> Cảm ơn bạn! Đội biên tập sẽ kiểm tra lại.
            </p>
          ) : (
            <>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">Sai điều gì?</legend>
                {REASONS.map((r) => (
                  <label key={r.value} className="has-checked:border-xoai has-checked:bg-xoai inline-flex h-10 items-center rounded-full border border-line px-3.5 text-[14px] font-semibold">
                    <input type="radio" name="reason" value={r.value} defaultChecked={r.value === defaultReason} className="sr-only" />
                    {r.label}
                  </label>
                ))}
              </fieldset>
              <label className="flex flex-col gap-1 text-[14px] font-semibold">
                Ghi chú (không bắt buộc)
                <textarea name="note" maxLength={500} rows={3} className="rounded-input border border-line bg-bg p-3 font-normal" placeholder="VD: Bún bò đặc biệt giờ là 70.000đ" />
              </label>
              {/* Honeypot: bots fill it, people never see it. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              {state === 'error' && <p className="text-[13px] font-semibold text-danger">Chưa gửi được, thử lại sau nhé.</p>}
              <button type="submit" disabled={state === 'sending'} className="h-12 rounded-full bg-ink font-bold text-surface disabled:opacity-60">
                {state === 'sending' ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
