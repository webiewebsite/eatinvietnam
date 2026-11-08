/** Runs once when the Next.js server starts (Node runtime only, never Edge). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootDatabase } = await import('./src/db/boot');
  await bootDatabase();
}
