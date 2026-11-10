/**
 * Restaurant photos (#8). Upload: the file must decode with sharp (Content-Type and the
 * extension are not trusted) → rotate by EXIF → strip ALL metadata (EXIF can hold GPS)
 * → WebP at 480/960/1440 → R2 key restaurants/<id>/<uuid>-<w>.webp. Delete removes the
 * R2 objects too. Server-only.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { getDb } from '@/db/client';
import { photos, restaurants } from '@/db/schema';
import { R2_WIDTHS, r2KeysFor } from '@/lib/photo-url';
import { audit } from './audit';
import { canEditAreas, fail } from './guard';
import { getAdminRestaurant, revalidateRestaurant } from './restaurants';
import type { AdminUser } from './session';
import { deleteObjects, putObject, r2Configured } from './storage';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'heif', 'avif', 'tiff']);
const MIN_SIDE = 400;

export interface ProcessedImage {
  width: number;
  height: number;
  variants: { width: number; data: Buffer }[];
}

/** Decodes and re-encodes an upload. Throws AdminError for anything that is not a usable photo. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    return fail(400, 'not_an_image', 'File không phải ảnh (hoặc bị hỏng). Dùng JPG, PNG hoặc WebP.');
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) fail(400, 'not_an_image', 'Định dạng ảnh không hỗ trợ. Dùng JPG, PNG hoặc WebP.');
  // Orientation 5–8 swaps width and height once rotated.
  const swap = (meta.orientation ?? 1) >= 5;
  const w = (swap ? meta.height : meta.width) ?? 0;
  const h = (swap ? meta.width : meta.height) ?? 0;
  if (Math.min(w, h) < MIN_SIDE) fail(400, 'too_small', `Ảnh quá nhỏ (cạnh ngắn cần ≥ ${MIN_SIDE} px).`);

  const variants: { width: number; data: Buffer }[] = [];
  for (const target of R2_WIDTHS) {
    // sharp drops metadata unless .withMetadata()/.keepExif() is called; rotate() applies EXIF orientation first.
    const data = await sharp(input, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    variants.push({ width: target, data });
  }
  const largest = await sharp(variants[variants.length - 1]!.data).metadata();
  return { width: largest.width ?? w, height: largest.height ?? h, variants };
}

async function scopedRestaurant(user: AdminUser, restaurantId: number) {
  const r = await getAdminRestaurant(restaurantId);
  if (!r) return fail(404, 'not_found', 'Không tìm thấy quán.');
  if (!canEditAreas(user, r.areaIds)) fail(403, 'out_of_scope', 'Quán này nằm ngoài khu vực bạn phụ trách.');
  return r;
}

const pub = (r: { slug: string; input: { dishes: string[]; district: string } }) => ({
  slug: r.slug,
  dishes: r.input.dishes,
  district: r.input.district,
});

export async function uploadPhoto(user: AdminUser, restaurantId: number, file: File, alt: string): Promise<{ id: number }> {
  if (!r2Configured()) fail(503, 'r2_missing', 'Chưa cấu hình Cloudflare R2 (R2_* trong hPanel) nên chưa upload ảnh được.');
  if (file.size > MAX_UPLOAD_BYTES) fail(413, 'too_large', 'Ảnh lớn hơn 15 MB.');
  const r = await scopedRestaurant(user, restaurantId);
  const img = await processImage(Buffer.from(await file.arrayBuffer()));

  const base = `restaurants/${restaurantId}/${randomUUID()}`;
  for (const v of img.variants) await putObject(`${base}-${v.width}.webp`, v.data, 'image/webp');
  const largestKey = `${base}-${R2_WIDTHS[R2_WIDTHS.length - 1]}.webp`;

  const db = getDb();
  const [{ next }] = (await db
    .select({ next: sql<number>`COALESCE(MAX(${photos.sortOrder}) + 1, 0)` })
    .from(photos)
    .where(eq(photos.restaurantId, restaurantId))) as [{ next: number }];
  const [res] = await db.insert(photos).values({
    restaurantId,
    r2Key: largestKey,
    kind: 'gallery',
    width: img.width,
    height: img.height,
    alt,
    sortOrder: Number(next),
    createdBy: user.id,
  });
  const id = Number(res.insertId);
  await db.update(restaurants).set({ updatedBy: user.id }).where(eq(restaurants.id, restaurantId));
  await audit(db, { userId: user.id, action: 'photo_add', entity: 'restaurant', entityId: restaurantId, diff: { photoId: id, alt } });
  revalidateRestaurant(pub(r));
  return { id };
}

async function photoRow(photoId: number) {
  const [p] = await getDb()
    .select({ id: photos.id, restaurantId: photos.restaurantId, r2Key: photos.r2Key, sortOrder: photos.sortOrder, alt: photos.alt })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  return p ?? fail(404, 'not_found', 'Không tìm thấy ảnh.');
}

export async function updatePhoto(user: AdminUser, photoId: number, patch: { alt?: string; move?: 'up' | 'down' }): Promise<void> {
  const p = await photoRow(photoId);
  const r = await scopedRestaurant(user, p.restaurantId);
  const db = getDb();
  if (patch.alt) await db.update(photos).set({ alt: patch.alt }).where(eq(photos.id, photoId));
  if (patch.move) {
    // Swap with the neighbour in display order; first photo = cover image on the restaurant page.
    const list = await db
      .select({ id: photos.id, sortOrder: photos.sortOrder })
      .from(photos)
      .where(and(eq(photos.restaurantId, p.restaurantId), eq(photos.kind, 'gallery')))
      .orderBy(asc(photos.sortOrder), asc(photos.id));
    const i = list.findIndex((x) => x.id === photoId);
    const j = patch.move === 'up' ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      const order = list.map((x) => x.id);
      [order[i], order[j]] = [order[j]!, order[i]!];
      await db.transaction(async (tx) => {
        for (const [k, id] of order.entries()) await tx.update(photos).set({ sortOrder: k }).where(eq(photos.id, id));
      });
    }
  }
  await audit(db, { userId: user.id, action: 'photo_update', entity: 'restaurant', entityId: p.restaurantId, diff: { photoId, ...patch } });
  revalidateRestaurant(pub(r));
}

export async function deletePhoto(user: AdminUser, photoId: number): Promise<void> {
  const p = await photoRow(photoId);
  const r = await scopedRestaurant(user, p.restaurantId);
  // Objects first: a failed R2 delete keeps the row, so nothing is orphaned silently.
  if (p.r2Key) {
    if (!r2Configured()) fail(503, 'r2_missing', 'Chưa cấu hình Cloudflare R2 nên chưa xóa được ảnh trên R2.');
    await deleteObjects(r2KeysFor(p.r2Key));
  }
  const db = getDb();
  await db.delete(photos).where(eq(photos.id, photoId)); // menu_items.photo_id → NULL (FK)
  await audit(db, { userId: user.id, action: 'photo_delete', entity: 'restaurant', entityId: p.restaurantId, diff: { photoId, alt: p.alt, r2Key: p.r2Key } });
  revalidateRestaurant(pub(r));
}
