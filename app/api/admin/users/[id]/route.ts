import { updateUser } from '@/lib/admin/accounts';
import { handle, idParam, readJson, requireStaff } from '@/lib/admin/guard';
import { UserPatchInput } from '@/lib/admin/schemas';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req, { admin: true });
  const id = idParam((await params).id);
  await updateUser(s.user, id, await readJson(req, UserPatchInput));
  return Response.json({ ok: true });
});
