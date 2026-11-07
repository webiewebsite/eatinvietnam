import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { formatRating } from '@/lib/format';

/** Star + score + count. Fewer than 10 ratings shows "Mới" instead of a misleading score. */
export function Rating({
  avg,
  count,
  showCount = false,
  className,
}: {
  avg: number;
  count: number;
  showCount?: boolean;
  className?: string;
}) {
  if (count < 10) {
    return <span className={clsx('font-semibold text-thanhlong', className)}>Mới</span>;
  }
  return (
    <span className={clsx('inline-flex items-center gap-0.5 font-semibold text-ink', className)}>
      <Star aria-hidden className="size-3.5 fill-xoai stroke-ink" strokeWidth={1.5} />
      <span>
        {formatRating(avg)}
        {showCount && <span className="font-normal text-muted"> ({count})</span>}
      </span>
      <span className="sr-only">
        điểm trên 5, {count} lượt đánh giá
      </span>
    </span>
  );
}
