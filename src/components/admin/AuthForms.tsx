'use client';

import { useState } from 'react';
import { adminFetch } from './api';
import { Button, Field, Notice, inputClass } from './ui';

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

const go = (next: string) => window.location.assign(next);
const val = (form: HTMLFormElement, name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';

export function LoginForm() {
  const { busy, error, run } = useSubmit();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        void run(async () => {
          const r = await adminFetch<{ next: string }>('/api/admin/auth/login', { json: { email: val(f, 'email'), password: val(f, 'password') } });
          go(r.next);
        });
      }}
    >
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Mật khẩu">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}

function PasswordFields({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <>
      <Field label="Mật khẩu mới" hint="Tối thiểu 10 ký tự. Nên dùng một cụm từ dài, không dùng lại mật khẩu ở nơi khác.">
        <input name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus={autoFocus} className={inputClass} />
      </Field>
      <Field label="Nhập lại mật khẩu">
        <input name="password2" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </Field>
    </>
  );
}

function checkPasswords(f: HTMLFormElement) {
  if (val(f, 'password') !== val(f, 'password2')) throw new Error('Hai mật khẩu không khớp.');
}

export function SetupForm() {
  const { busy, error, run } = useSubmit();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        void run(async () => {
          checkPasswords(f);
          const r = await adminFetch<{ next: string }>('/api/admin/auth/setup', {
            json: { email: val(f, 'email'), displayName: val(f, 'displayName'), password: val(f, 'password'), code: val(f, 'code') },
          });
          go(r.next);
        });
      }}
    >
      <Field label="Email (trong danh sách quản trị viên đầu tiên)">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Tên hiển thị" hint="Hiện trong nhật ký ai sửa gì.">
        <input name="displayName" required minLength={2} maxLength={80} className={inputClass} />
      </Field>
      <PasswordFields />
      <Field label="Mã thiết lập" hint="Người giữ hPanel đưa trực tiếp cho bạn (biến ADMIN_SETUP_CODE).">
        <input name="code" type="password" autoComplete="off" required className={inputClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" disabled={busy}>
        {busy ? 'Đang tạo…' : 'Tạo tài khoản quản trị'}
      </Button>
    </form>
  );
}

export function ActivateForm({ token, email, displayName }: { token: string; email: string; displayName: string }) {
  const { busy, error, run } = useSubmit();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        void run(async () => {
          checkPasswords(f);
          const r = await adminFetch<{ next: string }>('/api/admin/auth/activate', {
            json: { token, displayName: val(f, 'displayName'), password: val(f, 'password') },
          });
          go(r.next);
        });
      }}
    >
      <Field label="Email">
        <input value={email} readOnly autoComplete="username" className={inputClass} disabled />
      </Field>
      <Field label="Tên hiển thị">
        <input name="displayName" defaultValue={displayName} required minLength={2} maxLength={80} className={inputClass} />
      </Field>
      <PasswordFields autoFocus />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" disabled={busy}>
        {busy ? 'Đang lưu…' : 'Đặt mật khẩu và vào admin'}
      </Button>
    </form>
  );
}

function CodeInput() {
  return (
    <Field label="Mã 6 số trong ứng dụng xác thực">
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        className={`${inputClass} text-center font-mono text-[20px] tracking-[0.4em]`}
      />
    </Field>
  );
}

/** Login step 2: enter a code, or enrol first when the account has no 2FA yet. */
export function TwoFactorForm({ enrolled, email }: { enrolled: boolean; email: string }) {
  const { busy, error, run } = useSubmit();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);

  if (!enrolled && !setup) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[14px]">
          Tài khoản <b>{email}</b> cần bật xác thực 2 bước. Cài ứng dụng như Google Authenticator, Microsoft Authenticator hoặc 1Password trên
          điện thoại, rồi bấm nút dưới đây.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <Button
          tone="primary"
          disabled={busy}
          onClick={() => void run(async () => setSetup(await adminFetch('/api/admin/auth/2fa/setup', { json: {} })))}
        >
          Tạo mã cho ứng dụng
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        void run(async () => {
          const r = await adminFetch<{ next: string }>('/api/admin/auth/2fa', { json: { code: val(f, 'code') } });
          go(r.next);
        });
      }}
    >
      {setup && <TotpSecret {...setup} />}
      <CodeInput />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" disabled={busy}>
        {busy ? 'Đang kiểm tra…' : 'Xác nhận'}
      </Button>
    </form>
  );
}

