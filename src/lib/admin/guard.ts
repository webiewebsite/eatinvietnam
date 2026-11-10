/**
 * Permission checks for /admin pages and /api/admin routes — always on the server.
 *
 * CSRF: the session cookie is SameSite=Lax, and every mutating admin API call must carry
 * the header `x-eiv-admin: 1`. Browsers cannot add a custom header cross-site without a
 * CORS preflight, which these routes never answer, so a forged form or fetch fails.
 */
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { readSession, twoFactorRequired, type AdminSession, type AdminUser } from './session';

export class AdminError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: number, code: string, message: string): never => {
  throw new AdminError(status, code, message);
};

export function errorResponse(e: unknown): Response {
  if (e instanceof AdminError) return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  console.error('[admin] unexpected error', e);
  return Response.json({ error: { code: 'server_error', message: 'Lỗi máy chủ, thử lại sau.' } }, { status: 500 });
}

/** Wraps a route handler: AdminError → structured JSON, anything else → 500 (logged). */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function assertSameSite(req: Request): void {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  if (req.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'cross_site', 'Yêu cầu không hợp lệ.');
  if (req.headers.get('x-eiv-admin') !== '1') fail(403, 'missing_header', 'Yêu cầu không hợp lệ.');
}

export function assertDatabase(): void {
  if (!process.env.DATABASE_URL) fail(503, 'no_database', 'Admin cần database (DATABASE_URL chưa được đặt).');
}

/** API: a session that passed 2FA (or did not need it). `admin` → admin role required. */
export async function requireStaff(req: Request, opts: { admin?: boolean } = {}): Promise<AdminSession> {
  assertDatabase();
  assertSameSite(req);
  const s = await readSession();
  if (!s) return fail(401, 'unauthenticated', 'Phiên đăng nhập đã hết, hãy đăng nhập lại.');
  if (!s.twoFactorPassed) fail(401, 'two_factor_required', 'Cần nhập mã xác thực 2 bước.');
  if (opts.admin && !s.user.isAdmin) fail(403, 'forbidden', 'Chỉ quản trị viên được làm việc này.');
  return s;
}

/** API: a session that may still be at the 2FA step (2FA endpoints only). */
export async function requirePendingSession(req: Request): Promise<AdminSession> {
  assertDatabase();
  assertSameSite(req);
  const s = await readSession();
  if (!s) return fail(401, 'unauthenticated', 'Phiên đăng nhập đã hết, hãy đăng nhập lại.');
  return s;
}

/** Pages: redirect to login / 2FA when needed; returns the signed-in user. */
export async function staffPage(opts: { admin?: boolean } = {}): Promise<AdminUser> {
  if (!process.env.DATABASE_URL) redirect('/admin/dang-nhap');
  const s = await readSession();
  if (!s) redirect('/admin/dang-nhap');
  if (!s.twoFactorPassed) redirect('/admin/2fa');
  if (opts.admin && !s.user.isAdmin) redirect('/admin');
  return s.user;
}

/** Where a fresh session goes next. */
export const nextAfterLogin = (u: Pick<AdminUser, 'totpEnabled'>) =>
  u.totpEnabled || twoFactorRequired() ? '/admin/2fa' : '/admin';

/** Editors work only inside their areas (decision #7); admins everywhere. */
export function canEditAreas(user: AdminUser, restaurantAreaIds: number[]): boolean {
  if (user.isAdmin) return true;
  return restaurantAreaIds.some((id) => user.areaIds.includes(id));
}

/** Parses a JSON body with a Zod schema; 400 with the first message on failure. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_json', 'Dữ liệu gửi lên không hợp lệ.');
  }
  const r = schema.safeParse(body);
  if (!r.success) return fail(400, 'invalid_input', r.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.');
  return r.data;
}

/** Route param `[id]` → positive integer, else 404. */
export function idParam(raw: string): number {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : fail(404, 'not_found', 'Không tìm thấy.');
}
