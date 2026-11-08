/**
 * Database bootstrap for Hostinger staging (the DB only listens on 127.0.0.1).
 *   MIGRATE_ON_START=1     apply pending migrations (drizzle tracks what ran; idempotent)
 *   SEED_DEMO_IF_EMPTY=1   load the 14 demo restaurants if `restaurants` is empty
 * Runs from instrumentation.ts at server start AND lazily from /api/health, so it
 * still happens if the host never calls the instrumentation hook. Never throws.
 * Production leaves both flags unset and migrates as a deliberate release step.
 */
import path from 'node:path';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { getDb } from './client';
import { seedDemo } from './seed';

export const MIGRATIONS_FOLDER = path.join(process.cwd(), 'src', 'db', 'migrations');

export interface BootReport {
  databaseUrl: 'set' | 'missing';
  migrate: 'off' | 'ok' | `error: ${string}`;
  seed: 'off' | 'seeded' | 'skipped' | `error: ${string}`;
  at: string;
}

/** Short, non-secret error label (driver code like ECONNREFUSED / ER_ACCESS_DENIED_ERROR). */
export function errorCode(e: unknown): string {
  const err = e as { code?: string; errno?: number; name?: string; message?: string };
  return err?.code ?? err?.name ?? 'unknown';
}

async function run(env: NodeJS.ProcessEnv): Promise<BootReport> {
  const report: BootReport = {
    databaseUrl: env.DATABASE_URL ? 'set' : 'missing',
    migrate: 'off',
    seed: 'off',
    at: new Date().toISOString(),
  };
  // Always one line, so a missing env var is visible in the host's runtime log.
  console.warn(
    `[db] boot: DATABASE_URL=${report.databaseUrl} MIGRATE_ON_START=${env.MIGRATE_ON_START ?? '-'} SEED_DEMO_IF_EMPTY=${env.SEED_DEMO_IF_EMPTY ?? '-'} cwd=${process.cwd()}`,
  );
  if (!env.DATABASE_URL) return report;
  const db = getDb();

  if (env.MIGRATE_ON_START === '1') {
    try {
      const t = Date.now();
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      report.migrate = 'ok';
      console.warn(`[db] migrations up to date (${Date.now() - t} ms)`);
    } catch (e) {
      report.migrate = `error: ${errorCode(e)}`;
      console.error('[db] migration failed — fix and redeploy; app keeps serving demo data', e);
      return report; // never seed on top of a half-migrated schema
    }
  }

  if (env.SEED_DEMO_IF_EMPTY === '1') {
    try {
      const r = await seedDemo(db);
      report.seed = r.seeded ? 'seeded' : 'skipped';
      console.warn(`[db] ${r.message}`);
    } catch (e) {
      report.seed = `error: ${errorCode(e)}`;
      console.error('[db] demo seed failed', e);
    }
  }
  return report;
}

const g = globalThis as unknown as { __eivBoot?: Promise<BootReport> };

/** Runs the boot once per server process; later calls get the same report. */
export function bootDatabase(env: NodeJS.ProcessEnv = process.env): Promise<BootReport> {
  g.__eivBoot ??= run(env);
  return g.__eivBoot;
}
