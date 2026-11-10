import { bootstrapAdmin } from '@/lib/admin/accounts';
import { assertDatabase, assertSameSite, fail, handle, nextAfterLogin, readJson } from '@/lib/admin/guard';
import { SetupInput } from '@/lib/admin/schemas';
import { startSession, twoFactorRequired } from '@/lib/admin/session';
import { clientKey, createRateLimiter } from '@/lib/rate-limit';

const allow = createRateLimiter(5, 15 * 60 * 1000);

/** First admins only (ADMIN_BOOTSTRAP_EMAILS + ADMIN_SETUP_CODE). */
export const POST = handle(async (req: Request) => {
  assertDatabase();
  assertSameSite(req);
  if (!allow(clientKey(req))) fail(429, 'rate_limited', 'Thử quá nhiều lần. Đợi 15 phút rồi thử lại.');
  const input = await readJson(req, SetupInput);
  const id = await bootstrapAdmin(input);
  await startSession(id, !twoFactorRequired());
  return Response.json({ next: nextAfterLogin({ totpEnabled: false }) });
});
