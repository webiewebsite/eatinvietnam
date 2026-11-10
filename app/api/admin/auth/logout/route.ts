import { assertSameSite, handle } from '@/lib/admin/guard';
import { endSession } from '@/lib/admin/session';

export const POST = handle(async (req: Request) => {
  assertSameSite(req);
  await endSession();
  return Response.json({ next: '/admin/dang-nhap' });
});
