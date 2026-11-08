/**
 * Schema for MariaDB (Hostinger) and MySQL 8 (issue #4) — ops decisions 09/11/2026:
 * flexible areas (new wards + legacy districts), spatial POINT, statuses with a
 * re-verification deadline, per-person accounts with roles + 2FA, audit log.
 * Never edit a merged migration: change this file and run `npm run db:generate`.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  time,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { point } from './point';

const id = () => bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey();
const ref = (name: string) => bigint(name, { mode: 'number', unsigned: true });
const createdAt = () => datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () =>
  datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date());

export const RESTAURANT_STATUS = ['draft', 'pending', 'verified', 'temp_closed', 'closed'] as const;
export const RESTAURANT_SOURCE = ['editor', 'osm', 'owner', 'ugc'] as const;
export const AREA_KIND = ['ward', 'legacy_district', 'neighborhood'] as const;
export const TAG_KIND = ['dish', 'vibe', 'feature'] as const;
/** Stored roles. "guest" = no session; "editor" covers editor/moderator. */
export const ROLE = ['user', 'owner', 'editor', 'admin'] as const;

// ── People & access ─────────────────────────────────────────────────────────

export const users = mysqlTable(
  'users',
  {
    id: id(),
    email: varchar('email', { length: 254 }).notNull(),
    displayName: varchar('display_name', { length: 80 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    /** TOTP secret, encrypted at rest by the app. Required for admin/editor (decision #7). */
    totpSecretEnc: varchar('totp_secret_enc', { length: 255 }),
    totpEnabledAt: datetime('totp_enabled_at'),
    status: mysqlEnum('status', ['active', 'disabled']).notNull().default('active'),
    lastLoginAt: datetime('last_login_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

export const roles = mysqlTable(
  'roles',
  {
    id: tinyint('id', { unsigned: true }).autoincrement().primaryKey(),
    slug: mysqlEnum('slug', ROLE).notNull(),
    label: varchar('label', { length: 40 }).notNull(),
  },
  (t) => [uniqueIndex('roles_slug_uq').on(t.slug)],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: ref('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: tinyint('role_id', { unsigned: true })
      .notNull()
      .references(() => roles.id),
    grantedBy: ref('granted_by').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

/** Server-side sessions (no Redis on Hostinger). `id` = SHA-256 of the cookie token. */
export const sessions = mysqlTable(
  'sessions',
  {
    id: char('id', { length: 64 }).primaryKey(),
    userId: ref('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** False until the TOTP step passes; admin routes require true. */
    twoFactorPassed: boolean('two_factor_passed').notNull().default(false),
    expiresAt: datetime('expires_at').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

export const ownerClaims = mysqlTable(
  'owner_claims',
  {
    id: id(),
    userId: ref('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
    evidence: text('evidence'),
    reviewedBy: ref('reviewed_by').references(() => users.id),
    reviewedAt: datetime('reviewed_at'),
    createdAt: createdAt(),
  },
  (t) => [index('owner_claims_restaurant_idx').on(t.restaurantId, t.status)],
);

/** Who changed what (decision #7: no shared admin account, every edit traceable). */
export const auditLog = mysqlTable(
  'audit_log',
  {
    id: id(),
    userId: ref('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 40 }).notNull(), // create | update | verify | publish | delete | login …
    entity: varchar('entity', { length: 40 }).notNull(), // restaurant | photo | user …
    entityId: ref('entity_id'),
    diff: json('diff'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_entity_idx').on(t.entity, t.entityId), index('audit_user_idx').on(t.userId, t.createdAt)],
);

// ── Places ──────────────────────────────────────────────────────────────────

/**
 * Flexible areas (decision #5). Since 01/07/2025 HCMC has no district level, but
 * people and search still say "Quận 1": a restaurant links to its new ward AND its
 * legacy district; neighbourhoods ("Phố Tây") can be added later.
 */
export const areas = mysqlTable(
  'areas',
  {
    id: id(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    shortName: varchar('short_name', { length: 20 }),
    kind: mysqlEnum('kind', AREA_KIND).notNull(),
    parentId: ref('parent_id'),
    city: varchar('city', { length: 40 }).notNull().default('tp-hcm'),
    /** Launch wave; areas with no live wave are hidden from navigation. */
    isLive: boolean('is_live').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('areas_slug_uq').on(t.slug), index('areas_kind_idx').on(t.kind, t.isLive)],
);

export const restaurants = mysqlTable(
  'restaurants',
  {
    id: id(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    status: mysqlEnum('status', RESTAURANT_STATUS).notNull().default('draft'),
    source: mysqlEnum('source', RESTAURANT_SOURCE).notNull().default('editor'),
    venueType: varchar('venue_type', { length: 60 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    /** x = lng, y = lat; SPATIAL INDEX in a custom migration. See db/point.ts (MariaDB on Hostinger). */
    location: point('location').notNull(),
    priceMin: int('price_min', { unsigned: true }),
    priceMax: int('price_max', { unsigned: true }),
    priceUpdatedAt: date('price_updated_at', { mode: 'string' }),
    /** Editorial rating until user reviews ship (phase 2). */
    ratingAvg: decimal('rating_avg', { precision: 2, scale: 1 }),
    ratingCount: int('rating_count', { unsigned: true }).notNull().default(0),
    editorPick: boolean('editor_pick').notNull().default(false),
    highlight: varchar('highlight', { length: 160 }).notNull().default(''),
    tip: varchar('tip', { length: 255 }),
    busyHint: varchar('busy_hint', { length: 60 }),
    phone: varchar('phone', { length: 20 }),
    grabUrl: varchar('grab_url', { length: 500 }),
    shopeeUrl: varchar('shopee_url', { length: 500 }),
    /** Only Google's place_id is stored, never Google content (doc, item 4). */
    googlePlaceId: varchar('google_place_id', { length: 255 }),
    /** ' ' + toSearchText(name, dishes, area, …) + ' ' — whole-word LIKE matching. */
    searchText: text('search_text').notNull(),
    verifiedAt: datetime('verified_at'),
    /** How the editor verified it (ops, 09/11): ate there, own photos, or phoned the restaurant. */
    verificationMethod: mysqlEnum('verification_method', ['visited', 'photo', 'phone']),
    verifiedBy: ref('verified_by').references(() => users.id, { onDelete: 'set null' }),
    /** verified_at + REVERIFY_DAYS; overdue → "chưa cập nhật" (decision #6). */
    reverifyDueAt: datetime('reverify_due_at'),
    createdBy: ref('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: ref('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('restaurants_slug_uq').on(t.slug),
    index('restaurants_status_idx').on(t.status),
    index('restaurants_reverify_idx').on(t.status, t.reverifyDueAt),
    // SPATIAL INDEX on `location` is created in a custom migration (drizzle-kit has no spatial index DSL).
  ],
);

export const restaurantAreas = mysqlTable(
  'restaurant_areas',
  {
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    areaId: ref('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.restaurantId, t.areaId] }), index('restaurant_areas_area_idx').on(t.areaId)],
);

/** Editor scope (ops, 09/11 "Khu vực phụ trách"): editors may only edit restaurants in these areas. Admins are unscoped. */
export const userAreas = mysqlTable(
  'user_areas',
  {
    userId: ref('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    areaId: ref('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
    grantedBy: ref('granted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.areaId] }), index('user_areas_area_idx').on(t.areaId)],
);

/** Dishes, vibes ("Hẹn hò"), features ("Có máy lạnh"). Dish/vibe slugs mirror content/taxonomy.json. */
export const tags = mysqlTable(
  'tags',
  {
    id: smallint('id', { unsigned: true }).autoincrement().primaryKey(),
    slug: varchar('slug', { length: 60 }).notNull(),
    label: varchar('label', { length: 60 }).notNull(),
    kind: mysqlEnum('kind', TAG_KIND).notNull(),
    groupSlug: varchar('group_slug', { length: 40 }),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('tags_kind_slug_uq').on(t.kind, t.slug)],
);

export const restaurantTags = mysqlTable(
  'restaurant_tags',
  {
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    tagId: smallint('tag_id', { unsigned: true })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    /** The restaurant's main dish (breadcrumb, map pin label). */
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.restaurantId, t.tagId] }), index('restaurant_tags_tag_idx').on(t.tagId)],
);

/** One row per opening window; `closes_at <= opens_at` means it runs past midnight. */
export const openingHours = mysqlTable(
  'opening_hours',
  {
    id: id(),
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    day: tinyint('day', { unsigned: true }).notNull(), // 0 = Sunday … 6 = Saturday
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
  },
  (t) => [index('opening_hours_restaurant_idx').on(t.restaurantId, t.day)],
);

export const photos = mysqlTable(
  'photos',
  {
    id: id(),
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    /** R2 key of the largest size: restaurants/<id>/<uuid>-1440.webp */
    r2Key: varchar('r2_key', { length: 255 }).notNull(),
    width: smallint('width', { unsigned: true }).notNull(),
    height: smallint('height', { unsigned: true }).notNull(),
    alt: varchar('alt', { length: 200 }).notNull(),
    credit: varchar('credit', { length: 200 }),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdBy: ref('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('photos_restaurant_idx').on(t.restaurantId, t.sortOrder)],
);

export const menuItems = mysqlTable(
  'menu_items',
  {
    id: id(),
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    groupName: varchar('group_name', { length: 60 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 255 }),
    price: int('price', { unsigned: true }).notNull(),
    /** Editor's pick ("Đáng thử"), replaces review-based counts until phase 2. */
    mustTry: boolean('must_try').notNull().default(false),
    photoId: ref('photo_id').references(() => photos.id, { onDelete: 'set null' }),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [index('menu_items_restaurant_idx').on(t.restaurantId, t.sortOrder)],
);

// ── Signals ─────────────────────────────────────────────────────────────────

/** Anonymous usage events — never IP or email. */
export const events = mysqlTable(
  'events',
  {
    id: id(),
    name: varchar('name', { length: 40 }).notNull(),
    anonId: char('anon_id', { length: 36 }).notNull(),
    path: varchar('path', { length: 200 }).notNull(),
    props: json('props'),
    createdAt: createdAt(),
  },
  (t) => [index('events_name_time_idx').on(t.name, t.createdAt)],
);

export const reports = mysqlTable(
  'reports',
  {
    id: id(),
    restaurantId: ref('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    reason: mysqlEnum('reason', ['price', 'hours', 'closed', 'address', 'other']).notNull(),
    note: varchar('note', { length: 500 }),
    status: mysqlEnum('status', ['open', 'resolved', 'dismissed']).notNull().default('open'),
    resolvedBy: ref('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('reports_status_idx').on(t.status, t.createdAt)],
);

/** Haiku parse results per normalised query; cleared when the taxonomy version changes. */
export const nlQueryCache = mysqlTable(
  'nl_query_cache',
  {
    id: id(),
    queryNorm: varchar('query_norm', { length: 200 }).notNull(),
    taxonomyVersion: varchar('taxonomy_version', { length: 20 }).notNull(),
    filters: json('filters').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('nl_query_cache_uq').on(t.queryNorm, t.taxonomyVersion)],
);
