/**
 * Re-verification reminders (decision A, 09/11): the "Sắp quá hạn" list in the admin plus a
 * Monday summary email to each editor for their areas (admins get everything). The daily
 * hPanel cron calls /api/cron/reverify; mail goes out once per ISO week, on Monday (Saigon).
 */
import { and, eq, gt, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { auditLog, restaurantAreas, userAreas } from '@/db/schema';
import { mailConfigured, sendMail } from '@/lib/mail';
import { siteUrl } from '@/lib/seo';
import { listUsers } from './accounts';
import { audit } from './audit';
import { listAdminRestaurants, type AdminListRow } from './restaurants';
import type { AdminUser } from './session';
import { saigonIsoWeek, saigonWeekday, viDate } from './time';

export interface ReminderMail {
  to: string;
  name: string;
  overdue: AdminListRow[];
  dueSoon: AdminListRow[];
}

/** Admin-wide list with each row's area ids, so it can be split per editor without N queries. */
async function dueWithAreas(now: Date) {
  const everything: AdminUser = {
    id: 0,
    email: '',
    displayName: '',
    role: 'admin',
    areaIds: [],
    areaSlugs: [],
    isAdmin: true,
    totpEnabled: false,
  };
  const rows = await listAdminRestaurants(everything, { due: true }, now);
  const links = rows.length
    ? await getDb()
        .select({ rid: restaurantAreas.restaurantId, aid: restaurantAreas.areaId })
        .from(restaurantAreas)
        .where(inArray(restaurantAreas.restaurantId, rows.map((r) => r.id)))
    : [];
  return rows.map((r) => ({ row: r, areaIds: links.filter((l) => l.rid === r.id).map((l) => l.aid) }));
}

/** Pure split: who gets which restaurants. Exported for tests. */
export function splitReminders(
  due: { row: AdminListRow; areaIds: number[] }[],
  people: { email: string; name: string; isAdmin: boolean; areaIds: number[] }[],
  now: Date,
): ReminderMail[] {
  return people.flatMap((p) => {
    const mine = due.filter((d) => p.isAdmin || d.areaIds.some((a) => p.areaIds.includes(a))).map((d) => d.row);
    if (!mine.length) return [];
    const isOver = (r: AdminListRow) => !r.reverifyDueAt || new Date(r.reverifyDueAt).getTime() <= now.getTime();
    return [{ to: p.email, name: p.name, overdue: mine.filter(isOver), dueSoon: mine.filter((r) => !isOver(r)) }];
  });
}

export function reminderText(m: ReminderMail): string {
  const line = (r: AdminListRow) => `- ${r.name}${r.district ? ` (${r.district})` : ''} · hạn ${viDate(r.reverifyDueAt)} · ${siteUrl()}/admin/quan/${r.id}`;
  return [
    `Chào ${m.name},`,
    '',
    'Danh sách quán trong khu bạn phụ trách cần xác minh lại (90 ngày một lần):',
    ...(m.overdue.length ? ['', `Đã quá hạn (${m.overdue.length}) — đang hiện "chưa cập nhật" trên web:`, ...m.overdue.map(line)] : []),
    ...(m.dueSoon.length ? ['', `Sắp đến hạn trong 14 ngày (${m.dueSoon.length}):`, ...m.dueSoon.map(line)] : []),
    '',
    `Xem toàn bộ: ${siteUrl()}/admin/sap-qua-han`,
  ].join('\n');
}

export async function buildReminders(now = new Date()): Promise<ReminderMail[]> {
  const [due, people] = await Promise.all([dueWithAreas(now), listUsers()]);
  const pairs = await getDb().select({ userId: userAreas.userId, areaId: userAreas.areaId }).from(userAreas);
  return splitReminders(
    due,
    people
      .filter((p) => p.status === 'active' && p.hasPassword)
      .map((p) => ({
        email: p.email,
        name: p.displayName,
        isAdmin: p.role === 'admin',
        areaIds: pairs.filter((x) => x.userId === p.id).map((x) => x.areaId),
      })),
    now,
  );
}

/**
 * Sends the weekly emails if today is Monday in Saigon and this week has not been sent yet
 * (or `force`). Without SMTP it reports what would have been sent and records nothing.
 */
export async function sendWeeklyReminders(now = new Date(), opts: { force?: boolean } = {}) {
  const week = saigonIsoWeek(now);
  const db = getDb();
  const mails = await buildReminders(now);
  const base = { week, recipients: mails.length, restaurants: new Set(mails.flatMap((m) => [...m.overdue, ...m.dueSoon].map((r) => r.id))).size };

  if (!opts.force && saigonWeekday(now) !== 1) return { ...base, sent: 0, skipped: 'not_monday' as const };
  const [already] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, 'reminder_sent'), eq(auditLog.entity, 'cron'), gt(auditLog.createdAt, new Date(now.getTime() - 6 * 86_400_000))))
    .limit(1);
  if (already && !opts.force) return { ...base, sent: 0, skipped: 'already_sent' as const };
  if (!mailConfigured()) return { ...base, sent: 0, skipped: 'no_smtp' as const };

  let sent = 0;
  for (const m of mails) {
    const ok = await sendMail({ to: m.to, subject: `[EatInVietnam] ${m.overdue.length + m.dueSoon.length} quán cần xác minh lại (${week})`, text: reminderText(m) });
    if (ok) sent++;
  }
  await audit(db, { userId: null, action: 'reminder_sent', entity: 'cron', diff: { week, sent, recipients: mails.length } });
  return { ...base, sent, skipped: null };
}
