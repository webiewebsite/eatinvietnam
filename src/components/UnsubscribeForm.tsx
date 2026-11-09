'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

/** Unsubscribing needs a click (POST): mail scanners open links but never press buttons. */
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  if (state === 'done') {
    return (
      <p role="status" className="flex items-center gap-2 font-semibold text-raurau">
        <Check aria-hidden className="size-5" /> Đã hủy. Bạn sẽ không nhận email từ EatInVietnam nữa.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p>Bấm nút bên dưới để ngừng nhận email từ EatInVietnam.</p>
      <button
        type="button"
        disabled={state === 'sending'}
        onClick={async () => {
          setState('sending');
          try {
            const res = await fetch('/api/newsletter/unsubscribe', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            setState(res.ok ? 'done' : 'error');
          } catch {
            setState('error');
          }
        }}
        className="h-11 self-start rounded-full bg-ink px-5 font-bold text-surface disabled:opacity-60"
      >
        {state === 'sending' ? 'Đang hủy…' : 'Hủy đăng ký'}
      </button>
      {state === 'error' && (
        <p role="alert" className="text-[14px] text-danger">
          Chưa hủy được. Thử lại sau ít phút, hoặc trả lời email để chúng tôi hủy giúp.
        </p>
      )}
    </div>
  );
}
