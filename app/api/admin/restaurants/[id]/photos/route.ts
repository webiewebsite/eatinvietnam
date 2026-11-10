import { z } from 'zod';
import { fail, handle, idParam, requireStaff } from '@/lib/admin/guard';
import { MAX_UPLOAD_BYTES, uploadPhoto } from '@/lib/admin/photos';

type Ctx = { params: Promise<{ id: string }> };

const Alt = z.string().trim().min(3, 'Thêm mô tả ảnh (alt), ví dụ "Tô bún bò với chả cua"').max(200);

/** multipart/form-data: file (the photo), alt (Vietnamese description of the dish). */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireStaff(req);
  const id = idParam((await params).id);
  // Cheap early reject before buffering the body.
  if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) fail(413, 'too_large', 'Ảnh lớn hơn 15 MB.');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'invalid_form', 'Không đọc được file gửi lên.');
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) fail(400, 'no_file', 'Chọn một ảnh để upload.');
  const alt = Alt.safeParse(form.get('alt') ?? '');
  if (!alt.success) fail(400, 'invalid_alt', alt.error!.issues[0]!.message);
  return Response.json(await uploadPhoto(s.user, id, file as File, alt.data!), { status: 201 });
});
