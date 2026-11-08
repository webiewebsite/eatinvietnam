'use client';

import { useRef } from 'react';
import { ExternalLink, Navigation, Phone, X } from 'lucide-react';
import { track } from '@/lib/tracking';

/** Fixed bottom bar: Gọi (icon) · Đặt món ↗ (secondary) · Chỉ đường (primary, sticker). */
export function ActionBar({
  slug,
  name,
  phone,
  lat,
  lng,
  grabUrl,
  shopeeUrl,
}: {
  slug: string;
  name: string;
  phone?: string;
  lat: number;
  lng: number;
  grabUrl?: string;
  shopeeUrl?: string;
}) {
  const sheet = useRef<HTMLDialogElement>(null);
  const canOrder = !!(grabUrl || shopeeUrl);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[480px] items-center gap-2 px-3 py-2.5">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label={`Gọi ${name}`}
              className="grid size-12 shrink-0 place-items-center rounded-full border border-line"
            >
              <Phone aria-hidden className="size-5" />
            </a>
          )}
          {canOrder && (
            <button
              type="button"
              onClick={() => sheet.current?.showModal()}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-full border border-line bg-surface shadow-card text-[15px] font-bold"
            >
              Đặt món <ExternalLink aria-hidden className="size-4" />
            </button>
          )}
          <a
            href={directions}
            target="_blank"
            rel="noopener"
            onClick={() => track('directions', { slug })}
            className="sticker inline-flex h-12 flex-[1.3] items-center justify-center gap-1.5 rounded-full bg-thanhlong text-[15px] font-bold text-on-thanhlong"
          >
            <Navigation aria-hidden className="size-4.5" />
            Chỉ đường
          </a>
        </div>
      </div>

      {canOrder && (
        <dialog
          ref={sheet}
          aria-labelledby="order-title"
          className="m-0 mt-auto w-full max-w-none rounded-t-card bg-surface p-0 text-ink shadow-sheet backdrop:bg-scrim sm:mx-auto sm:max-w-[480px]"
        >
          <div className="flex flex-col gap-3 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <h2 id="order-title" className="font-display text-section font-bold">
                Đặt món qua app giao hàng
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => sheet.current?.close()}
                className="grid size-10 place-items-center rounded-full hover:bg-sunken"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <p className="text-meta text-muted">Mở trong tab mới. EatInVietnam không nhận đặt món.</p>
            {grabUrl && (
              <a
                href={grabUrl}
                target="_blank"
                rel="noopener"
                onClick={() => track('outbound_grab', { slug })}
                className="flex h-12 items-center justify-between rounded-input border border-line px-4 font-semibold"
              >
                GrabFood <ExternalLink aria-hidden className="size-4 text-muted" />
              </a>
            )}
            {shopeeUrl && (
              <a
                href={shopeeUrl}
                target="_blank"
                rel="noopener"
                onClick={() => track('outbound_shopeefood', { slug })}
                className="flex h-12 items-center justify-between rounded-input border border-line px-4 font-semibold"
              >
                ShopeeFood <ExternalLink aria-hidden className="size-4 text-muted" />
              </a>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
