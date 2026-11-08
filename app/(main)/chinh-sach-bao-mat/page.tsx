import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'EatInVietnam thu thập và sử dụng dữ liệu của bạn như thế nào.',
  alternates: { canonical: '/chinh-sach-bao-mat' },
};

/**
 * Official text is written by the ops team and reviewed by legal (decision #9, 09/11).
 * Until then this page lists what the app actually does today, so the draft is accurate.
 */
export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-5 pt-5 pb-6 text-[15px] leading-relaxed">
      <header>
        <h1 className="font-display text-h1 font-extrabold">Chính sách bảo mật</h1>
        <p className="mt-2 rounded-input bg-xoai-soft px-3 py-2 text-[13px]">
          Bản nháp — nội dung chính thức đang được soạn và rà soát pháp lý.
        </p>
      </header>

      <section aria-labelledby="pp-collect">
        <h2 id="pp-collect" className="font-display text-section font-bold">
          Dữ liệu EatInVietnam đang xử lý
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Không cần tài khoản.</strong> Bạn dùng app mà không phải đăng nhập.
          </li>
          <li>
            <strong>Vị trí</strong> (chỉ khi bạn cho phép): làm tròn khoảng 100 m, lưu trong trình duyệt của bạn 1 ngày,
            dùng để tính khoảng cách tới quán, không lưu lại trên máy chủ.
          </li>
          <li>
            <strong>Quán đã lưu, quán đã xem gần đây:</strong> chỉ nằm trong trình duyệt của bạn. Xóa dữ liệu trang web là
            xóa hết.
          </li>
          <li>
            <strong>Thống kê sử dụng:</strong> các thao tác như tìm kiếm, xem quán, bấm chỉ đường được ghi kèm một mã ẩn
            danh ngẫu nhiên; không ghi tên, email hay địa chỉ IP đầy đủ.
          </li>
          <li>
            <strong>Báo sai thông tin:</strong> nội dung bạn gửi được dùng để đội biên tập kiểm tra lại quán.
          </li>
        </ul>
      </section>

      <section aria-labelledby="pp-third">
        <h2 id="pp-third" className="font-display text-section font-bold">
          Dịch vụ bên thứ ba
        </h2>
        <p className="mt-2 text-muted">
          [Do team vận hành soạn: Google Analytics (khi bật, có hỏi đồng ý cookie), Mapbox (bản đồ), Google Maps (khi bấm
          Chỉ đường), GrabFood / ShopeeFood (khi bấm Đặt món).]
        </p>
      </section>

      <section aria-labelledby="pp-rights">
        <h2 id="pp-rights" className="font-display text-section font-bold">
          Quyền của bạn và cách liên hệ
        </h2>
        <p className="mt-2 text-muted">[Do team vận hành soạn, pháp chế rà soát.]</p>
      </section>

      <p className="text-[13px] text-muted">Cập nhật lần cuối: [ngày ban hành].</p>
    </article>
  );
}
