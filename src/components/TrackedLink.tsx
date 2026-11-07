'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track, type EventName } from '@/lib/tracking';

type Props = ComponentProps<typeof Link> & {
  event: EventName;
  props?: Record<string, string | number | boolean | undefined>;
};

/** next/link that fires one tracking event on click. Lets server components stay server components. */
export function TrackedLink({ event, props, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, props);
        onClick?.(e);
      }}
    />
  );
}
