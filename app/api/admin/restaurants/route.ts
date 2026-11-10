import { handle, readJson, requireStaff } from '@/lib/admin/guard';
import { saveRestaurant } from '@/lib/admin/restaurants';
import { RestaurantInput } from '@/lib/admin/schemas';

/** New restaurant — always starts as a draft (hidden from the public). */
export const POST = handle(async (req: Request) => {
  const s = await requireStaff(req);
  const input = await readJson(req, RestaurantInput);
  return Response.json(await saveRestaurant(s.user, null, input), { status: 201 });
});
