import { cookies } from 'next/headers';
import type { LatLng } from '@/lib/geo';
import { LOC_COOKIE, parseLocCookie } from '@/lib/location';

/** Viewer location from the cookie, or null. Reading it makes the page dynamic. */
export async function getViewerLocation(): Promise<LatLng | null> {
  return parseLocCookie((await cookies()).get(LOC_COOKIE)?.value);
}
