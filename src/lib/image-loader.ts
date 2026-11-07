import type { ImageLoaderProps } from 'next/image';

// Widths we pre-resize to when uploading to R2 (see issue #8).
export const R2_WIDTHS = [480, 960, 1440] as const;

export function roundUpWidth(width: number): number {
  return R2_WIDTHS.find((w) => w >= width) ?? R2_WIDTHS[R2_WIDTHS.length - 1]!;
}

/**
 * Custom next/image loader. Never triggers Next's optimizer:
 * - Pexels (demo data): CDN resizes via query params.
 * - R2 keys like `restaurants/<id>/<uuid>-960.webp`: pick the nearest pre-resized width.
 * - Local /public assets: served as-is.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith('https://images.pexels.com/')) {
    const url = new URL(src);
    url.searchParams.set('auto', 'compress');
    url.searchParams.set('cs', 'tinysrgb');
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 70));
    return url.toString();
  }
  if (src.startsWith('restaurants/')) {
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
    return `${base}/${src.replace(/-\d+\.webp$/, `-${roundUpWidth(width)}.webp`)}`;
  }
  return src;
}
