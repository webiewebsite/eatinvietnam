import { BottomNav } from '@/components/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-[480px] px-4 pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
