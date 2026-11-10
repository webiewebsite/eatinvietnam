/**
 * Admin sessions (#8, decision #7). Server-side rows in `sessions` (no Redis on Hostinger):
 * the cookie holds a random token, the table its SHA-256. 12 h absolute lifetime.
 * A session is usable for admin work only once `two_factor_passed` is true; that is set
 * at login when 2FA is neither enabled for the user nor required (REQUIRE_ADMIN_2FA=0).
 */
import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getDb } from '@/db/client';
import { areas, roles, sessions, userAreas, userRoles, users } from '@/db/schema';
import { hashToken, newToken } from './crypto';

export const SESSION_COOKIE = 'eiv_admin';
const SESSION_HOURS = 12;

/** Roles that can open the admin (stored roles; "user"/"owner" never can). */
export const STAFF_ROLES = ['editor', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** 2FA is required unless REQUIRE_ADMIN_2FA=0 (staging, ops decision 09/11). */
export const twoFactorRequired = () => process.env.REQUIRE_ADMIN_2FA !== '0';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: StaffRole;
  /** Area ids the user may edit; admins are unscoped (empty list, isAdmin = true). */
  areaIds: number[];
  areaSlugs: string[];
  isAdmin: boolean;
  totpEnabled: boolean;
}

export interface AdminSession {
  sessionId: string;
  twoFactorPassed: boolean;
  user: AdminUser;
}

export async function loadAdminUser(userId: number): Promise<AdminUser | null> {
  const db = getDb();
  const [u] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, status: users.status, totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u || u.status !== 'active') return null;
  const roleRows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  const slugs = roleRows.map((r) => r.slug);
  const role: StaffRole | null = slugs.includes('admin') ? 'admin' : slugs.includes('editor') ? 'editor' : null;
  if (!role) return null;
  const areaRows = await db
    .select({ id: areas.id, slug: areas.slug })
    .from(userAreas)
    .innerJoin(areas, eq(areas.id, userAreas.areaId))
    .where(eq(userAreas.userId, userId));
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role,
    areaIds: areaRows.map((a) => a.id),
    areaSlugs: areaRows.map((a) => a.slug),
    isAdmin: role === 'admin',
    totpEnabled: !!u.totpEnabledAt,
  };
}

/** Creates a session row and sets the cookie. Also prunes expired sessions (cheap, indexed). */
export async function startSession(userId: number, twoFactorPassed: boolean): Promise<void> {
  const db = getDb();
  const token = newToken();
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    twoFactorPassed,
    expiresAt: new Date(now.getTime() + SESSION_HOURS * 3600_000),
  });
  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
}

/** Current session from the cookie, or null. Does not check 2FA: callers decide. Cached per request. */
export const readSession = cache(async (): Promise<AdminSession | null> => {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const sessionId = hashToken(token);
  const [s] = await getDb()
    .select({ userId: sessions.userId, twoFactorPassed: sessions.twoFactorPassed })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!s) return null;
  const user = await loadAdminUser(s.userId);
  return user ? { sessionId, twoFactorPassed: s.twoFactorPassed, user } : null;
});

export async function markTwoFactorPassed(sessionId: string): Promise<void> {
  await getDb().update(sessions).set({ twoFactorPassed: true }).where(eq(sessions.id, sessionId));
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && process.env.DATABASE_URL) await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Logs a user out everywhere (disabled account, password reset, 2FA reset). */
export async function endAllSessions(userIds: number[]): Promise<void> {
  if (userIds.length) await getDb().delete(sessions).where(inArray(sessions.userId, userIds));
}
