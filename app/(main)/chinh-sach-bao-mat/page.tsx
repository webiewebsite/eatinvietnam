import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'EatInVietnam thu thập và sử dụng dữ liệu của bạn như thế nào.',
  alternates: { canonical: '/chinh-sach-bao-mat' },
};

/**
 * Official text: written by ops, reviewed by legal (decision #9). Every factual line here
 * was checked against the code on 09/11 — when behaviour changes (GA4, accounts, NL search
 * via Anthropic, R2 images), update this page in the same PR.
 * [Bracketed] parts are waiting on ops/legal and must be filled before launch.
 */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-section font-bold">
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

const List = ({ children }: { children: ReactNode }) => (
  <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>
);

const Todo = ({ children }: { children: ReactNode }) => <span className="text-muted">{children}</span>;

export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-5 pt-5 pb-6 text-[15px] leading-relaxed">
      <header>
        <h1 className="font-display text-h1 font-extrabold">Chính sách bảo mật</h1>
        <p className="mt-2 rounded-input bg-xoai-soft px-3 py-2 text-[13px]">
          Bản nháp — đang được rà soát pháp lý trước khi ban hành.
        </p>
      </header>

      <Section id="pp-who" title="1. Chúng tôi là ai">
        <p>
          EatInVietnam là trang khám phá quán ăn do <Todo>[tên pháp nhân, địa chỉ đăng ký]</Todo> vận hành. Bạn dùng trang
          mà không cần tạo tài khoản.
        </p>
      </Section>

      <Section id="pp-collect" title="2. Dữ liệu chúng tôi xử lý">
        <List>
          <li>
            <strong>Vị trí</strong> — chỉ khi bạn bấm “Dùng vị trí của tôi” hoặc đồng ý ở màn Bản đồ; bạn có thể từ chối và
            vẫn dùng trang bình thường. Vị trí được làm tròn khoảng 100 m, lưu trong cookie trên trình duyệt của bạn tối
            đa 1 ngày, và gửi kèm khi tải trang chỉ để tính khoảng cách tới quán. Máy chủ không lưu lại vị trí này.
          </li>
          <li>
            <strong>Quán đã lưu, quán đã xem gần đây</strong> — chỉ nằm trong trình duyệt của bạn, không gửi về máy chủ.
            Xóa dữ liệu trang web là xóa hết.
          </li>
          <li>
            <strong>Thống kê sử dụng</strong> — một số thao tác (tìm kiếm, xem quán, lưu, bấm chỉ đường hoặc đặt món) được
            ghi kèm một mã ngẫu nhiên tạo trên trình duyệt của bạn, để biết tính năng nào hữu ích. Dữ liệu này không
            chứa tên, email hay số điện thoại.
          </li>
          <li>
            <strong>Báo sai thông tin</strong> — lý do và ghi chú bạn gửi, dùng để đội biên tập kiểm tra lại quán. Biểu
            mẫu không hỏi tên hay thông tin liên lạc.
          </li>
          <li>
            <strong>Email góp ý</strong> — khi bạn gửi email cho chúng tôi, chúng tôi nhận địa chỉ email và nội dung thư để
            trả lời.
          </li>
          <li>
            <strong>Nhật ký máy chủ</strong> — nhà cung cấp hosting tự động ghi địa chỉ IP, loại trình duyệt và trang được
            truy cập để vận hành và chống tấn công. <Todo>[Thời gian lưu theo nhà cung cấp — pháp chế xác nhận.]</Todo>
          </li>
        </List>
        <p>
          Chúng tôi <strong>không</strong> bán dữ liệu, không dùng dữ liệu để quảng cáo nhắm mục tiêu, và hiện không cài
          Google Analytics hay công cụ quảng cáo nào.
        </p>
      </Section>

      <Section id="pp-third" title="3. Dịch vụ bên thứ ba">
        <List>
          <li>
            <strong>Hostinger</strong> — máy chủ chạy trang và cơ sở dữ liệu.
          </li>
          <li>
            <strong>Pexels</strong> — một số ảnh minh họa được tải trực tiếp từ máy chủ ảnh của Pexels, nên Pexels nhận địa
            chỉ IP của bạn khi ảnh hiển thị.
          </li>
          <li>
            <strong>Mapbox</strong> — chỉ tải ở màn Bản đồ để hiển thị bản đồ.
          </li>
          <li>
            <strong>Google Maps, GrabFood, ShopeeFood</strong> — chỉ khi bạn bấm “Chỉ đường” hoặc “Đặt món”, bạn được
            chuyển sang trang của họ và chính sách của họ áp dụng từ đó.
          </li>
        </List>
      </Section>

      <Section id="pp-retention" title="4. Lưu trữ bao lâu">
        <p>
          Vị trí: tối đa 1 ngày trên trình duyệt của bạn. Thống kê sử dụng và báo sai thông tin:{' '}
          <Todo>[thời hạn — team vận hành đề xuất, pháp chế duyệt]</Todo>.
        </p>
      </Section>

      <Section id="pp-rights" title="5. Quyền của bạn">
        <p>
          Bạn có thể tắt quyền vị trí trong trình duyệt bất cứ lúc nào, hoặc xóa dữ liệu trang web để xóa vị trí, quán đã
          lưu và mã thống kê. Để yêu cầu xem, sửa hoặc xóa dữ liệu khác, liên hệ <Todo>[email liên hệ]</Todo>.
        </p>
        <p>
          <Todo>[Pháp chế bổ sung căn cứ Nghị định 13/2023/NĐ-CP và thời hạn phản hồi yêu cầu.]</Todo>
        </p>
      </Section>

      <Section id="pp-changes" title="6. Thay đổi chính sách">
        <p>
          Khi thêm tính năng xử lý dữ liệu mới (ví dụ tài khoản người dùng hoặc tìm kiếm bằng câu tự nhiên), chúng tôi cập
          nhật trang này trước khi tính năng ra mắt.
        </p>
      </Section>

      <p className="text-[13px] text-muted">Cập nhật lần cuối: [ngày ban hành].</p>
    </article>
  );
}
