/**
 * Public URL of a stored photo. R2 objects are served from R2_PUBLIC_URL (r2.dev on staging,
 * img.<domain> later — decision H), resolved on the server so changing it needs no rebuild.
 * The next/image loader (lib/image-loader.ts) swaps the -<width>.webp suffix per size.
 */
import { R2_WIDTHS } from '@/lib/image-loader';

export { R2_WIDTHS };

/** Object keys for every pre-resized width of one photo. */
export const r2KeysFor = (largestKey: string) => R2_WIDTHS.map((w) => largestKey.replace(/-\d+\.webp$/, `-${w}.webp`));

export function photoUrl(p: { r2Key: string | null; externalUrl: string | null }, width?: (typeof R2_WIDTHS)[number]): string | null {
  if (p.r2Key) {
    const base = (process.env.R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
    const key = width ? p.r2Key.replace(/-\d+\.webp$/, `-${width}.webp`) : p.r2Key;
    return base ? `${base}/${key}` : key;
  }
  return p.externalUrl;
}
