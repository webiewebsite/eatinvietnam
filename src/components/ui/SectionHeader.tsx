import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export function SectionHeader({
  title,
  href,
  linkLabel = 'Xem tất cả',
  className,
  id,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={clsx('flex items-center justify-between gap-3', className)}>
      <h2 id={id} className="font-display text-section font-bold">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="-mr-2 inline-flex min-h-10 items-center gap-0.5 px-2 text-meta font-semibold text-thanhlong"
        >
          {linkLabel}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}
