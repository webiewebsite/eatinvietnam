'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { CONSENT_EVENT, analyticsEnabled, readConsent, writeConsent } from '@/lib/consent';
import { disableGa, loadGa } from '@/lib/ga';

/**
 * Bottom sheet asking before Google Analytics runs. Renders nothing when NEXT_PUBLIC_GA_ID
 * is not set, so there is no banner while the site uses no analytics cookies.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
// 'ssr' on the server and during hydration: render nothing until the stored choice is known.
const snapshot = () => readConsent() ?? 'none';
const serverSnapshot = () => 'ssr' as const;

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  // Staff work in /admin is not analytics: no banner, no GA there.
  const isAdmin = usePathname()?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (!analyticsEnabled() || isAdmin) return;
    if (consent === 'granted') loadGa();
    if (consent === 'denied') disableGa();
  }, [consent, isAdmin]);

  // NEXT_PUBLIC_GA_ID is inlined at build time, so this is the same on server and client.
  if (!analyticsEnabled() || isAdmin || consent !== 'none') return null;

  return (
    <section
      role="region"
      aria-label="Cookie thống kê"
      className="fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 mx-auto w-[calc(100%-24px)] max-w-[456px] rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <p className="text-[14px] leading-snug">
        EatInVietnam muốn dùng Google Analytics để biết tính năng nào hữu ích. Không dùng cho quảng cáo.{' '}
        <Link href="/chinh-sach-bao-mat#pp-cookies" className="font-semibold text-thanhlong underline">
          Chi tiết
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => writeConsent('denied')}
          className="h-11 flex-1 rounded-full border border-line bg-surface text-[14px] font-bold"
        >
          Từ chối
        </button>
        <button
          type="button"
          onClick={() => writeConsent('granted')}
          className="h-11 flex-1 rounded-full bg-ink text-[14px] font-bold text-surface"
        >
          Đồng ý
        </button>
      </div>
    </section>
  );
}

/** "Đổi lựa chọn cookie" — clears the choice so the banner shows again. Hidden without GA. */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!analyticsEnabled()) return null;
  return (
    <button type="button" onClick={() => writeConsent(null)} className={className}>
      Đổi lựa chọn cookie
    </button>
  );
}
