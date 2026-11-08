import { z } from 'zod';
import { getCardsBySlugs } from '@/lib/restaurants';
import { getViewerLocation } from '@/lib/location-server';
import { currentDate } from '@/lib/hours';

const Query = z.object({
  slugs: z
    .string()
    .max(4000)
    .transform((s) => s.split(',').filter(Boolean))
    .pipe(z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(50)),
});

/** Batch card data by slug (saved lists, shared links, recently viewed). Only verified restaurants. */
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return Response.json({ error: { code: 'invalid_query', message: 'slugs must be a comma-separated list (max 50)' } }, { status: 400 });
  }
  const items = getCardsBySlugs(parsed.data.slugs, await getViewerLocation(), currentDate());
  // Distances depend on the viewer's cookie: never share a cached response between viewers.
  return Response.json({ items }, { headers: { 'cache-control': 'private, no-store' } });
}
