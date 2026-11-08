'use client';

import { useEffect, useRef } from 'react';

/** 40×4px scroll indicator under a horizontal rail. Updates via a ref (no re-render per scroll). */
export function RailIndicator({ targetId }: { targetId: string }) {
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const ratio = max > 0 ? el.scrollLeft / max : 0;
      if (thumb.current) thumb.current.style.transform = `translateX(${ratio * 24}px)`;
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [targetId]);

  return (
    <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 overflow-hidden rounded-full bg-line">
      <span ref={thumb} className="block h-full w-4 rounded-full bg-thanhlong" />
    </div>
  );
}
