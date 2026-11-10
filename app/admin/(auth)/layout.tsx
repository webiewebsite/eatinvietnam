import { LogoMark } from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-5 px-4 py-10">
      <div className="flex items-center gap-2">
        <LogoMark size={32} />
        <span className="font-display text-[20px] font-extrabold">Admin EatInVietnam</span>
      </div>
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">{children}</div>
    </main>
  );
}
