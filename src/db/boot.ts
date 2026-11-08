/**
 * Database bootstrap when the Node server starts (called from instrumentation.ts).
 *
 * On Hostinger the database only listens on 127.0.0.1, so migrations can't run from a
 * dev machine without opening Remote MySQL. Instead, staging opts in with env flags:
 *   MIGRATE_ON_START=1     apply pending migrations (drizzle tracks what ran; idempotent)
 *   SEED_DEMO_IF_EMPTY=1   load the 14 demo restaurants if `restaurants` is empty
 * Production leaves both unset and migrates as a deliberate release step.
 * Never throws: a failure is logged and the app keeps serving (it still reads demo data).
 */
import path from 'node:path';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { getDb } from './client';
import { seedDemo } from './seed';

export const MIGRATIONS_FOLDER = path.join(process.cwd(), 'src', 'db', 'migrations');

export async function bootDatabase(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!env.DATABASE_URL) return;
  const db = getDb();

  if (env.MIGRATE_ON_START === '1') {
    try {
      const t = Date.now();
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      console.warn(`[db] migrations up to date (${Date.now() - t} ms)`);
    } catch (e) {
      console.error('[db] migration failed — fix and redeploy; app keeps serving demo data', e);
      return; // never seed on top of a half-migrated schema
    }
  }

  if (env.SEED_DEMO_IF_EMPTY === '1') {
    try {
      const r = await seedDemo(db);
      console.warn(`[db] ${r.message}`);
    } catch (e) {
      console.error('[db] demo seed failed', e);
    }
  }
}
