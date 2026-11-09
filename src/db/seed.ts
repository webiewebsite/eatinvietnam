/**
 * Demo seed shared by `npm run db:seed` and the staging boot hook (src/db/boot.ts).
 */
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { DEMO_RESTAURANTS } from '@/data/demo-restaurants';
import type { getDb } from '@/db/client';
import {
  areas,
  menuItems,
  openingHours,
  photos,
  restaurantAreas,
  restaurantTags,
  restaurants,
  roles,
  tags,
} from '@/db/schema';
import { demoSearchText } from '@/lib/data/demo';
import { DISHES } from '@/lib/taxonomy';
import type { Photo, Restaurant } from '@/lib/types';
import { reverifyDueAt } from '@/lib/verification';
import taxonomy from '@content/taxonomy.json';

// Vibe chips confirmed 09/11. "an-khuya" and "duoi-50k" are computed from hours/price, not tagged.
const VIBES = [
  { slug: 'hen-ho', label: 'Hẹn hò' },
  { slug: 'ca-phe-lam-viec', label: 'Cà phê làm việc' },
  { slug: 'di-nhom-ban', label: 'Đi nhóm bạn' },
  { slug: 'healthy', label: 'Healthy' },
];

// Legacy districts (how people search). New wards are added by editors in the admin.
const LEGACY = [
  { slug: 'quan-1', name: 'Quận 1', shortName: 'Q1', isLive: true },
  { slug: 'quan-3', name: 'Quận 3', shortName: 'Q3', isLive: true },
  { slug: 'quan-4', name: 'Quận 4', shortName: 'Q4', isLive: true },
  { slug: 'quan-2', name: 'Quận 2', shortName: 'Q2', isLive: false },
  { slug: 'binh-thanh', name: 'Bình Thạnh', shortName: 'BT', isLive: false },
];

type Db = ReturnType<typeof getDb>;

const photoRow = (restaurantId: number, p: Photo, kind: 'gallery' | 'menu', sortOrder: number) => ({
  restaurantId,
  kind,
  externalUrl: p.src,
  width: p.width,
  height: p.height,
  alt: p.alt,
  credit: p.credit?.name ?? null,
  creditUrl: p.credit?.url ?? null,
  sortOrder,
});

/** Gallery photos, then one `menu` photo per menu item that has one (linked via photo_id). */
async function insertPhotosAndMenu(db: Db, restaurantId: number, r: Restaurant, withMenu: boolean) {
  if (r.photos.length) {
    await db.insert(photos).values(r.photos.map((p, i) => photoRow(restaurantId, p, 'gallery', i)));
  }
  for (const [i, m] of r.menu.entries()) {
    let photoId: number | null = null;
    if (m.photo) {
      const [res] = await db.insert(photos).values(photoRow(restaurantId, m.photo, 'menu', i));
      photoId = Number(res.insertId);
    }
    if (withMenu) {
      await db.insert(menuItems).values({
        restaurantId,
        groupName: m.group,
        name: m.name,
        description: m.desc ?? null,
        price: m.price,
        mustTry: !!m.mustTry,
        photoId,
        sortOrder: i,
      });
    } else if (photoId != null) {
      await db
        .update(menuItems)
        .set({ photoId })
        .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.sortOrder, i), eq(menuItems.name, m.name)));
    }
  }
}

/**
 * Seeds roles, areas, tags and the 14 demo restaurants — ONLY into an empty database.
 * Returns { seeded: false } without touching anything when restaurants already exist.
 */
