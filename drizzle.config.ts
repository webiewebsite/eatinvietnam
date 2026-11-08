import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  // Only `migrate` needs a real URL; `generate` works offline.
  dbCredentials: { url: process.env.DATABASE_URL ?? 'mysql://user:pass@localhost:3306/eatinvietnam' },
  strict: true,
  verbose: true,
});
