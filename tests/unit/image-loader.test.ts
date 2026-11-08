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
  it('passes local assets through', () => {
    expect(imageLoader({ src: '/logo.svg', width: 64 })).toBe('/logo.svg');
  });
});
