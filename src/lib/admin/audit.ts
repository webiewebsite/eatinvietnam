/** Audit log (decision #7: every edit traceable to a person). Never stores passwords, tokens or secrets. */
import { getDb } from '@/db/client';
import { auditLog } from '@/db/schema';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type AuditAction =
  | 'create'
  | 'update'
  | 'status'
  | 'verify'
  | 'import'
  | 'photo_add'
  | 'photo_update'
  | 'photo_delete'
  | 'login'
  | 'login_failed'
  | 'setup'
  | 'activate'
  | 'invite'
  | 'reset_link'
  | 'password'
  | 'two_factor'
  | 'reminder_sent';

export async function audit(
  db: Db | Tx,
  entry: { userId: number | null; action: AuditAction; entity: string; entityId?: number | null; diff?: unknown },
): Promise<void> {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    diff: entry.diff ?? null,
  });
}

/** Field-level diff of two flat-ish objects: { field: [before, after] } for changed fields only. */
export function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown>): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(after)])) {
    const a = before?.[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = [a, b];
  }
  return out;
}
