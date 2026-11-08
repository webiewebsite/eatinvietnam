import { z } from 'zod';

const Report = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  reason: z.enum(['price', 'hours', 'closed', 'address', 'other']),
  note: z.string().max(500).optional().nullable(),
  website: z.string().max(0).optional().nullable(), // honeypot must stay empty
});

/** "Báo sai thông tin". Storage in `reports` + rate limit land with issue #10. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: 'invalid_json' } }, { status: 400 });
  }
  const parsed = Report.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: 'invalid_report' } }, { status: 400 });
  return new Response(null, { status: 204 });
}
