/**
 * Re-verification policy (decision #6, 09/11): an editor re-checks every restaurant
 * at least every REVERIFY_DAYS. Overdue restaurants stay public but are labelled
 * "chưa cập nhật" and listed for editors by /api/cron/reverify.
 */
export const REVERIFY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function reverifyDueAt(verifiedAt: string): Date {
  return new Date(new Date(verifiedAt).getTime() + REVERIFY_DAYS * DAY_MS);
}

export function isVerificationOverdue(verifiedAt: string, now: Date = new Date()): boolean {
  const t = new Date(verifiedAt).getTime();
  // A missing/invalid date counts as overdue: we can't vouch for it.
  return !Number.isFinite(t) || now.getTime() >= reverifyDueAt(verifiedAt).getTime();
}
