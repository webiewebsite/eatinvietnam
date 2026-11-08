import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { RecentlyViewed } from '@/components/saved/RecentlyViewed';

export const metadata: Metadata = { title: 'Tôi' };

/** Tab "Tôi" without accounts (decision #1 item 2): recently viewed, about, policy, feedback. */
export default function MePage() {
  return (
    <div className="flex flex-col gap-6 pt-5">
      <h1 className="font-display text-h1 font-extrabold">Tôi</h1>
      <RecentlyViewed />

      <section id="gioi-thieu" aria-labelledby="about" className="rounded-card bg-surface p-4 shadow-card">
        <Logo />
        <h2 id="about" className="sr-only">
          Giới thiệu
        </h2>
        <p className="mt-2 text-[14px]">
          EatInVietnam giúp bạn tìm quán ăn ngon có tuyển chọn: theo món, giá, giờ mở và vị trí. Bắt đầu từ Sài Gòn (Quận 1, 3, 4).
        </p>
      </section>

      <section id="chinh-sach" aria-labelledby="policy" className="scroll-mt-4">
        <h2 id="policy" className="font-display text-section font-bold">
          Chính sách bảo mật
        </h2>
        <p className="mt-1 text-[14px] text-muted">
          [Nội dung chính sách bảo mật — chờ pháp chế/vận hành]. Tóm tắt: không cần đăng nhập; quán đã lưu nằm trên máy bạn
          (localStorage); số liệu sử dụng ẩn danh, không lưu IP hay email.
        </p>
      </section>

      <section aria-labelledby="feedback">
        <h2 id="feedback" className="font-display text-section font-bold">
          Góp ý
        </h2>
        <p className="mt-1 text-[14px] text-muted">Thấy quán ngon mà chưa có, hay thông tin sai? Báo cho đội biên tập.</p>
        <a
          href="mailto:hello@eatinvietnam.com?subject=G%C3%B3p%20%C3%BD%20EatInVietnam"
          className="mt-2 inline-flex h-11 items-center rounded-full bg-ink px-5 font-bold text-surface"
        >
          Gửi góp ý
        </a>
      </section>
    </div>
  );
}
