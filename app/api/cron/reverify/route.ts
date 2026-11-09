import { timingSafeEqual } from 'node:crypto';
import { currentDate } from '@/lib/hours';
import { overdueForReverification } from '@/lib/restaurants';
import { REVERIFY_DAYS } from '@/lib/verification';

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get('x-cron-secret');
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily hPanel cron: restaurants past their re-verification deadline (decision #6).
 * Delivery to editors (email / admin queue) lands with the admin (#8); for now it returns the list.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: { code: 'unauthorized' } }, { status: 401 });
  const overdue = await overdueForReverification(currentDate());
  return Response.json({ reverifyDays: REVERIFY_DAYS, count: overdue.length, overdue });
}
