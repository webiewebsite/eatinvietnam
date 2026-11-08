'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import type { LatLng } from '@/lib/geo';
import { markLocationDeclined, requestViewerLocation, type LocateError } from '@/lib/location-client';

export type ConsentResult = LatLng | 'declined' | LocateError;

/**
 * Explains why we want the location BEFORE the browser's own prompt, and lets people
 * say no (decision #1, 09/11). Returns `ask()` and the sheet to render.
 */
export function useLocationConsent() {
  const dialog = useRef<HTMLDialogElement>(null);
  const settle = useRef<((r: ConsentResult) => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LocateError | null>(null);

  const finish = (r: ConsentResult) => {
    settle.current?.(r);
    settle.current = null;
    dialog.current?.close();
  };

  const ask = useCallback(
    () =>
      new Promise<ConsentResult>((resolve) => {
        settle.current = resolve;
        setError(null);
        dialog.current?.showModal();
      }),
    [],
  );

  const allow = async () => {
    setBusy(true);
    try {
      finish(await requestViewerLocation());
    } catch (e) {
      // Keep the sheet open so the person sees why (blocked in browser settings, no signal…).
      setError(e as LocateError);
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    markLocationDeclined();
    finish(error ?? 'declined');
  };

  const sheet = (
    <dialog
      ref={dialog}
      aria-labelledby="loc-consent-title"
      onCancel={(e) => {
        e.preventDefault();
        decline();
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-card bg-surface p-0 text-ink shadow-sheet backdrop:bg-scrim sm:mx-auto sm:max-w-[480px]"
    >
      <div className="flex flex-col gap-3 p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <span className="grid size-11 place-items-center rounded-full bg-sunken">
          <LocateFixed aria-hidden className="size-5 text-vitri" />
        </span>
        <h2 id="loc-consent-title" className="font-display text-section font-bold">
          Cho phép dùng vị trí của bạn?
        </h2>
        <p className="text-[15px]">EatInVietnam dùng vị trí để tính khoảng cách và xếp quán gần bạn lên trước.</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] text-muted">
          <li>Vị trí được làm tròn khoảng 100 m, không lưu vị trí chính xác.</li>
          <li>Chỉ lưu trong trình duyệt của bạn 1 ngày, không lưu lại trên máy chủ.</li>
          <li>Không cho phép vẫn dùng app bình thường, chỉ không hiện khoảng cách.</li>
        </ul>
        <Link href="/chinh-sach-bao-mat" className="w-fit text-[13px] font-semibold text-thanhlong underline underline-offset-2">
          Chính sách bảo mật
        </Link>
        {error && (
          <p role="alert" className="rounded-input bg-sunken px-3 py-2 text-[13px]">
            {error === 'denied'
              ? 'Trình duyệt đang chặn vị trí cho trang này. Bật lại trong cài đặt trang web rồi thử lại.'
              : 'Chưa lấy được vị trí. Kiểm tra GPS/kết nối rồi thử lại.'}
          </p>
        )}
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={decline}
            className="h-12 flex-1 rounded-full border border-line bg-surface text-[15px] font-bold"
          >
            Không, cảm ơn
          </button>
          <button
            type="button"
            onClick={allow}
            disabled={busy}
            className="h-12 flex-[1.3] rounded-full bg-thanhlong text-[15px] font-bold text-on-thanhlong disabled:opacity-60"
          >
            {busy ? 'Đang lấy vị trí…' : error ? 'Thử lại' : 'Cho phép'}
          </button>
        </div>
      </div>
    </dialog>
  );

  return { ask, sheet };
}
