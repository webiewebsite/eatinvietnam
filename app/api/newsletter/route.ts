import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { after } from 'next/server';
import { getDb, hasDatabase } from '@/db/client';
import { newsletterSubscribers } from '@/db/schema';
import { sendMail } from '@/lib/mail';
import { CONSENT_TEXT, SignupSchema, createRateLimiter, normalizeEmail } from '@/lib/newsletter';
import { siteUrl } from '@/lib/seo';
import home from '@content/home.json';

const CITY_LABEL = new Map(home.cities.map((c) => [c.slug, c.label]));

// 5 sign-ups per 10 minutes per client address; the address itself is never stored.
const allow = createRateLimiter(5, 10 * 60 * 1000);

const clientKey = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

/**
 * City waitlist / newsletter sign-up. Always answers 204 for a valid request, whether the
 * address was new or already there, so the endpoint cannot be used to test who signed up.
 */
export async function POST(req: Request) {
  if (!allow(clientKey(req))) return Response.json({ error: { code: 'rate_limited' } }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: 'invalid_json' } }, { status: 400 });
  }
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: 'invalid_signup' } }, { status: 400 });
  if (!hasDatabase()) return Response.json({ error: { code: 'unavailable' } }, { status: 503 });

  const email = normalizeEmail(parsed.data.email);
  const city = parsed.data.city ?? null;
  if (city && !CITY_LABEL.has(city)) return Response.json({ error: { code: 'invalid_city' } }, { status: 400 });
  const cityLabel = city ? CITY_LABEL.get(city) : null;
  const db = getDb();
  const now = new Date();

  const [existing] = await db
    .select({ id: newsletterSubscribers.id, token: newsletterSubscribers.unsubscribeToken })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  let token: string;
  if (existing) {
    // Signing up again re-subscribes and refreshes the consent record.
    token = existing.token;
    await db
      .update(newsletterSubscribers)
      .set({ city, consentText: CONSENT_TEXT, consentAt: now, unsubscribedAt: null })
      .where(eq(newsletterSubscribers.id, existing.id));
  } else {
    token = randomBytes(32).toString('base64url');
    await db
      .insert(newsletterSubscribers)
      .values({ email, city, consentText: CONSENT_TEXT, consentAt: now, unsubscribeToken: token })
      // Two identical requests racing: the second becomes a no-op…
      .onDuplicateKeyUpdate({ set: { updatedAt: sql`updated_at` } });
    // …so read back the token that actually got stored.
    const [row] = await db
      .select({ token: newsletterSubscribers.unsubscribeToken })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);
    token = row?.token ?? token;
  }

  const unsubscribeUrl = `${siteUrl()}/huy-dang-ky?token=${token}`;
  // Mail goes out after the response so a slow SMTP server never delays the form.
  after(() =>
    Promise.all([
      sendMail({
        to: email,
        subject: 'EatInVietnam: đã ghi nhận đăng ký',
        text: [
          'Cảm ơn bạn đã đăng ký nhận tin từ EatInVietnam.',
          ...(city ? [`Chúng tôi sẽ báo bạn khi EatInVietnam mở ở thành phố bạn chọn (${cityLabel}).`] : []),
          '',
          `Không muốn nhận email nữa? Hủy đăng ký: ${unsubscribeUrl}`,
        ].join('\n'),
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      }),
      process.env.MAIL_NOTIFY_TO
        ? sendMail({
            to: process.env.MAIL_NOTIFY_TO,
            subject: `[EatInVietnam] Đăng ký nhận tin mới${cityLabel ? ` — ${cityLabel}` : ''}`,
            text: `Email: ${email}\nThành phố: ${cityLabel ?? '(không chọn)'}\nThời điểm: ${now.toISOString()}`,
          })
        : Promise.resolve(false),
    ]),
  );

  return new Response(null, { status: 204 });
}
