/**
 * Admin accounts (#8, decision #7): one account per person, roles editor/admin, area scope,
 * TOTP 2FA, one-time invite/reset links, no shared account. Server-only.
 *
 * First admins: there is no account yet, so the hPanel holder sets
 *   ADMIN_BOOTSTRAP_EMAILS = comma-separated emails allowed to self-register as admin
 *   ADMIN_SETUP_CODE       = a long random code given to those people in person
 * Each listed email can use /admin/thiet-lap once (until it has a password). Everyone else
 * is invited from /admin/nguoi-dung by an admin.
 */
import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { areas, roles, sessions, userAreas, userRoles, userTokens, users } from '@/db/schema';
import { sendMail } from '@/lib/mail';
import { siteUrl } from '@/lib/seo';
import { audit } from './audit';
import {
  burnPasswordCheck,
  decryptSecret,
  encryptSecret,
  hashPassword,
  hashToken,
  newToken,
  newTotpSecret,
  otpauthUrl,
  safeEqual,
  secretKeyConfigured,
  verifyPassword,
  verifyTotp,
} from './crypto';
import { fail } from './guard';
import type { StaffRole } from './session';

const INVITE_DAYS = 7;
const RESET_HOURS = 24;

const bootstrapEmails = () =>
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const setupAvailable = () => (process.env.ADMIN_SETUP_CODE ?? '').length >= 12 && bootstrapEmails().length > 0;

async function roleId(slug: StaffRole): Promise<number> {
  const [r] = await getDb().select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).limit(1);
  return r?.id ?? fail(500, 'roles_missing', 'Thiếu dữ liệu role, hãy khởi động lại server.');
}

async function setRole(userId: number, role: StaffRole, grantedBy: number | null) {
  const db = getDb();
  const ids = await db.select({ id: roles.id }).from(roles).where(inArray(roles.slug, ['editor', 'admin']));
  await db.delete(userRoles).where(and(eq(userRoles.userId, userId), inArray(userRoles.roleId, ids.map((r) => r.id))));
  await db.insert(userRoles).values({ userId, roleId: await roleId(role), grantedBy });
}

async function setAreas(userId: number, slugs: string[], grantedBy: number | null) {
  const db = getDb();
  const rows = slugs.length ? await db.select({ id: areas.id, slug: areas.slug }).from(areas).where(inArray(areas.slug, slugs)) : [];
  if (rows.length !== new Set(slugs).size) fail(400, 'invalid_area', 'Có khu vực không tồn tại.');
  await db.delete(userAreas).where(eq(userAreas.userId, userId));
  if (rows.length) await db.insert(userAreas).values(rows.map((a) => ({ userId, areaId: a.id, grantedBy })));
}

async function issueToken(userId: number, purpose: 'invite' | 'reset', createdBy: number | null): Promise<string> {
  const db = getDb();
  const token = newToken();
  const ms = purpose === 'invite' ? INVITE_DAYS * 86_400_000 : RESET_HOURS * 3_600_000;
  // Only the newest link works.
  await db.update(userTokens).set({ usedAt: new Date() }).where(and(eq(userTokens.userId, userId), isNull(userTokens.usedAt)));
  await db.insert(userTokens).values({ userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ms), createdBy });
  return `${siteUrl()}/admin/kich-hoat?token=${token}`;
}

// ── Login ───────────────────────────────────────────────────────────────────

export async function checkLogin(email: string, password: string): Promise<{ id: number; totpEnabled: boolean }> {
  const db = getDb();
  const [u] = await db
    .select({ id: users.id, hash: users.passwordHash, status: users.status, totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!u?.hash) {
    await burnPasswordCheck(password);
    return fail(401, 'bad_credentials', 'Email hoặc mật khẩu không đúng.');
  }
  const ok = await verifyPassword(password, u.hash);
  if (!ok) {
    await audit(db, { userId: u.id, action: 'login_failed', entity: 'user', entityId: u.id });
    fail(401, 'bad_credentials', 'Email hoặc mật khẩu không đúng.');
  }
  if (u.status !== 'active') fail(403, 'disabled', 'Tài khoản đã bị khóa. Liên hệ quản trị viên.');
  const roleRows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, u.id));
  if (!roleRows.some((r) => r.slug === 'admin' || r.slug === 'editor')) fail(403, 'no_role', 'Tài khoản chưa được cấp quyền vào admin.');
  await audit(db, { userId: u.id, action: 'login', entity: 'user', entityId: u.id });
  return { id: u.id, totpEnabled: !!u.totpEnabledAt };
}

