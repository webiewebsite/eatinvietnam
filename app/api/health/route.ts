import { count, sql } from 'drizzle-orm';
import { bootDatabase, errorCode } from '@/db/boot';
import { getDb } from '@/db/client';
import { restaurants } from '@/db/schema';

export const dynamic = 'force-dynamic';

/**
 * Uptime + database status (no secrets): is DATABASE_URL set, is the DB reachable,
 * how many migrations ran, how many restaurants exist, and what the boot hook did.
 * Also triggers the boot hook if the host never ran instrumentation.ts.
 */
export async function GET() {
  const boot = await bootDatabase();
  const db: Record<string, unknown> = { configured: boot.databaseUrl === 'set', boot };

  if (boot.databaseUrl === 'set') {
    const conn = getDb();
    try {
      await conn.execute(sql`SELECT 1`);
      db.reachable = true;
    } catch (e) {
      return Response.json(
        { ok: true, time: new Date().toISOString(), db: { ...db, reachable: false, error: errorCode(e) } },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    try {
      const [rows] = (await conn.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`)) as unknown as [{ n: number }[]];
      db.migrationsApplied = Number(rows[0]?.n ?? 0);
    } catch (e) {
      db.migrationsApplied = `none (${errorCode(e)})`;
    }
    try {
      const [{ n }] = (await conn.select({ n: count() }).from(restaurants)) as [{ n: number }];
      db.restaurants = n;
    } catch (e) {
      db.restaurants = `error (${errorCode(e)})`;
    }
  }

  return Response.json({ ok: true, time: new Date().toISOString(), db }, { headers: { 'cache-control': 'no-store' } });
}
