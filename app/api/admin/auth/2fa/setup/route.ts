import { startTotp } from '@/lib/admin/accounts';
import { handle, requirePendingSession } from '@/lib/admin/guard';

/** Starts enrolment: returns the secret + otpauth link for the authenticator app. */
export const POST = handle(async (req: Request) => {
  const s = await requirePendingSession(req);
  return Response.json(await startTotp(s.user.id, s.user.email));
});
