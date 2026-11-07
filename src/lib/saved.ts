/**
 * Saved restaurants + lists in localStorage (no accounts in MVP).
 * Every access is wrapped: Safari private mode / blocked storage must not crash the UI.
 */
import { useSyncExternalStore } from 'react';

export type SavedStatus = 'want' | 'visited';
export interface SavedItem {
  slug: string;
  status: SavedStatus;
  savedAt: number;
}
export interface SavedList {
  id: string;
  name: string;
  slugs: string[];
}
interface Store {
  available: boolean;
  items: SavedItem[];
  lists: SavedList[];
  recent: string[];
}

const KEYS = { items: 'eiv:saved', lists: 'eiv:lists', recent: 'eiv:recent' } as const;
const EMPTY: Store = { available: true, items: [], lists: [], recent: [] };
const SERVER: Store = { available: true, items: [], lists: [], recent: [] };

let cache: Store | null = null;
const listeners = new Set<() => void>();

function readJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function load(): Store {
  try {
    return {
      available: true,
      items: readJSON<SavedItem[]>(KEYS.items, []),
      lists: readJSON<SavedList[]>(KEYS.lists, []),
      recent: readJSON<string[]>(KEYS.recent, []),
    };
  } catch {
    return { ...EMPTY, available: false };
  }
}

function getSnapshot(): Store {
  cache ??= load();
  return cache;
}

function write(next: Omit<Store, 'available'>): boolean {
  try {
    localStorage.setItem(KEYS.items, JSON.stringify(next.items));
    localStorage.setItem(KEYS.lists, JSON.stringify(next.lists));
    localStorage.setItem(KEYS.recent, JSON.stringify(next.recent));
    cache = { ...next, available: true };
  } catch {
    cache = { ...getSnapshot(), available: false };
    listeners.forEach((l) => l());
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('eiv:')) {
      cache = load();
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSavedStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}

export function isSaved(store: Store, slug: string) {
  return store.items.some((i) => i.slug === slug);
}

/** Returns the new saved state, or null when storage is unavailable. */
export function toggleSaved(slug: string): boolean | null {
  const s = getSnapshot();
  const saved = isSaved(s, slug);
  const items = saved ? s.items.filter((i) => i.slug !== slug) : [{ slug, status: 'want' as const, savedAt: Date.now() }, ...s.items];
  return write({ ...s, items }) ? !saved : null;
}

export function setStatus(slug: string, status: SavedStatus) {
  const s = getSnapshot();
  write({ ...s, items: s.items.map((i) => (i.slug === slug ? { ...i, status } : i)) });
}

export function createList(name: string, slugs: string[] = []): SavedList | null {
  const s = getSnapshot();
  const list = { id: Math.random().toString(36).slice(2, 10), name: name.trim().slice(0, 60), slugs };
  return write({ ...s, lists: [list, ...s.lists] }) ? list : null;
}

export function addToList(listId: string, slug: string) {
  const s = getSnapshot();
  write({
    ...s,
    lists: s.lists.map((l) => (l.id === listId && !l.slugs.includes(slug) ? { ...l, slugs: [...l.slugs, slug] } : l)),
  });
}

export function deleteList(listId: string) {
  const s = getSnapshot();
  write({ ...s, lists: s.lists.filter((l) => l.id !== listId) });
}

export function pushRecent(slug: string) {
  const s = getSnapshot();
  if (!s.available) return;
  write({ ...s, recent: [slug, ...s.recent.filter((x) => x !== slug)].slice(0, 12) });
}

/** Share URL for a list of slugs: /da-luu?ds=a,b&ten=Name */
export function shareUrl(slugs: string[], name?: string) {
  const p = new URLSearchParams({ ds: slugs.join(',') });
  if (name) p.set('ten', name);
  return `${location.origin}/da-luu?${p.toString()}`;
}
