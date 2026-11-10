/** Admin UI primitives (design-system tokens only; touch targets ≥ 44 px). */
import { clsx } from 'clsx';
import { STATUS_LABEL } from '@/lib/admin/schemas';

export const inputClass =
  'h-11 w-full rounded-input border border-line bg-surface px-3 text-[15px] outline-none focus:border-thanhlong focus:ring-2 focus:ring-thanhlong/25 disabled:bg-sunken disabled:text-muted';
export const textareaClass =
  'min-h-20 w-full rounded-input border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-thanhlong focus:ring-2 focus:ring-thanhlong/25';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('flex flex-col gap-1', className)}>
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="text-[12px] text-muted">{hint}</span>}
      {error && <span className="text-[12px] font-medium text-danger">{error}</span>}
    </label>
  );
}

type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';
const TONE: Record<Tone, string> = {
  primary: 'bg-thanhlong text-on-thanhlong hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-sunken',
  danger: 'border border-danger/40 bg-surface text-danger hover:bg-danger/10',
  ghost: 'text-ink hover:bg-sunken',
};

export function Button({
  tone = 'secondary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-input px-4 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        TONE[tone],
        className,
      )}
    />
  );
}

export function Card({ title, actions, children, className, id }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={clsx('scroll-mt-20 rounded-card border border-line bg-surface p-4', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-section font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-sunken text-muted',
  pending: 'bg-xoai-soft text-ink',
  verified: 'bg-raurau-soft text-raurau',
  temp_closed: 'bg-sunken text-danger',
  closed: 'bg-sunken text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex rounded-tag px-1.5 py-0.5 text-badge font-bold whitespace-nowrap', STATUS_TONE[status] ?? STATUS_TONE.draft)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: React.ReactNode }) {
  const t = {
    info: 'border-line bg-sunken',
    warn: 'border-xoai bg-xoai-soft',
    error: 'border-danger/40 bg-danger/10 text-danger',
    ok: 'border-raurau/40 bg-raurau-soft',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-input border px-3 py-2 text-[14px]', t)}>
      {children}
    </div>
  );
}
