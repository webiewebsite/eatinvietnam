/**
 * Seeds demo data into an EMPTY database. Usage: DATABASE_URL=... npm run db:seed
 * Exits 1 when restaurants already exist (never overwrites real data).
 */
import { getDb } from '@/db/client';
import { seedDemo } from '@/db/seed';

seedDemo(getDb())
  .then((r) => {
    if (r.seeded) console.warn(r.message);
    else console.error(r.message);
    process.exit(r.seeded ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
