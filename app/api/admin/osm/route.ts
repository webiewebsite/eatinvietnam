import { z } from 'zod';
import { fail, handle, requireStaff } from '@/lib/admin/guard';
import { searchOsm } from '@/lib/admin/osm';
import { createRateLimiter } from '@/lib/rate-limit';

// On top of the global 1 request/second to Nominatim: 30 searches per person per 10 minutes.
const allow = createRateLimiter(30, 10 * 60 * 1000);
const Q = z.string().trim().min(2, 'Gõ ít nhất 2 ký tự').max(120);

/** GET /api/admin/osm?q=… — suggestions only (#30); the editor verifies before saving. */
export const GET = handle(async (req: Request) => {
  const s = await requireStaff(req);
  const q = Q.safeParse(new URL(req.url).searchParams.get('q') ?? '');
  if (!q.success) fail(400, 'invalid_query', q.error!.issues[0]!.message);
  if (!allow(String(s.user.id))) fail(429, 'rate_limited', 'Tìm quá nhiều lần. Đợi vài phút rồi thử lại.');
  try {
    return Response.json({ items: await searchOsm(q.data!) }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (e) {
    console.error('[osm] search failed', (e as Error).message);
    return fail(502, 'osm_unavailable', 'OpenStreetMap không trả lời. Nhập tay hoặc thử lại sau.');
  }
});
