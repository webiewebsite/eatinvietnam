import { resetLink } from '@/lib/admin/accounts';
import { handle, idParam, requireStaff } from '@/lib/admin/guard';

type Ctx = { params: Promise<{ id: string }> };

/** New one-time link (reset, or invite if the account never set a password). Shown to the admin to pass on. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req, { admin: true });
  return Response.json(await resetLink(s.user, idParam((await params).id)));
});
