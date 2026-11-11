import { viDateTime } from '@/lib/admin/time';
import { Card } from './ui';

const ACTION: Record<string, string> = {
  create: 'tạo quán',
  update: 'sửa',
  status: 'đổi trạng thái',
  verify: 'xác minh',
  import: 'nhập từ file',
  photo_add: 'thêm ảnh',
  photo_update: 'sửa ảnh',
  photo_delete: 'xóa ảnh',
};

const FIELD: Record<string, string> = {
  name: 'tên',
  slug: 'slug',
  venueType: 'loại quán',
  address: 'địa chỉ',
  lat: 'vĩ độ',
  lng: 'kinh độ',
  district: 'quận',
  ward: 'phường',
  priceMin: 'giá thấp',
  priceMax: 'giá cao',
  highlight: 'điểm nổi bật',
  tip: 'mẹo',
  busyHint: 'giờ đông',
  phone: 'điện thoại',
  grabUrl: 'GrabFood',
  shopeeUrl: 'ShopeeFood',
  editorPick: 'biên tập chọn',
  ratingAvg: 'điểm',
  ratingCount: 'lượt',
  features: 'đặc điểm',
  amenities: 'tiện ích',
  dishes: 'món',
  primaryDish: 'món chính',
  vibes: 'tag',
  hours: 'giờ mở',
  menu: 'thực đơn',
  source: 'nguồn',
  status: 'trạng thái',
  method: 'cách xác minh',
};

function summary(action: string, diff: unknown): string {
  if (!diff || typeof diff !== 'object') return '';
  const d = diff as Record<string, unknown>;
  if (action === 'status' || action === 'verify') {
    const s = d.status as [string, string] | undefined;
    return s ? `${s[0]} → ${s[1]}${d.method ? ` (${String(d.method)})` : ''}` : '';
  }
  if (action.startsWith('photo')) return typeof d.alt === 'string' ? `"${d.alt}"` : '';
  if (action === 'import') return typeof d.note === 'string' ? d.note : '';
  return Object.keys(d)
    .map((k) => FIELD[k] ?? k)
    .join(', ');
}

/** Who changed what (decision #7), newest first. */
export function History({ entries }: { entries: { id: number; action: string; diff: unknown; createdAt: string; userName: string | null }[] }) {
  return (
    <Card title="Lịch sử" id="lich-su">
      {entries.length === 0 ? (
        <p className="text-[14px] text-muted">Chưa có thay đổi nào được ghi.</p>
      ) : (
        <ol className="flex flex-col gap-2 text-[13px]">
          {entries.map((e) => (
            <li key={e.id} className="border-l-2 border-line pl-2">
              <span className="font-semibold">{e.userName ?? 'Hệ thống'}</span> {ACTION[e.action] ?? e.action}
              {summary(e.action, e.diff) && <span className="whitespace-pre-line text-muted"> · {summary(e.action, e.diff)}</span>}
              <span className="block text-[12px] text-muted">{viDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