/** First admins (see file comment). Returns the new user id. */
export async function bootstrapAdmin(input: { email: string; displayName: string; password: string; code: string }): Promise<number> {
  if (!setupAvailable()) fail(404, 'setup_off', 'Thiết lập lần đầu chưa được bật trên máy chủ.');
  if (!safeEqual(input.code, process.env.ADMIN_SETUP_CODE ?? '')) fail(401, 'bad_code', 'Mã thiết lập không đúng.');
  if (!bootstrapEmails().includes(input.email)) fail(403, 'not_listed', 'Email này không nằm trong danh sách quản trị viên đầu tiên.');
  const db = getDb();
  const [existing] = await db.select({ id: users.id, hash: users.passwordHash }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing?.hash) fail(409, 'already_set', 'Tài khoản này đã được thiết lập. Hãy đăng nhập.');
  const passwordHash = await hashPassword(input.password);
  let id = existing?.id;
  if (id) {
    await db.update(users).set({ displayName: input.displayName, passwordHash, status: 'active' }).where(eq(users.id, id));
  } else {
    const [res] = await db.insert(users).values({ email: input.email, displayName: input.displayName, passwordHash });
    id = Number(res.insertId);
  }
  await setRole(id, 'admin', null);
  await audit(db, { userId: id, action: 'setup', entity: 'user', entityId: id });
  return id;
}

/** Invite / reset link → sets the password. Returns the user id. */
export async function activate(input: { token: string; displayName: string; password: string }): Promise<number> {
  const db = getDb();
  const [t] = await db
    .select({ id: userTokens.id, userId: userTokens.userId, purpose: userTokens.purpose })
    .from(userTokens)
    .where(and(eq(userTokens.tokenHash, hashToken(input.token)), isNull(userTokens.usedAt), gt(userTokens.expiresAt, new Date())))
    .limit(1);
  if (!t) return fail(400, 'bad_token', 'Link đã hết hạn hoặc đã dùng. Nhờ quản trị viên gửi link mới.');
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, t.userId)).limit(1);
  if (u?.status !== 'active') fail(403, 'disabled', 'Tài khoản đã bị khóa. Liên hệ quản trị viên.');
  await db
    .update(users)
    .set({ displayName: input.displayName, passwordHash: await hashPassword(input.password) })
    .where(eq(users.id, t.userId));
  await db.update(userTokens).set({ usedAt: new Date() }).where(eq(userTokens.id, t.id));
  // A reset logs the person out everywhere else.
  await db.delete(sessions).where(eq(sessions.userId, t.userId));
  await audit(db, { userId: t.userId, action: 'activate', entity: 'user', entityId: t.userId, diff: { purpose: t.purpose } });
  return t.userId;
}

export async function tokenInfo(token: string): Promise<{ email: string; displayName: string; purpose: string } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [r] = await getDb()
    .select({ email: users.email, displayName: users.displayName, purpose: userTokens.purpose })
    .from(userTokens)
    .innerJoin(users, eq(users.id, userTokens.userId))
    .where(and(eq(userTokens.tokenHash, hashToken(token)), isNull(userTokens.usedAt), gt(userTokens.expiresAt, new Date())))
    .limit(1);
  return r ?? null;
}

export async function changePassword(userId: number, current: string, next: string): Promise<void> {
  const db = getDb();
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!(await verifyPassword(current, u?.hash))) fail(400, 'bad_password', 'Mật khẩu hiện tại không đúng.');
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  await audit(db, { userId, action: 'password', entity: 'user', entityId: userId });
}

// ── 2FA ─────────────────────────────────────────────────────────────────────

/** Starts (or restarts) TOTP enrolment: stores an encrypted pending secret, returns it for the app. */
export async function startTotp(userId: number, email: string): Promise<{ secret: string; uri: string }> {
  if (!secretKeyConfigured()) fail(503, 'no_secret_key', 'Máy chủ chưa có ADMIN_SECRET_KEY nên chưa bật được 2FA.');
  const db = getDb();
  const [u] = await db.select({ enabled: users.totpEnabledAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.enabled) fail(409, 'already_enabled', '2FA đã bật cho tài khoản này.');
  const secret = newTotpSecret();
  await db.update(users).set({ totpSecretEnc: encryptSecret(secret) }).where(eq(users.id, userId));
  return { secret, uri: otpauthUrl(secret, email) };
}

/** Verifies a code; the first valid code after startTotp enables 2FA. */
export async function checkTotp(userId: number, code: string): Promise<{ enabledNow: boolean }> {
  const db = getDb();
  const [u] = await db.select({ enc: users.totpSecretEnc, enabled: users.totpEnabledAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.enc) return fail(400, 'no_totp', 'Chưa thiết lập ứng dụng xác thực.');
  let secret: string;
  try {
    secret = decryptSecret(u.enc);
  } catch {
    return fail(500, 'secret_unreadable', 'Không đọc được khóa 2FA (ADMIN_SECRET_KEY đã đổi?). Nhờ quản trị viên đặt lại 2FA.');
  }
  if (!verifyTotp(secret, code)) fail(400, 'bad_code', 'Mã xác thực không đúng hoặc đã hết hạn.');
  if (!u.enabled) {
    await db.update(users).set({ totpEnabledAt: new Date() }).where(eq(users.id, userId));
    await audit(db, { userId, action: 'two_factor', entity: 'user', entityId: userId, diff: { enabled: true } });
    return { enabledNow: true };
  }
  return { enabledNow: false };
}

export async function disableTotp(userId: number, by: number): Promise<void> {
  const db = getDb();
  await db.update(users).set({ totpSecretEnc: null, totpEnabledAt: null }).where(eq(users.id, userId));
  await audit(db, { userId: by, action: 'two_factor', entity: 'user', entityId: userId, diff: { enabled: false } });
}

// ── User management (admins) ────────────────────────────────────────────────

export interface UserRow {
  id: number;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
  role: StaffRole | null;
  areas: string[];
  totpEnabled: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = getDb();
  const [rows, roleRows, areaRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        status: users.status,
        totpEnabledAt: users.totpEnabledAt,
        passwordHash: users.passwordHash,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(asc(users.displayName)),
    db.select({ userId: userRoles.userId, slug: roles.slug }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)),
    db.select({ userId: userAreas.userId, slug: areas.slug }).from(userAreas).innerJoin(areas, eq(areas.id, userAreas.areaId)),
  ]);
  return rows.flatMap((u) => {
    const slugs = roleRows.filter((r) => r.userId === u.id).map((r) => r.slug);
    const role: StaffRole | null = slugs.includes('admin') ? 'admin' : slugs.includes('editor') ? 'editor' : null;
    if (!role) return []; // public users (phase 2) are not managed here
    return [
      {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        role,
        areas: areaRows.filter((a) => a.userId === u.id).map((a) => a.slug),
        totpEnabled: !!u.totpEnabledAt,
        hasPassword: !!u.passwordHash,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      },
    ];
  });
}

