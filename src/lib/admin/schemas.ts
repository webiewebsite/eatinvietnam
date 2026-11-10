/**
 * Admin input schemas, shared by the forms (client) and the API (server). No Node imports.
 * Messages are Vietnamese: they are shown to editors as-is.
 */
import { z } from 'zod';
import { DISHES } from '@/lib/taxonomy';
import vibes from '@content/vibes.json';

const DISH_SLUGS = DISHES.map((d) => d.slug) as [string, ...string[]];
const VIBE_SLUGS = vibes.vibes.map((v) => v.slug) as [string, ...string[]];
export const VIBES_VERSION = vibes.version;
export const VIBE_DEFS = vibes.vibes;

export const VERIFICATION_METHODS = [
  { value: 'visited', label: 'Đến ăn tại quán' },
  { value: 'photo', label: 'Ảnh tự chụp tại quán' },
  { value: 'phone', label: 'Gọi điện cho quán' },
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number]['value'];

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  verified: 'Đã xác minh',
  temp_closed: 'Tạm đóng',
  closed: 'Đóng hẳn',
};

const text = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`);
const optText = (max: number, label: string) =>
  text(max, label)
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ dạng HH:MM');
const price = z
  .number()
  .int('Giá là số nguyên')
  .min(0)
  .max(10_000_000)
  .nullable()
  .optional()
  .transform((v) => v ?? null);
const https = optText(500, 'Link').refine((v) => v == null || /^https:\/\/[^\s]+$/.test(v), 'Link phải bắt đầu bằng https://');
const shortList = (label: string) => z.array(text(40, label).min(1)).max(12, `${label}: tối đa 12 mục`);

export const SlotInput = z
  .object({ day: z.number().int().min(0).max(6), open: HHMM, close: HHMM })
  .refine((s) => s.open !== s.close, 'Giờ mở và giờ đóng không được trùng nhau');

export const MenuItemInput = z.object({
  group: text(60, 'Nhóm món').min(1, 'Thiếu nhóm món'),
  name: text(120, 'Tên món').min(1, 'Thiếu tên món'),
  desc: optText(255, 'Mô tả'),
  price: z.number().int().min(0).max(10_000_000),
  mustTry: z.boolean().default(false),
  photoId: z.number().int().positive().nullable().optional().transform((v) => v ?? null),
});

export const VibeInput = z.object({
  slug: z.enum(VIBE_SLUGS),
  checked: z.array(z.boolean()).length(3),
});

export const RestaurantInput = z
  .object({
    name: text(160, 'Tên quán').min(2, 'Tên quán quá ngắn'),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường không dấu, số và gạch ngang')
      .max(120)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    venueType: text(60, 'Loại quán').min(1, 'Thiếu loại quán'),
    address: text(255, 'Địa chỉ').min(5, 'Thiếu địa chỉ'),
    // Vietnam's bounding box: catches swapped or mistyped coordinates.
    lat: z.number().min(8, 'Vĩ độ ngoài Việt Nam').max(23.5, 'Vĩ độ ngoài Việt Nam'),
    lng: z.number().min(102, 'Kinh độ ngoài Việt Nam').max(110, 'Kinh độ ngoài Việt Nam'),
    district: z.string().regex(/^[a-z0-9-]{1,80}$/, 'Chọn quận'),
    ward: optText(120, 'Phường'),
    priceMin: price,
    priceMax: price,
    highlight: text(160, 'Điểm nổi bật').default(''),
    tip: optText(255, 'Mẹo'),
    busyHint: optText(60, 'Giờ đông'),
    phone: optText(20, 'Số điện thoại').refine((v) => v == null || /^[0-9 +.()-]{6,20}$/.test(v), 'Số điện thoại không hợp lệ'),
    grabUrl: https,
    shopeeUrl: https,
    editorPick: z.boolean().default(false),
    ratingAvg: z.number().min(0).max(5).nullable().optional().transform((v) => (v == null ? null : Math.round(v * 10) / 10)),
    ratingCount: z.number().int().min(0).max(1_000_000).default(0),
    features: shortList('Đặc điểm').default([]),
    amenities: shortList('Tiện ích').default([]),
    dishes: z.array(z.enum(DISH_SLUGS)).max(6, 'Tối đa 6 món').default([]),
    primaryDish: z.enum(DISH_SLUGS).nullable().optional().transform((v) => v ?? null),
    vibes: z.array(VibeInput).max(VIBE_SLUGS.length).default([]),
    hours: z.array(SlotInput).max(28, 'Tối đa 4 khung giờ mỗi ngày').default([]),
    menu: z.array(MenuItemInput).max(150, 'Tối đa 150 món').default([]),
    /** 'osm' when the editor started from an OpenStreetMap suggestion (#30). */
    source: z.enum(['editor', 'osm']).default('editor'),
  })
  .superRefine((r, ctx) => {
    if (r.priceMin != null && r.priceMax != null && r.priceMin > r.priceMax) {
      ctx.addIssue({ code: 'custom', path: ['priceMax'], message: 'Giá cao nhất phải ≥ giá thấp nhất' });
    }
    if (r.primaryDish && !r.dishes.includes(r.primaryDish)) {
      ctx.addIssue({ code: 'custom', path: ['primaryDish'], message: 'Món chính phải nằm trong danh sách món' });
    }
    if (new Set(r.vibes.map((v) => v.slug)).size !== r.vibes.length) {
      ctx.addIssue({ code: 'custom', path: ['vibes'], message: 'Tag lặp lại' });
    }
    for (const d of [0, 1, 2, 3, 4, 5, 6]) {
      if (r.hours.filter((s) => s.day === d).length > 4) {
        ctx.addIssue({ code: 'custom', path: ['hours'], message: 'Tối đa 4 khung giờ mỗi ngày' });
        break;
      }
    }
  });
export type RestaurantInputT = z.infer<typeof RestaurantInput>;

export const StatusInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verify'), method: z.enum(['visited', 'photo', 'phone']) }),
  z.object({ action: z.literal('submit') }),
  z.object({ action: z.literal('draft') }),
  z.object({ action: z.literal('temp_closed') }),
  z.object({ action: z.literal('closed') }),
]);
export type StatusInputT = z.infer<typeof StatusInput>;

/** What a restaurant still lacks before it can be verified (published). Empty = ready. */
export function missingForPublish(r: Pick<RestaurantInputT, 'dishes' | 'hours' | 'venueType' | 'address'>): string[] {
  const missing: string[] = [];
  if (!r.dishes.length) missing.push('ít nhất 1 món');
  if (!r.hours.length) missing.push('giờ mở cửa');
  if (!r.venueType) missing.push('loại quán');
  if (!r.address) missing.push('địa chỉ');
  return missing;
}

// ── Accounts ────────────────────────────────────────────────────────────────

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Email không hợp lệ'));
const password = z.string().min(10, 'Mật khẩu tối thiểu 10 ký tự').max(200);
const displayName = text(80, 'Tên hiển thị').min(2, 'Tên hiển thị quá ngắn');

export const LoginInput = z.object({ email, password: z.string().min(1).max(200) });
export const SetupInput = z.object({ email, displayName, password, code: z.string().min(1).max(200) });
export const ActivateInput = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), displayName, password });
export const PasswordInput = z.object({ current: z.string().min(1).max(200), next: password });
export const TotpInput = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Mã gồm 6 chữ số') });

export const InviteInput = z.object({
  email,
  displayName,
  role: z.enum(['editor', 'admin']),
  areas: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(50).default([]),
});
export const UserPatchInput = z.object({
  displayName: displayName.optional(),
  role: z.enum(['editor', 'admin']).optional(),
  areas: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(50).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  resetTwoFactor: z.literal(true).optional(),
});

/** First Zod message, for a one-line error under the form. */
export function firstIssue(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? i.message : 'Dữ liệu không hợp lệ';
}
