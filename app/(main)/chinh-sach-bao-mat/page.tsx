import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CookieSettingsButton } from '@/components/CookieConsent';
import { analyticsEnabled } from '@/lib/consent';

const CONTACT = 'hello@eatinvietnam.online';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'EatInVietnam thu thập và sử dụng dữ liệu của bạn như thế nào.',
  alternates: { canonical: '/chinh-sach-bao-mat' },
};

/**
 * Official text: written by ops, reviewed by legal (decision #9). Every factual line here
 * matches the code — when behaviour changes (accounts, NL search via Anthropic, R2 images),
 * update this page in the same PR. The Google Analytics parts render only when
 * NEXT_PUBLIC_GA_ID is set, so the page never claims analytics the site does not run.
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
  const ga = analyticsEnabled();
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
          EatInVietnam là trang khám phá quán ăn do Webie Vietnam (<Todo>[địa chỉ đăng ký]</Todo>) vận hành. Bạn dùng
          trang mà không cần tạo tài khoản. Liên hệ về dữ liệu cá nhân: <a href={`mailto:${CONTACT}`} className="font-semibold text-thanhlong underline">{CONTACT}</a>.
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
            {ga && ' Nếu bạn bấm “Đồng ý” ở thông báo cookie, các thao tác này cũng được gửi tới Google Analytics (mục 4).'}
          </li>
          <li id="pp-newsletter">
            <strong>Đăng ký nhận tin</strong> — khi bạn để lại email để được báo lúc thành phố mở, chúng tôi lưu email,
            thành phố bạn chọn và thời điểm bạn đồng ý. Email chỉ dùng để gửi thông báo của EatInVietnam, không chia sẻ cho
            bên khác. Mỗi email có link hủy đăng ký.
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
          Chúng tôi <strong>không</strong> bán dữ liệu và không dùng dữ liệu để quảng cáo nhắm mục tiêu.
          {ga ? ' Google Analytics chỉ chạy khi bạn đồng ý; tính năng quảng cáo của Google được tắt.' : ' Trang hiện không cài Google Analytics hay công cụ quảng cáo nào.'}
        </p>
      </Section>

      <Section id="pp-cookies" title="3. Cookie và dữ liệu lưu trên trình duyệt">
        <List>
          <li>
            <code>eiv_loc</code> (cookie) — vị trí đã làm tròn, tối đa 1 ngày, chỉ khi bạn cho phép.
          </li>
          <li>
            Quán đã lưu, danh sách, quán đã xem, mã thống kê ngẫu nhiên và lựa chọn cookie của bạn — lưu trong bộ nhớ
            trình duyệt (localStorage), không hết hạn cho tới khi bạn xóa dữ liệu trang web.
          </li>
          <li>Việc bạn từ chối chia sẻ vị trí — chỉ nhớ trong phiên duyệt web hiện tại.</li>
          {ga && (
            <li>
              <code>_ga</code>, <code>_ga_…</code> (cookie của Google Analytics) — chỉ đặt sau khi bạn bấm “Đồng ý”; theo
              mặc định của Google, tối đa 2 năm.
            </li>
          )}
        </List>
        {ga && (
          <p>
            Bạn đổi ý bất cứ lúc nào:{' '}
            <CookieSettingsButton className="font-semibold text-thanhlong underline" />.
          </p>
        )}
      </Section>

      <Section id="pp-third" title="4. Dịch vụ bên thứ ba">
        <List>
          <li>
            <strong>Hostinger</strong> — máy chủ chạy trang, cơ sở dữ liệu và hộp thư gửi email thông báo.
          </li>
          {ga && (
            <li>
              <strong>Google Analytics</strong> — thống kê lượt xem và thao tác, chỉ khi bạn đồng ý. Google xử lý dữ liệu
              này theo chính sách của Google.
            </li>
          )}
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

      <Section id="pp-retention" title="5. Lưu trữ bao lâu">
        <p>
          Vị trí: tối đa 1 ngày trên trình duyệt của bạn. Email đăng ký nhận tin: cho tới khi bạn hủy; sau khi hủy, chúng
          tôi chỉ giữ email và thời điểm hủy để không gửi lại. Thống kê sử dụng và báo sai thông tin:{' '}
          <Todo>[thời hạn — team vận hành đề xuất, pháp chế duyệt]</Todo>.
        </p>
      </Section>

      <Section id="pp-rights" title="6. Quyền của bạn">
        <p>
          Bạn có thể tắt quyền vị trí trong trình duyệt bất cứ lúc nào, hoặc xóa dữ liệu trang web để xóa vị trí, quán đã
          lưu và mã thống kê. Để ngừng nhận email, bấm link hủy trong email bất kỳ. Để yêu cầu xem, sửa hoặc xóa
          dữ liệu khác, liên hệ <a href={`mailto:${CONTACT}`} className="font-semibold text-thanhlong underline">{CONTACT}</a>.
        </p>
        <p>
          <Todo>[Pháp chế bổ sung căn cứ Nghị định 13/2023/NĐ-CP và thời hạn phản hồi yêu cầu.]</Todo>
        </p>
      </Section>

      <Section id="pp-changes" title="7. Thay đổi chính sách">
        <p>
          Khi thêm tính năng xử lý dữ liệu mới (ví dụ tài khoản người dùng hoặc tìm kiếm bằng câu tự nhiên), chúng tôi cập
          nhật trang này trước khi tính năng ra mắt.
        </p>
      </Section>

      <p className="text-[13px] text-muted">Cập nhật lần cuối: [ngày ban hành].</p>
    </article>
  );
}