async function inviteMail(to: string, link: string, purpose: 'invite' | 'reset', by: string) {
  return sendMail({
    to,
    subject: purpose === 'invite' ? 'EatInVietnam: tài khoản admin của bạn' : 'EatInVietnam: đặt lại mật khẩu admin',
    text: [
      purpose === 'invite'
        ? `${by} đã tạo tài khoản admin EatInVietnam cho bạn.`
        : `${by} đã tạo link đặt lại mật khẩu admin EatInVietnam cho bạn.`,
      '',
      `Mở link sau để đặt mật khẩu (dùng được một lần, hết hạn sau ${purpose === 'invite' ? `${INVITE_DAYS} ngày` : `${RESET_HOURS} giờ`}):`,
      link,
      '',
      'Nếu bạn không chờ email này, hãy bỏ qua nó.',
    ].join('\n'),
  });
}

export async function inviteUser(
  by: { id: number; displayName: string },
  input: { email: string; displayName: string; role: StaffRole; areas: string[] },
): Promise<{ id: number; link: string; mailed: boolean }> {
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) fail(409, 'email_taken', 'Email này đã có tài khoản.');
  const [res] = await db.insert(users).values({ email: input.email, displayName: input.displayName });
  const id = Number(res.insertId);
  await setRole(id, input.role, by.id);
  await setAreas(id, input.areas, by.id);
  const link = await issueToken(id, 'invite', by.id);
  await audit(db, { userId: by.id, action: 'invite', entity: 'user', entityId: id, diff: { email: input.email, role: input.role, areas: input.areas } });
  const mailed = await inviteMail(input.email, link, 'invite', by.displayName);
  return { id, link, mailed };
}

export async function resetLink(by: { id: number; displayName: string }, userId: number): Promise<{ link: string; mailed: boolean }> {
  const db = getDb();
  const [u] = await db.select({ email: users.email, hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return fail(404, 'not_found', 'Không tìm thấy người dùng.');
  const purpose = u.hash ? 'reset' : 'invite';
  const link = await issueToken(userId, purpose, by.id);
  await audit(db, { userId: by.id, action: 'reset_link', entity: 'user', entityId: userId });
  return { link, mailed: await inviteMail(u.email, link, purpose, by.displayName) };
}

export async function updateUser(
  by: { id: number },
  userId: number,
  patch: { displayName?: string; role?: StaffRole; areas?: string[]; status?: 'active' | 'disabled'; resetTwoFactor?: true },
): Promise<void> {
  const db = getDb();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return fail(404, 'not_found', 'Không tìm thấy người dùng.');
  // Nobody can lock themselves out.
  if (userId === by.id && (patch.status === 'disabled' || patch.role === 'editor')) {
    fail(400, 'self_lockout', 'Không tự khóa hoặc tự hạ quyền tài khoản của mình được.');
  }
  if (patch.displayName || patch.status) {
    await db
      .update(users)
      .set({ ...(patch.displayName ? { displayName: patch.displayName } : {}), ...(patch.status ? { status: patch.status } : {}) })
      .where(eq(users.id, userId));
  }
  if (patch.role) await setRole(userId, patch.role, by.id);
  if (patch.areas) await setAreas(userId, patch.areas, by.id);
  if (patch.resetTwoFactor) await db.update(users).set({ totpSecretEnc: null, totpEnabledAt: null }).where(eq(users.id, userId));
  // Disabling (decision #7: same day as leaving) or changing access ends every open session.
  if (userId !== by.id && (patch.status === 'disabled' || patch.role || patch.areas || patch.resetTwoFactor)) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
  await audit(db, { userId: by.id, action: 'update', entity: 'user', entityId: userId, diff: patch });
}
