'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { STATUS_LABEL, VERIFICATION_METHODS, type VerificationMethod } from '@/lib/admin/schemas';
import { viDate } from '@/lib/admin/time';
import { adminFetch } from './api';
import { Button, Card, Field, Notice, StatusBadge, inputClass } from './ui';

export function StatusPanel({
  id,
  slug,
  status,
  verifiedAt,
  verifiedByName,
  verificationMethod,
  reverifyDueAt,
  missing,
  dirty,
}: {
  id: number;
  slug: string;
  status: string;
  verifiedAt: string | null;
  verifiedByName: string | null;
  verificationMethod: string | null;
  reverifyDueAt: string | null;
  missing: string[];
  dirty: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<VerificationMethod>('visited');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (body: { action: string; method?: VerificationMethod }, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/restaurants/${id}/status`, { json: body });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const overdue = status === 'verified' && (!reverifyDueAt || new Date(reverifyDueAt) <= new Date());
  const methodLabel = VERIFICATION_METHODS.find((m) => m.value === verificationMethod)?.label;

  return (
    <Card title="Trạng thái & xác minh" id="trang-thai">
      <div className="flex flex-col gap-3 text-[14px]">
        <p className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {status === 'verified' ? (
            <a href={`/quan/${slug}`} target="_blank" rel="noreferrer" className="font-semibold text-thanhlong underline">
              Xem trang công khai ↗
            </a>
          ) : (
            <span className="text-muted">Chưa hiện công khai (chỉ quán &quot;{STATUS_LABEL.verified}&quot; mới hiện).</span>
          )}
        </p>
        {verifiedAt && (
          <p className="text-muted">
            Xác minh {viDate(verifiedAt)}
            {verifiedByName ? ` bởi ${verifiedByName}` : ''}
            {methodLabel ? ` · ${methodLabel.toLowerCase()}` : ''}
            <br />
            <span className={overdue ? 'font-semibold text-danger' : ''}>
              {overdue ? 'Đã quá hạn xác minh lại — web đang hiện "chưa cập nhật".' : `Hạn xác minh lại: ${viDate(reverifyDueAt)}`}
            </span>
          </p>
        )}

        {missing.length > 0 && <Notice tone="warn">Còn thiếu để xác minh: {missing.join(', ')}.</Notice>}
        {dirty && <Notice tone="warn">Lưu thay đổi trước rồi mới xác minh hoặc đổi trạng thái.</Notice>}

        <Field label={status === 'verified' ? 'Xác minh lại' : 'Xác minh và hiện công khai'} hint="Ghi đúng cách bạn đã kiểm tra thông tin.">
          <select value={method} onChange={(e) => setMethod(e.target.value as VerificationMethod)} className={inputClass}>
            {VERIFICATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Button tone="primary" disabled={busy || dirty || missing.length > 0} onClick={() => void act({ action: 'verify', method })}>
          {status === 'verified' ? 'Xác minh lại hôm nay' : 'Xác minh & đăng'}
        </Button>

        <div className="flex flex-wrap gap-2">
          {status === 'draft' && (
            <Button disabled={busy || dirty} onClick={() => void act({ action: 'submit' })}>
              Gửi duyệt
            </Button>
          )}
          {status !== 'draft' && (
            <Button disabled={busy || dirty} onClick={() => void act({ action: 'draft' }, 'Chuyển về nháp? Quán sẽ biến mất khỏi web.')}>
              Về nháp (ẩn)
            </Button>
          )}
          {status !== 'temp_closed' && (
            <Button disabled={busy || dirty} onClick={() => void act({ action: 'temp_closed' }, 'Đánh dấu tạm đóng? Quán sẽ ẩn khỏi web.')}>
              Tạm đóng
            </Button>
          )}
          {status !== 'closed' && (
            <Button tone="danger" disabled={busy || dirty} onClick={() => void act({ action: 'closed' }, 'Đánh dấu đóng hẳn? Quán sẽ ẩn khỏi web.')}>
              Đóng hẳn
            </Button>
          )}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Card>
  );
}
