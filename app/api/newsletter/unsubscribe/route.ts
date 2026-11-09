import { and, eq, isNull } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { newsletterSubscribers } from '@/db/schema';
import { UnsubscribeSchema } from '@/lib/newsletter';

/**
 * POST only: mail scanners pre-fetch links with GET, which must never unsubscribe anyone.
 * Accepts JSON (from /huy-dang-ky) or a form post. Unknown tokens answer 204 too.
 */
export async function POST(req: Request) {
  let token: unknown;
  try {
    const type = req.headers.get('content-type') ?? '';
    token = type.includes('application/json')
      ? ((await req.json()) as { token?: unknown }).token
      : (await req.formData()).get('token');
  } catch {
    return Response.json({ error: { code: 'invalid_body' } }, { status: 400 });
  }
  const parsed = UnsubscribeSchema.safeParse({ token });
  if (!parsed.success) return Response.json({ error: { code: 'invalid_token' } }, { status: 400 });
  if (!hasDatabase()) return Response.json({ error: { code: 'unavailable' } }, { status: 503 });

  await getDb()
    .update(newsletterSubscribers)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(newsletterSubscribers.unsubscribeToken, parsed.data.token), isNull(newsletterSubscribers.unsubscribedAt)));
  return new Response(null, { status: 204 });
}
