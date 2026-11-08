import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

type Db = MySql2Database<typeof schema>;

// One pool per server process (Next dev hot-reload re-imports modules).
const g = globalThis as unknown as { __eivPool?: mysql.Pool; __eivDb?: Db };

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Drizzle client. Server-only; throws when DATABASE_URL is missing (demo mode has no DB). */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (the app is running on demo data).');
  g.__eivPool ??= mysql.createPool({ uri: url, connectionLimit: 5, timezone: 'Z', dateStrings: false });
  g.__eivDb ??= drizzle(g.__eivPool, { schema, mode: 'default' });
  return g.__eivDb;
}
