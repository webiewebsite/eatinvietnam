'use client';

import { useSyncExternalStore } from 'react';
import { clsx } from 'clsx';
import { openState, type OpenState } from '@/lib/hours';
import type { OpeningSlot } from '@/lib/types';

// Minute-resolution clock shared by every OpenStatus on the page.
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 30_000);
  return () => clearInterval(id);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

/** Live open state on ISR pages: server value during hydration, then recomputed in the browser. */
function useOpenState(hours: OpeningSlot[], serverState: OpenState): OpenState {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  return minute == null ? serverState : openState(hours, new Date(minute * 60_000));
}

/** "Mở / đến 21:00" cell for the merchant stat strip. */
export function OpenStat({ hours, serverState }: { hours: OpeningSlot[]; serverState: OpenState }) {
  const s = useOpenState(hours, serverState);
  return (
    <>
      <dd className={clsx('font-display text-[17px] font-extrabold', s.open ? 'text-raurau' : 'text-danger')}>
        {s.open ? 'Mở' : 'Đóng'}
      </dd>
      <dd className="text-badge text-muted">{s.open ? `đến ${s.closesAt}` : s.opensAt ? `mở ${s.opensAt}` : 'hôm nay'}</dd>
    </>
  );
}
