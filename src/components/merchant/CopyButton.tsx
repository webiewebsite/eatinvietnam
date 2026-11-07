'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Sao chép' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard blocked: nothing to do
        }
      }}
      className="inline-flex h-10 shrink-0 items-center px-2 text-[13px] font-bold text-thanhlong"
      aria-live="polite"
    >
      {copied ? 'Đã chép' : label}
    </button>
  );
}
