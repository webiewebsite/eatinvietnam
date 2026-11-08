/** Runs once when the Next.js server starts. */
export async function register() {
  // Node runtime only (never Edge), and only when a database is configured.
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.DATABASE_URL) return;
  const { bootDatabase } = await import('./src/db/boot');
  await bootDatabase();
}
