import { handle, idParam, readJson, requireStaff } from '@/lib/admin/guard';
import { setRestaurantStatus } from '@/lib/admin/restaurants';
import { StatusInput } from '@/lib/admin/schemas';

type Ctx = { params: Promise<{ id: string }> };

/** verify (needs a method) · submit · draft · temp_closed · closed. Only `verified` is public. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req);
  const id = idParam((await params).id);
  return Response.json(await setRestaurantStatus(s.user, id, await readJson(req, StatusInput)));
});
