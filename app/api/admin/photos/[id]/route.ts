import { z } from 'zod';
import { handle, idParam, readJson, requireStaff } from '@/lib/admin/guard';
import { deletePhoto, updatePhoto } from '@/lib/admin/photos';

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  alt: z.string().trim().min(3).max(200).optional(),
  move: z.enum(['up', 'down']).optional(),
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req);
  await updatePhoto(s.user, idParam((await params).id), await readJson(req, Patch));
  return Response.json({ ok: true });
});

/** Deletes the row and every pre-resized object on R2. */
export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req);
  await deletePhoto(s.user, idParam((await params).id));
  return Response.json({ ok: true });
});
