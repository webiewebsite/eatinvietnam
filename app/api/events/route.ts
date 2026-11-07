import { z } from 'zod';

// Keep in sync with EVENT_NAMES in src/lib/tracking.ts (client module, not importable here).
const NAMES = [
  'search',
  'view_restaurant',
  'save',
  'share',
  'outbound_grab',
  'outbound_shopeefood',
  'directions',
  'report_issue',
  'mode_switch',
  'category_click',
  'promo_click',
  'map_open',
  'map_pin_select',
] as const;

const Event = z.object({
  name: z.enum(NAMES),
  anonId: z.string().max(64),
  path: z.string().max(200),
  props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

/** Accepts tracking events. Persisting to the `events` table lands with issue #10; no PII is ever accepted. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: 'invalid_json' } }, { status: 400 });
  }
  const parsed = Event.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: 'invalid_event' } }, { status: 400 });
  return new Response(null, { status: 204 });
}
