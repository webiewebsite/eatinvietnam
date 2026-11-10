import { checkTotp, disableTotp } from '@/lib/admin/accounts';
import { fail, handle, readJson, requirePendingSession, requireStaff } from '@/lib/admin/guard';
import { TotpInput } from '@/lib/admin/schemas';
import { markTwoFactorPassed, twoFactorRequired } from '@/lib/admin/session';
import { createRateLimiter } from '@/lib/rate-limit';

// 6-digit codes: 5 tries per session per 10 minutes.
const allow = createRateLimiter(5, 10 * 60 * 1000);

/** Code check: finishes the login step, and enables 2FA on the first code after enrolment. */
export const POST = handle(async (req: Request) => {
  const s = await requirePendingSession(req);
  if (!allow(s.sessionId)) fail(429, 'rate_limited', 'Sai quá nhiều lần. Đợi 10 phút rồi thử lại.');
  const { code } = await readJson(req, TotpInput);
  await checkTotp(s.user.id, code);
  await markTwoFactorPassed(s.sessionId);
  return Response.json({ next: '/admin' });
});

/** Turn 2FA off for yourself — only where it is not required (staging). */
export const DELETE = handle(async (req: Request) => {
  const s = await requireStaff(req);
  if (twoFactorRequired()) fail(400, 'required', '2FA là bắt buộc trên máy chủ này.');
  await disableTotp(s.user.id, s.user.id);
  return Response.json({ ok: true });
});
