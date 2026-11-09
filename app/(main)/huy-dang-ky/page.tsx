import type { Metadata } from 'next';
import { UnsubscribeForm } from '@/components/UnsubscribeForm';

export const metadata: Metadata = {
  title: 'Hủy đăng ký nhận tin',
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <article className="flex flex-col gap-4 pt-5 pb-6 text-[15px] leading-relaxed">
      <h1 className="font-display text-h1 font-extrabold">Hủy đăng ký nhận tin</h1>
      {token ? (
        <UnsubscribeForm token={token} />
      ) : (
        <p className="text-muted">Link hủy đăng ký không đầy đủ. Mở lại link trong email EatInVietnam đã gửi bạn.</p>
      )}
    </article>
  );
}
