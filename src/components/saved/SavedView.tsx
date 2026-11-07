'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Share2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { RestaurantPhoto } from '@/components/RestaurantPhoto';
import { SaveButton } from '@/components/SaveButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { RowSkeleton } from '@/components/ui/Skeleton';
import type { CardData } from '@/lib/restaurants';
import {
  createList,
  deleteList,
  setStatus,
  shareUrl,
  useSavedStore,
  type SavedItem,
  type SavedList,
} from '@/lib/saved';
import { track } from '@/lib/tracking';

/** Fetches card data for slugs from the API (batch). */
function useCards(slugs: string[]) {
  const key = slugs.join(',');
  const [cards, setCards] = useState<Record<string, CardData>>({});
  const [doneKey, setDoneKey] = useState('');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const ctrl = new AbortController();
    fetch(`/api/restaurants?slugs=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: CardData[] }) => {
        if (cancelled) return;
        setCards((prev) => ({ ...prev, ...Object.fromEntries(d.items.map((c) => [c.slug, c])) }));
        setDoneKey(key);
      })
      .catch(() => !cancelled && setDoneKey(key));
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [key]);

  return { cards, loading: !!key && doneKey !== key };
}

async function share(slugs: string[], name?: string) {
  const url = shareUrl(slugs, name);
  track('share', { kind: 'list', size: slugs.length });
  try {
    if (navigator.share) await navigator.share({ title: name ?? 'Quán đã lưu', url });
    else {
      await navigator.clipboard.writeText(url);
      alert('Đã sao chép link danh sách');
    }
  } catch {
    // share sheet cancelled
  }
}

export function SavedView({ sharedSlugs, sharedName }: { sharedSlugs: string[]; sharedName?: string }) {
  const store = useSavedStore();
  const [tab, setTab] = useState<'all' | 'lists'>('all');
  const slugs = useMemo(() => {
    const own = store.items.map((i) => i.slug);
    const listed = store.lists.flatMap((l) => l.slugs);
    return [...new Set([...sharedSlugs, ...own, ...listed])];
  }, [store, sharedSlugs]);
  const { cards, loading } = useCards(slugs);

  if (!store.available) {
    return (
      <EmptyState
        title="Trình duyệt đang chặn lưu trữ"
        hint="Bật lại cookie/bộ nhớ trang web (hoặc thoát chế độ ẩn danh) để lưu quán trên máy này."
      />
    );
  }

  if (sharedSlugs.length) {
    return (
      <section aria-labelledby="shared">
        <p className="text-badge font-bold tracking-wide text-thanhlong uppercase">Danh sách được chia sẻ</p>
        <h2 id="shared" className="font-display text-h1 font-extrabold">
          {sharedName || 'Quán bạn bè gợi ý'}
        </h2>
        <p className="text-meta text-muted">{sharedSlugs.length} quán · bấm tim để lưu về máy bạn</p>
        <CardList slugs={sharedSlugs} cards={cards} loading={loading} />
        <button
          type="button"
          onClick={() => createList(sharedName || 'Danh sách được chia sẻ', sharedSlugs)}
          className="sticker mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-thanhlong font-bold text-on-thanhlong"
        >
          <Plus aria-hidden className="size-5" /> Lưu cả danh sách
        </button>
      </section>
    );
  }

  return (
    <>
      <div role="tablist" aria-label="Đã lưu" className="mt-1 flex gap-2">
        {[
          { id: 'lists' as const, label: `Danh sách · ${store.lists.length}` },
          { id: 'all' as const, label: `Tất cả quán · ${store.items.length}` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'h-10 rounded-full border px-4 text-[14px] font-bold',
              tab === t.id ? 'border-line-strong bg-xoai text-on-xoai' : 'border-line bg-surface text-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lists' ? (
        <Lists lists={store.lists} items={store.items} cards={cards} />
      ) : store.items.length ? (
        <>
          <ItemList items={store.items} cards={cards} loading={loading} />
          <button
            type="button"
            onClick={() => share(store.items.map((i) => i.slug))}
            className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full border-2 border-line-strong bg-surface font-bold"
          >
            <Share2 aria-hidden className="size-4.5" /> Chia sẻ danh sách
          </button>
        </>
      ) : (
        <EmptyState
          className="mt-4"
          title="Chưa lưu quán nào"
          hint="Bấm trái tim ở quán bạn thích để giữ lại đây."
          action={
            <Link href="/" className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-bold text-surface">
              Khám phá quán
            </Link>
          }
        />
      )}
    </>
  );
}

function ItemList({ items, cards, loading }: { items: SavedItem[]; cards: Record<string, CardData>; loading: boolean }) {
  if (loading && !Object.keys(cards).length) return <RowSkeleton count={Math.min(items.length, 4)} />;
  return (
    <section aria-labelledby="recent-saved" className="mt-5">
      <h2 id="recent-saved" className="font-display text-section font-bold">
        Lưu gần đây
      </h2>
      <ul className="mt-1 divide-y divide-line">
        {[...items]
          .sort((a, b) => b.savedAt - a.savedAt)
          .map((i) => {
            const c = cards[i.slug];
            if (!c) return null;
            return (
              <li key={i.slug} className="flex items-center gap-3 py-3">
                <Link href={`/quan/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <RestaurantPhoto photo={c.photo} dish={c.dish} sizes="56px" className="size-14 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[15px] font-bold">{c.name}</span>
                    <span className="block text-[12px] text-muted">
                      {c.districtLabel} ·{' '}
                      <span className={c.isOpen ? 'font-semibold text-raurau' : 'font-semibold text-danger'}>{c.openLabel}</span>
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  aria-pressed={i.status === 'visited'}
                  onClick={() => setStatus(i.slug, i.status === 'visited' ? 'want' : 'visited')}
                  className={clsx(
                    'inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-bold',
                    i.status === 'visited' ? 'bg-raurau-soft text-raurau' : 'bg-xoai-soft text-ink',
                  )}
                >
                  {i.status === 'visited' && <Check aria-hidden className="size-3.5" />}
                  {i.status === 'visited' ? 'Đã đi' : 'Muốn thử'}
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

function Lists({ lists, items, cards }: { lists: SavedList[]; items: SavedItem[]; cards: Record<string, CardData> }) {
  const [name, setName] = useState('');
  return (
    <div className="mt-4 flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2.5">
        {lists.map((l) => {
          const cover = l.slugs.map((s) => cards[s]).find(Boolean);
          return (
            <li key={l.id} className="relative overflow-hidden rounded-card bg-surface shadow-card">
              <RestaurantPhoto photo={cover?.photo} dish={cover?.dish ?? 'pho'} sizes="200px" rounded="rounded-none" className="h-20" />
              <div className="p-2.5">
                <p className="truncate font-display text-[15px] font-bold">{l.name}</p>
                <p className="text-[12px] text-muted">{l.slugs.length} quán</p>
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    aria-label={`Chia sẻ danh sách ${l.name}`}
                    onClick={() => share(l.slugs, l.name)}
                    className="grid size-10 place-items-center rounded-full hover:bg-sunken"
                  >
                    <Share2 aria-hidden className="size-4.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Xóa danh sách ${l.name}`}
                    onClick={() => deleteList(l.id)}
                    className="grid size-10 place-items-center rounded-full hover:bg-sunken"
                  >
                    <Trash2 aria-hidden className="size-4.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          // New lists start with every saved restaurant; editing membership comes with the list detail screen.
          createList(name, items.map((i) => i.slug));
          setName('');
        }}
        className="flex gap-2 rounded-card border-2 border-dashed border-line p-2"
      >
        <label htmlFor="new-list" className="sr-only">
          Tên danh sách mới
        </label>
        <input
          id="new-list"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Ăn khuya Q1"
          maxLength={60}
          className="h-11 min-w-0 flex-1 rounded-input bg-surface px-3"
        />
        <button type="submit" className="inline-flex h-11 items-center gap-1 rounded-full bg-ink px-4 font-bold text-surface">
          <Plus aria-hidden className="size-4.5" /> Tạo
        </button>
      </form>
    </div>
  );
}

function CardList({ slugs, cards, loading }: { slugs: string[]; cards: Record<string, CardData>; loading: boolean }) {
  if (loading && !Object.keys(cards).length) return <RowSkeleton count={Math.min(slugs.length, 4)} />;
  const found = slugs.map((s) => cards[s]).filter((c): c is CardData => !!c);
  if (!found.length) return <EmptyState className="mt-4" title="Danh sách trống" hint="Các quán trong link này không còn trên EatInVietnam." />;
  return (
    <ul className="mt-2 divide-y divide-line">
      {found.map((c) => (
        <li key={c.slug} className="flex items-center gap-3 py-3">
          <Link href={`/quan/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
            <RestaurantPhoto photo={c.photo} dish={c.dish} sizes="56px" className="size-14 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-bold">{c.name}</span>
              <span className="block text-[12px] text-muted">
                {c.dishLabel} · {c.districtLabel}
              </span>
            </span>
          </Link>
          <SaveButton slug={c.slug} name={c.name} />
        </li>
      ))}
    </ul>
  );
}
