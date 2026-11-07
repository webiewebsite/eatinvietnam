import { clsx } from 'clsx';

type Tone = 'open' | 'closed' | 'price' | 'pick' | 'neutral' | 'brand' | 'sponsored';

const TONES: Record<Tone, string> = {
  open: 'bg-raurau-soft text-raurau',
  closed: 'bg-sunken text-danger',
  price: 'bg-xoai-soft text-ink',
  pick: 'bg-xoai text-on-xoai',
  neutral: 'bg-sunken text-muted',
  brand: 'bg-thanhlong-soft text-thanhlong',
  sponsored: 'bg-surface/90 text-ink',
};

export function Tag({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-tag px-1.5 py-0.5 text-badge font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
