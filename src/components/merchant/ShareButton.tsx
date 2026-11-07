'use client';

import { Share2 } from 'lucide-react';
import { track } from '@/lib/tracking';

export function ShareButton({ name }: { name: string }) {
  return (
    <button
      type="button"
      aria-label={`Chia sẻ quán ${name}`}
      onClick={async () => {
        const url = location.href;
        track('share', { kind: 'restaurant' });
        try {
          if (navigator.share) await navigator.share({ title: name, url });
          else await navigator.clipboard.writeText(url);
        } catch {
          // user cancelled the share sheet
        }
      }}
      className="grid size-11 place-items-center rounded-full bg-surface/95 shadow-card"
    >
      <Share2 aria-hidden className="size-5" />
    </button>
  );
}
