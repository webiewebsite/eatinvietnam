'use client';

import { useEffect } from 'react';
import { pushRecent } from '@/lib/saved';
import { track } from '@/lib/tracking';

/** Fires view_restaurant once and records the slug in "recently viewed" (tab Tôi). */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track('view_restaurant', { slug });
    pushRecent(slug);
  }, [slug]);
  return null;
}
