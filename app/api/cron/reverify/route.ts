import { timingSafeEqual } from 'node:crypto';
import { sendWeeklyReminders } from '@/lib/admin/reminders';
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
 * Daily hPanel cron (decision #6 + A): lists restaurants past their re-verification
 * deadline and, on Mondays (Saigon), emails each editor the ones in their areas — once
 * per week. `?force=1` sends now (testing); `?dry=1` never sends.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: { code: 'unauthorized' } }, { status: 401 });
  const now = currentDate();
  const url = new URL(req.url);
  const overdue = await overdueForReverification(now);
  const reminders =
    process.env.DATABASE_URL && url.searchParams.get('dry') !== '1'
      ? await sendWeeklyReminders(now, { force: url.searchParams.get('force') === '1' })
      : null;
  return Response.json({ reverifyDays: REVERIFY_DAYS, count: overdue.length, overdue, reminders });
}
