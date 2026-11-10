import { inviteUser } from '@/lib/admin/accounts';
import { handle, readJson, requireStaff } from '@/lib/admin/guard';
import { InviteInput } from '@/lib/admin/schemas';

export const POST = handle(async (req: Request) => {
  const s = await requireStaff(req, { admin: true });
  const input = await readJson(req, InviteInput);
  return Response.json(await inviteUser(s.user, input), { status: 201 });
});
