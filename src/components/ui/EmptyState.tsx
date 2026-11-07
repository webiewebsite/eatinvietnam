import { clsx } from 'clsx';
import { LogoMark } from '@/components/Logo';

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center gap-2 rounded-card bg-surface px-6 py-10 text-center', className)}>
      <LogoMark size={44} className="opacity-90" />
      <p className="font-display text-section font-bold">{title}</p>
      {hint && <p className="max-w-[28ch] text-meta text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
