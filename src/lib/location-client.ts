import { useSyncExternalStore } from 'react';
import type { LatLng } from '@/lib/geo';
import { LOC_COOKIE, LOC_MAX_AGE, formatLocCookie, parseLocCookie } from '@/lib/location';

const listeners = new Set<() => void>();
let cache: { raw: string; value: LatLng | null } = { raw: '', value: null };

function readCookie(): string {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${LOC_COOKIE}=`));
    return hit ? hit.slice(LOC_COOKIE.length + 1) : '';
  } catch {
    return '';
  }
}

function getSnapshot(): LatLng | null {
  const raw = readCookie();
  // Same object while the cookie is unchanged, so useSyncExternalStore doesn't loop.
  if (raw !== cache.raw) cache = { raw, value: parseLocCookie(raw) };
  return cache.value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The viewer's (rounded) location on the client; null on the server and until granted. */
export function useViewerLocation(): LatLng | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function setViewerLocation(p: LatLng) {
  document.cookie = `${LOC_COOKIE}=${encodeURIComponent(formatLocCookie(p))}; Max-Age=${LOC_MAX_AGE}; Path=/; SameSite=Lax`;
  listeners.forEach((l) => l());
}

export type LocateError = 'denied' | 'unavailable';

/** Asks the browser for the location (only call from a user action or /ban-do). */
export function requestViewerLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('unavailable' satisfies LocateError);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setViewerLocation(p);
        resolve(getSnapshot() ?? p);
      },
      (err) => reject((err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable') satisfies LocateError),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}