export async function seedDemo(db: Db): Promise<{ seeded: boolean; existing: number; message: string }> {
  const [{ n }] = (await db.select({ n: count() }).from(restaurants)) as [{ n: number }];
  if (n > 0) {
    return { seeded: false, existing: n, message: `restaurants already has ${n} rows — demo seed skipped.` };
  }

  await db.insert(roles).values([
    { slug: 'user', label: 'Người dùng' },
    { slug: 'owner', label: 'Chủ quán' },
    { slug: 'editor', label: 'Biên tập / kiểm duyệt' },
    { slug: 'admin', label: 'Quản trị' },
  ]);

  await db.insert(areas).values(LEGACY.map((a) => ({ ...a, kind: 'legacy_district' as const })));
  const areaRows = await db.select({ id: areas.id, slug: areas.slug }).from(areas);
  const areaId = new Map(areaRows.map((a) => [a.slug, a.id]));

  await db.insert(tags).values([
    ...DISHES.map((d, i) => ({ slug: d.slug, label: d.label, kind: 'dish' as const, groupSlug: d.group, sortOrder: i })),
    ...VIBES.map((v, i) => ({ slug: v.slug, label: v.label, kind: 'vibe' as const, sortOrder: i })),
  ]);
  const tagRows = await db.select({ id: tags.id, slug: tags.slug, kind: tags.kind }).from(tags);
  const dishTagId = new Map(tagRows.filter((t) => t.kind === 'dish').map((t) => [t.slug, t.id]));

  for (const r of DEMO_RESTAURANTS) {
    const [res] = await db.insert(restaurants).values({
      slug: r.slug,
      name: r.name,
      status: r.status,
      source: 'editor',
      venueType: r.venueType,
      address: r.address,
      location: { lat: r.lat, lng: r.lng },
      priceMin: r.priceMin,
      priceMax: r.priceMax,
      priceUpdatedAt: r.priceUpdatedAt,
      ratingAvg: r.rating.avg.toFixed(1),
      ratingCount: r.rating.count,
      editorPick: r.editorPick,
      highlight: r.highlight,
      features: r.features,
      amenities: r.amenities,
      tip: r.tip ?? null,
      busyHint: r.busyHint ?? null,
      phone: r.phone ?? null,
      grabUrl: r.grabUrl ?? null,
      shopeeUrl: r.shopeeUrl ?? null,
      searchText: demoSearchText(r),
      verifiedAt: new Date(r.verifiedAt),
      reverifyDueAt: reverifyDueAt(r.verifiedAt),
    });
    const restaurantId = Number(res.insertId);

    const district = areaId.get(r.district);
    if (district) await db.insert(restaurantAreas).values({ restaurantId, areaId: district });

    const dishTags = r.dishes.flatMap((d) => {
      const tagId = dishTagId.get(d);
      return tagId ? [{ restaurantId, tagId, isPrimary: d === r.dish }] : [];
    });
    if (dishTags.length) await db.insert(restaurantTags).values(dishTags);

    if (r.hours.length) {
      await db.insert(openingHours).values(
        r.hours.map((h) => ({ restaurantId, day: h.day, opensAt: `${h.open}:00`, closesAt: `${h.close}:00` })),
      );
    }
    await insertPhotosAndMenu(db, restaurantId, r, true);
  }

  return {
    seeded: true,
    existing: 0,
    message: `Seeded ${DEMO_RESTAURANTS.length} demo restaurants, ${LEGACY.length} areas, ${DISHES.length + VIBES.length} tags (taxonomy groups: ${taxonomy.groups.length}).`,
  };
}

/**
 * Staging was seeded on 09/11 before restaurants had features/amenities and before
 * photos could hold demo URLs. When the database still holds ONLY demo restaurants,
 * fill in what is missing; restaurants that already have it are left alone (idempotent).
 * Once any non-demo restaurant exists, this never touches anything.
 */
export async function backfillDemo(db: Db): Promise<{ updated: number; message: string }> {
  const demoBySlug = new Map(DEMO_RESTAURANTS.map((r) => [r.slug, r]));
  const rows = await db
    .select({ id: restaurants.id, slug: restaurants.slug, features: restaurants.features })
    .from(restaurants);
  if (!rows.length || rows.some((r) => !demoBySlug.has(r.slug))) {
    return { updated: 0, message: 'demo backfill skipped (database holds non-demo restaurants).' };
  }

  const ids = rows.map((r) => r.id);
  const withPhotos = new Set(
    (await db.selectDistinct({ rid: photos.restaurantId }).from(photos).where(inArray(photos.restaurantId, ids))).map((p) => p.rid),
  );

  let updated = 0;
  for (const row of rows) {
    const demo = demoBySlug.get(row.slug)!;
    let touched = false;
    if (row.features == null) {
      await db
        .update(restaurants)
        .set({ features: demo.features, amenities: demo.amenities, searchText: demoSearchText(demo) })
        .where(and(eq(restaurants.id, row.id), isNull(restaurants.features)));
      touched = true;
    }
    // Some demo restaurants have no photos at all: those are never "missing" any.
    const demoHasPhotos = demo.photos.length > 0 || demo.menu.some((m) => m.photo);
    if (demoHasPhotos && !withPhotos.has(row.id)) {
      await insertPhotosAndMenu(db, row.id, demo, false);
      touched = true;
    }
    if (touched) updated++;
  }
  return { updated, message: updated ? `demo backfill: ${updated} restaurants updated.` : 'demo backfill: nothing to do.' };
}
