import { describe, expect, it } from 'vitest';
import imageLoader, { roundUpWidth } from '@/lib/image-loader';

describe('roundUpWidth', () => {
  it('rounds up to the nearest pre-resized width', () => {
    expect(roundUpWidth(100)).toBe(480);
    expect(roundUpWidth(480)).toBe(480);
    expect(roundUpWidth(481)).toBe(960);
    expect(roundUpWidth(3000)).toBe(1440);
  });
});

describe('imageLoader', () => {
  it('adds resize params to Pexels URLs', () => {
    const out = imageLoader({ src: 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', width: 640 });
    expect(out).toContain('w=640');
    expect(out).toContain('auto=compress');
  });
  it('picks the pre-resized width for R2 photo URLs', () => {
    const src = 'https://pub-abc.r2.dev/restaurants/12/0f8e-1440.webp';
    expect(imageLoader({ src, width: 640 })).toBe('https://pub-abc.r2.dev/restaurants/12/0f8e-960.webp');
    expect(imageLoader({ src, width: 300 })).toBe('https://pub-abc.r2.dev/restaurants/12/0f8e-480.webp');
    // Bucket in the path (S3-compatible endpoints, CI MinIO)
    expect(imageLoader({ src: 'http://127.0.0.1:9000/b/restaurants/1/x-1440.webp', width: 2000 })).toBe(
      'http://127.0.0.1:9000/b/restaurants/1/x-1440.webp',
    );
  });
  it('passes local assets through', () => {
    expect(imageLoader({ src: '/logo.svg', width: 64 })).toBe('/logo.svg');
  });
});
