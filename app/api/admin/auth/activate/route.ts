import { activate } from '@/lib/admin/accounts';
import { assertDatabase, assertSameSite, fail, handle, nextAfterLogin, readJson } from '@/lib/admin/guard';
import { ActivateInput } from '@/lib/admin/schemas';
import { loadAdminUser, startSession, twoFactorRequired } from '@/lib/admin/session';
import { clientKey, createRateLimiter } from '@/lib/rate-limit';

const allow = createRateLimiter(10, 15 * 60 * 1000);

/** Invite or reset link: set the password, then sign in. */
export const POST = handle(async (req: Request) => {
  assertDatabase();
  assertSameSite(req);
  if (!allow(clientKey(req))) fail(429, 'rate_limited', 'Thử quá nhiều lần. Đợi 15 phút rồi thử lại.');
  const input = await readJson(req, ActivateInput);
  const id = await activate(input);
  const user = await loadAdminUser(id);
  if (!user) return Response.json({ next: '/admin/dang-nhap' });
  await startSession(id, !user.totpEnabled && !twoFactorRequired());
  return Response.json({ next: nextAfterLogin(user) });
});
