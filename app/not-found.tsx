import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[480px] px-4 pt-16">
      <EmptyState
        title="Không tìm thấy trang"
        hint="Quán có thể đã đóng cửa hoặc đường dẫn bị sai."
        action={
          <Link href="/" className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-bold text-surface">
            Về trang chủ
          </Link>
        }
      />
    </main>
  );
}