function TotpSecret({ secret, uri }: { secret: string; uri: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-input border border-line bg-sunken p-3 text-[14px]">
      <p>
        Trên điện thoại: <a href={uri} className="font-semibold text-thanhlong underline">mở bằng ứng dụng xác thực</a>, hoặc trong ứng dụng chọn
        &quot;Nhập khóa&quot; và gõ khóa sau (loại: theo thời gian):
      </p>
      <code className="block rounded-tag bg-surface px-2 py-1.5 text-center font-mono text-[15px] tracking-wider break-all select-all">
        {secret.replace(/(.{4})/g, '$1 ').trim()}
      </code>
      <p className="text-[12px] text-muted">Khóa chỉ hiện một lần. Rồi nhập mã 6 số ứng dụng đang hiện để hoàn tất.</p>
    </div>
  );
}

export function LogoutButton() {
  const { busy, run } = useSubmit();
  return (
    <Button
      tone="ghost"
      disabled={busy}
      onClick={() =>
        void run(async () => {
          const r = await adminFetch<{ next: string }>('/api/admin/auth/logout', { json: {} });
          go(r.next);
        })
      }
    >
      Đăng xuất
    </Button>
  );
}

export function PasswordForm() {
  const { busy, error, run } = useSubmit();
  const [done, setDone] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        void run(async () => {
          checkPasswords(f);
          await adminFetch('/api/admin/auth/password', { json: { current: val(f, 'current'), next: val(f, 'password') } });
          f.reset();
          setDone(true);
        });
      }}
    >
      <Field label="Mật khẩu hiện tại">
        <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <PasswordFields />
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="ok">Đã đổi mật khẩu.</Notice>}
      <Button type="submit" tone="primary" disabled={busy} className="self-start">
        Đổi mật khẩu
      </Button>
    </form>
  );
}

/** Account page: turn 2FA on (voluntary where not required) or off (only where not required). */
export function TwoFactorSettings({ enabled, required, email }: { enabled: boolean; required: boolean; email: string }) {
  const { busy, error, run } = useSubmit();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (enabled) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="ok">Xác thực 2 bước đang bật.</Notice>
        {!required && (
          <Button
            tone="danger"
            disabled={busy}
            className="self-start"
            onClick={() =>
              void run(async () => {
                await adminFetch('/api/admin/auth/2fa', { method: 'DELETE', json: {} });
                window.location.reload();
              })
            }
          >
            Tắt 2FA
          </Button>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">
        {required ? 'Bắt buộc trên máy chủ này.' : 'Đang tắt (staging cho phép). Nên bật trước khi lên production.'} Tài khoản: {email}
      </p>
      {!setup ? (
        <Button tone="primary" disabled={busy} className="self-start" onClick={() => void run(async () => setSetup(await adminFetch('/api/admin/auth/2fa/setup', { json: {} })))}>
          Bật 2FA
        </Button>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            void run(async () => {
              await adminFetch('/api/admin/auth/2fa', { json: { code: val(f, 'code') } });
              setOk('Đã bật xác thực 2 bước.');
              window.location.reload();
            });
          }}
        >
          <TotpSecret {...setup} />
          <CodeInput />
          <Button type="submit" tone="primary" disabled={busy} className="self-start">
            Xác nhận
          </Button>
        </form>
      )}
      {ok && <Notice tone="ok">{ok}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
