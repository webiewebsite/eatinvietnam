import { checkLogin } from '@/lib/admin/accounts';
import { assertDatabase, assertSameSite, fail, handle, nextAfterLogin, readJson } from '@/lib/admin/guard';
import { LoginInput } from '@/lib/admin/schemas';
import { startSession, twoFactorRequired } from '@/lib/admin/session';
import { clientKey, createRateLimiter } from '@/lib/rate-limit';

// Security: 5 tries per email and 20 per client address every 15 minutes.
const perEmail = createRateLimiter(5, 15 * 60 * 1000);
const perClient = createRateLimiter(20, 15 * 60 * 1000);

export const POST = handle(async (req: Request) => {
  assertDatabase();
  assertSameSite(req);
  const input = await readJson(req, LoginInput);
  if (!perClient(clientKey(req)) || !perEmail(input.email)) fail(429, 'rate_limited', 'Thử quá nhiều lần. Đợi 15 phút rồi thử lại.');
  const u = await checkLogin(input.email, input.password);
  const passed = !u.totpEnabled && !twoFactorRequired();
  await startSession(u.id, passed);
  return Response.json({ next: nextAfterLogin(u) });
});
