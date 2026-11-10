import { handle, idParam, readJson, requireStaff } from '@/lib/admin/guard';
import { saveRestaurant } from '@/lib/admin/restaurants';
import { RestaurantInput } from '@/lib/admin/schemas';

type Ctx = { params: Promise<{ id: string }> };

/** Saves the whole editable document (info, dishes, vibes, hours, menu). Status is separate. */
export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req);
  const id = idParam((await params).id);
  const input = await readJson(req, RestaurantInput);
  return Response.json(await saveRestaurant(s.user, id, input));
});
