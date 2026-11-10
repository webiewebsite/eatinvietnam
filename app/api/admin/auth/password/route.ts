import { changePassword } from '@/lib/admin/accounts';
import { handle, readJson, requireStaff } from '@/lib/admin/guard';
import { PasswordInput } from '@/lib/admin/schemas';

export const POST = handle(async (req: Request) => {
  const s = await requireStaff(req);
  const input = await readJson(req, PasswordInput);
  await changePassword(s.user.id, input.current, input.next);
  return Response.json({ ok: true });
});
