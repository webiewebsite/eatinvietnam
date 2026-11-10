/**
 * Reference rows every database needs (staging, production, CI): roles, the legacy
 * districts people search by, and dish/vibe tags mirrored from content/. Idempotent:
 * inserts what is missing and refreshes labels/order from content; never deletes.
 * Run by the boot hook on every start with a database (src/db/boot.ts).
 */
import { sql } from 'drizzle-orm';
import type { getDb } from '@/db/client';
import { areas, roles, tags } from '@/db/schema';
import { DISHES } from '@/lib/taxonomy';
import vibes from '@content/vibes.json';

type Db = ReturnType<typeof getDb>;

export const ROLE_ROWS = [
  { slug: 'user' as const, label: 'Người dùng' },
  { slug: 'owner' as const, label: 'Chủ quán' },
  { slug: 'editor' as const, label: 'Biên tập / kiểm duyệt' },
  { slug: 'admin' as const, label: 'Quản trị' },
];

// Legacy districts (how people search). New wards are added by editors in the admin.
export const LEGACY_DISTRICTS = [
  { slug: 'quan-1', name: 'Quận 1', shortName: 'Q1', isLive: true },
  { slug: 'quan-3', name: 'Quận 3', shortName: 'Q3', isLive: true },
  { slug: 'quan-4', name: 'Quận 4', shortName: 'Q4', isLive: true },
  { slug: 'quan-2', name: 'Quận 2', shortName: 'Q2', isLive: false },
  { slug: 'binh-thanh', name: 'Bình Thạnh', shortName: 'BT', isLive: false },
];

export const VIBES = vibes.vibes.map((v) => ({ slug: v.slug, label: v.label }));

export async function ensureReferenceData(db: Db): Promise<void> {
  await db
    .insert(roles)
    .values(ROLE_ROWS)
    .onDuplicateKeyUpdate({ set: { label: sql`VALUES(label)` } });
  await db
    .insert(areas)
    .values(LEGACY_DISTRICTS.map((a) => ({ ...a, kind: 'legacy_district' as const })))
    // is_live is managed per launch wave; keep whatever the database says.
    .onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)`, shortName: sql`VALUES(short_name)` } });
  await db
    .insert(tags)
    .values([
      ...DISHES.map((d, i) => ({ slug: d.slug, label: d.label, kind: 'dish' as const, groupSlug: d.group, sortOrder: i })),
      ...VIBES.map((v, i) => ({ slug: v.slug, label: v.label, kind: 'vibe' as const, sortOrder: i })),
    ])
    .onDuplicateKeyUpdate({
      set: { label: sql`VALUES(label)`, groupSlug: sql`VALUES(group_slug)`, sortOrder: sql`VALUES(sort_order)` },
    });
}
