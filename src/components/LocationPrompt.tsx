'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LocateFixed } from 'lucide-react';
import { clsx } from 'clsx';
import { useLocationConsent, type ConsentResult } from '@/components/LocationConsent';

/**
 * "Dùng vị trí của tôi". Opens the consent sheet first; the browser prompt only
 * appears after "Cho phép". On success server-rendered lists refresh with distances.
 */
export function LocationPrompt({ hint, className }: { hint?: string; className?: string }) {
  const router = useRouter();
  const { ask, sheet } = useLocationConsent();
  const [result, setResult] = useState<ConsentResult | null>(null);
  const [refreshing, startTransition] = useTransition();

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <button
        type="button"
        disabled={refreshing}
        onClick={async () => {
          const r = await ask();
          setResult(r);
          if (typeof r === 'object') startTransition(() => router.refresh());
        }}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold text-ink shadow-card disabled:opacity-60"
      >
        <LocateFixed aria-hidden className="size-4 text-vitri" />
        {refreshing ? 'Đang cập nhật…' : 'Dùng vị trí của tôi'}
      </button>
      <p className="text-[12px] text-muted">
        {result === 'declined'
          ? 'Không sao, bạn vẫn xem quán bình thường.'
          : (hint ?? 'Để xem khoảng cách tới từng quán.')}
      </p>
      {sheet}
    </div>
  );
}
