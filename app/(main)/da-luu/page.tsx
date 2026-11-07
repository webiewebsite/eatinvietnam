import type { Metadata } from 'next';
import { SavedView } from '@/components/saved/SavedView';

export const metadata: Metadata = {
  title: 'Đã lưu',
  robots: { index: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SavedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ds = typeof sp.ds === 'string' ? sp.ds : '';
  const ten = typeof sp.ten === 'string' ? sp.ten.slice(0, 60) : undefined;
  const sharedSlugs = ds
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, 50);

  return (
    <>
      <h1 className="pt-5 font-display text-h1 font-extrabold">Đã lưu</h1>
      <SavedView sharedSlugs={sharedSlugs} sharedName={ten} />
    </>
  );
}
