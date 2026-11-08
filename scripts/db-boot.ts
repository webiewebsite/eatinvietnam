/** Runs the same boot hook as the server (CI uses it to test MIGRATE_ON_START / SEED_DEMO_IF_EMPTY). */
import { bootDatabase } from '@/db/boot';

bootDatabase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
