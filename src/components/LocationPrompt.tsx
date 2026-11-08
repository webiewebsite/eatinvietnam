'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LocateFixed } from 'lucide-react';
import { clsx } from 'clsx';
import { requestViewerLocation, type LocateError } from '@/lib/location-client';

/**
 * "Dùng vị trí của tôi" — the only way (besides /ban-do) the app asks for location.
 * On success the cookie is set and server-rendered lists refresh with real distances.
 */
export function LocationPrompt({ hint, className }: { hint?: string; className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<LocateError | null>(null);
  const [asking, setAsking] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const busy = asking || refreshing;

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(null);
          setAsking(true);
          try {
            await requestViewerLocation();
            startTransition(() => router.refresh());
          } catch (e) {
            setError(e as LocateError);
          } finally {
            setAsking(false);
          }
        }}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold text-ink shadow-card disabled:opacity-60"
      >
        <LocateFixed aria-hidden className="size-4 text-vitri" />
        {busy ? 'Đang lấy vị trí…' : 'Dùng vị trí của tôi'}
      </button>
      <p className="text-[12px] text-muted" role={error ? 'alert' : undefined}>
        {error === 'denied'
          ? 'Trình duyệt đang chặn vị trí — bật lại trong cài đặt trang để xem khoảng cách.'
          : error === 'unavailable'
            ? 'Chưa lấy được vị trí, thử lại sau nhé.'
            : (hint ?? 'Để xem khoảng cách tới từng quán.')}
      </p>
    </div>
  );
}
