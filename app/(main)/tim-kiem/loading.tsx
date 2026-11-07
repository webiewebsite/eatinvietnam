import { RowSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-3 pt-3">
      <Skeleton className="h-11 rounded-full" />
      <Skeleton className="h-9 w-3/4 rounded-full" />
      <RowSkeleton count={5} />
    </div>
  );
}
