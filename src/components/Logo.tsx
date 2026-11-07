import { clsx } from 'clsx';

/**
 * Temporary brand mark until the official logo ships: a map pin (bản đồ là CTA chính)
 * holding a bowl with chopsticks, sticker-style (ink outline + hard shadow).
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        d="M26.5 5.5C16 5.5 8.5 13.3 8.5 23.1 8.5 35.5 26.5 47.5 26.5 47.5S44.5 35.5 44.5 23.1C44.5 13.3 37 5.5 26.5 5.5Z"
        fill="var(--ink)"
      />
      <path
        d="M24 3C13.5 3 6 10.8 6 20.6 6 33 24 45 24 45S42 33 42 20.6C42 10.8 34.5 3 24 3Z"
        fill="var(--thanhlong)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M27.5 17.5 36 9M30.5 18 38 11.5" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M13 19.5h22c0 6.4-4.9 10.5-11 10.5s-11-4.1-11-10.5Z"
        fill="var(--bg)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17 15.5c0-2 2-2.3 2-4.3M21.5 15.5c0-2 2-2.3 2-4.3" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M18 24.5h12" stroke="var(--xoai)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <LogoMark size={size === 'lg' ? 40 : 30} />
      <span
        className={clsx(
          'font-display font-extrabold tracking-[-0.02em] leading-none',
          size === 'lg' ? 'text-[28px]' : 'text-[21px]',
        )}
      >
        <span className="text-ink">EatIn</span>
        <span className="text-thanhlong">Vietnam</span>
      </span>
    </span>
  );
}
