import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-input bg-sunken', className)} />;
}

/** List-row skeleton matching RestaurantCard variant="row" (~100px). */
export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Đang tải" className="divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 py-3">
          <Skeleton className="size-21 shrink-0" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
