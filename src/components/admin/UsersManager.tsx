'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { viDateTime } from '@/lib/admin/time';
import { adminFetch } from './api';
import { Button, Card, Field, Notice, inputClass } from './ui';

export interface ManagedUser {
  id: number;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
  role: 'editor' | 'admin' | null;
  areas: string[];
  totpEnabled: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
}

interface AreaOpt {
  slug: string;
  name: string;
  kind: string;
}

function AreaPicker({ areas, value, onChange }: { areas: AreaOpt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {areas.map((a) => {
        const on = value.includes(a.slug);
        return (
          <button
            key={a.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== a.slug) : [...value, a.slug])}
            className={`min-h-10 rounded-full border px-3 text-[13px] font-semibold ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'}`}
          >
            {a.name}
          </button>
        );
      })}
    </div>
  );
}

/** One-time link shown to the admin: email may not be configured, and links must reach the right person. */
function LinkBox({ link, mailed }: { link: string; mailed: boolean }) {
  return (
    <Notice tone="ok">
      <p className="mb-1">
        {mailed ? 'Đã gửi email kèm link. ' : 'Chưa gửi được email (chưa cấu hình SMTP). '}
        Bạn cũng có thể gửi link này trực tiếp cho người đó (dùng một lần):
      </p>
      <code className="block rounded-tag bg-surface px-2 py-1 text-[12px] break-all select-all">{link}</code>
    </Notice>
  );
}

export function UsersManager({ users, areas, meId }: { users: ManagedUser[]; areas: AreaOpt[]; meId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ userId: number | 'new'; link: string; mailed: boolean } | null>(null);
  const [invite, setInvite] = useState({ email: '', displayName: '', role: 'editor' as 'editor' | 'admin', areas: [] as string[] });
  const [editing, setEditing] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ role: 'editor' | 'admin'; areas: string[] }>({ role: 'editor', areas: [] });

  const run = async (fn: () => Promise<void>) => {
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
  const patch = (id: number, body: Record<string, unknown>) => run(async () => void (await adminFetch(`/api/admin/users/${id}`, { method: 'PATCH', json: body })));
  const areaName = (slug: string) => areas.find((a) => a.slug === slug)?.name ?? slug;

  return (
    <div className="flex flex-col gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      <Card title="Mời người mới">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const r = await adminFetch<{ link: string; mailed: boolean }>('/api/admin/users', { json: invite });
              setLink({ userId: 'new', ...r });
              setInvite({ email: '', displayName: '', role: 'editor', areas: [] });
            });
          }}
        >
          <Field label="Email">
            <input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Tên hiển thị">
            <input required minLength={2} value={invite.displayName} onChange={(e) => setInvite({ ...invite, displayName: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Quyền">
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as 'editor' | 'admin' })} className={inputClass}>
              <option value="editor">Biên tập (chỉ khu được giao)</option>
              <option value="admin">Quản trị (mọi khu, quản lý người dùng)</option>
            </select>
          </Field>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[13px] font-semibold">Khu vực phụ trách {invite.role === 'admin' && <span className="font-normal text-muted">(quản trị không cần)</span>}</span>
            <AreaPicker areas={areas} value={invite.areas} onChange={(v) => setInvite({ ...invite, areas: v })} />
          </div>
          <Button type="submit" tone="primary" disabled={busy} className="sm:col-span-2 sm:justify-self-start">
            Tạo tài khoản & link mời
          </Button>
        </form>
        {link?.userId === 'new' && <div className="mt-3"><LinkBox {...link} /></div>}
      </Card>

      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-card border border-line bg-surface p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {u.displayName} {u.id === meId && <span className="text-[12px] text-muted">(bạn)</span>}
                </p>
                <p className="truncate text-[13px] text-muted">{u.email}</p>
                <p className="mt-1 text-[12px] text-muted">
                  {u.role === 'admin' ? 'Quản trị' : `Biên tập · ${u.areas.length ? u.areas.map(areaName).join(', ') : 'chưa giao khu'}`}
                  {' · '}
                  {u.status === 'disabled' ? <b className="text-danger">Đã khóa</b> : !u.hasPassword ? 'Chưa kích hoạt' : `2FA ${u.totpEnabled ? 'bật' : 'tắt'}`}
                  {u.lastLoginAt && ` · đăng nhập ${viDateTime(u.lastLoginAt)}`}
                </p>
              </div>
              {u.id !== meId && (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setEditing(editing === u.id ? null : u.id);
                      setEdit({ role: u.role ?? 'editor', areas: u.areas });
                    }}
                  >
                    Quyền & khu
                  </Button>
                  <Button
                    disabled={busy || u.status === 'disabled'}
                    onClick={() =>
                      void run(async () => {
                        const r = await adminFetch<{ link: string; mailed: boolean }>(`/api/admin/users/${u.id}/link`, { json: {} });
                        setLink({ userId: u.id, ...r });
                      })
                    }
                  >
                    {u.hasPassword ? 'Link đặt lại mật khẩu' : 'Link mời mới'}
                  </Button>
                  {u.totpEnabled && (
                    <Button disabled={busy} onClick={() => window.confirm(`Tắt 2FA của ${u.displayName}? Lần đăng nhập sau họ phải cài lại.`) && void patch(u.id, { resetTwoFactor: true })}>
                      Đặt lại 2FA
                    </Button>
                  )}
                  {u.status === 'active' ? (
                    <Button tone="danger" disabled={busy} onClick={() => window.confirm(`Khóa tài khoản ${u.displayName}? Họ bị đăng xuất ngay.`) && void patch(u.id, { status: 'disabled' })}>
                      Khóa
                    </Button>
                  ) : (
                    <Button disabled={busy} onClick={() => void patch(u.id, { status: 'active' })}>
                      Mở khóa
                    </Button>
                  )}
                </div>
              )}
            </div>
            {editing === u.id && (
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as 'editor' | 'admin' })} className={`${inputClass} sm:w-72`} aria-label="Quyền">
                  <option value="editor">Biên tập</option>
                  <option value="admin">Quản trị</option>
                </select>
                <AreaPicker areas={areas} value={edit.areas} onChange={(v) => setEdit({ ...edit, areas: v })} />
                <Button tone="primary" disabled={busy} className="self-start" onClick={() => void patch(u.id, edit).then(() => setEditing(null))}>
                  Lưu quyền
                </Button>
              </div>
            )}
            {link && link.userId === u.id && <div className="mt-3"><LinkBox {...link} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
