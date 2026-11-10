'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { adminFetch } from './api';
import { Button, Card, Field, Notice, inputClass } from './ui';

export interface ManagedPhoto {
  id: number;
  preview: string | null;
  alt: string;
  credit: string | null;
  isR2: boolean;
}

/** Gallery photos (first = cover on the restaurant page). Own photos only (ops doc). */
export function PhotoManager({ restaurantId, photos, r2Ready }: { restaurantId: number; photos: ManagedPhoto[]; r2Ready: boolean }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={`Ảnh (${photos.length})`} id="anh">
      <div className="flex flex-col gap-3">
        {!r2Ready && <Notice tone="warn">Chưa cấu hình Cloudflare R2 (R2_* trong hPanel) nên chưa upload ảnh được.</Notice>}
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-1 rounded-input border border-line p-1.5">
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail; pre-resized 480 px on R2
                <img src={p.preview} alt={p.alt} className="aspect-[4/3] w-full rounded-tag object-cover" loading="lazy" />
              ) : (
                <div className="aspect-[4/3] rounded-tag bg-sunken" />
              )}
              <span className="line-clamp-2 text-[12px]">
                {i === 0 && <b className="text-thanhlong">Ảnh bìa · </b>}
                {p.alt}
                {!p.isR2 && <span className="text-muted"> · ảnh demo</span>}
              </span>
              <span className="flex gap-0.5">
                <Button tone="ghost" className="flex-1 px-1" aria-label="Lên trước" disabled={busy || i === 0} onClick={() => void run(() => adminFetch(`/api/admin/photos/${p.id}`, { method: 'PATCH', json: { move: 'up' } }))}>
                  ←
                </Button>
                <Button tone="ghost" className="flex-1 px-1" aria-label="Ra sau" disabled={busy || i === photos.length - 1} onClick={() => void run(() => adminFetch(`/api/admin/photos/${p.id}`, { method: 'PATCH', json: { move: 'down' } }))}>
                  →
                </Button>
                <Button
                  tone="ghost"
                  className="flex-1 px-1 text-danger"
                  aria-label="Xóa ảnh"
                  disabled={busy}
                  onClick={() => window.confirm('Xóa ảnh này? Ảnh trên R2 cũng bị xóa.') && void run(() => adminFetch(`/api/admin/photos/${p.id}`, { method: 'DELETE', json: {} }))}
                >
                  ✕
                </Button>
              </span>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = file.current?.files?.[0];
            if (!f) {
              setError('Chọn một ảnh.');
              return;
            }
            const form = new FormData();
            form.set('file', f);
            form.set('alt', alt);
            void run(async () => {
              await adminFetch(`/api/admin/restaurants/${restaurantId}/photos`, { form });
              setAlt('');
              if (file.current) file.current.value = '';
            });
          }}
        >
          <Field label="Thêm ảnh" hint="Chỉ ảnh tự chụp tại quán. JPG/PNG/WebP, tối đa 15 MB. Vị trí GPS trong ảnh được xóa khi upload.">
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={!r2Ready || busy} className="text-[14px]" />
          </Field>
          <Field label="Mô tả ảnh (alt)" hint='Tả món trong ảnh, ví dụ "Tô bún bò với chả cua và rau thơm".'>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} disabled={!r2Ready || busy} className={inputClass} />
          </Field>
          <Button type="submit" disabled={!r2Ready || busy}>
            {busy ? 'Đang xử lý…' : 'Upload ảnh'}
          </Button>
        </form>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Card>
  );
}
