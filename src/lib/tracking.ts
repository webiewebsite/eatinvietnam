import { gaEvent } from '@/lib/ga';

/** Event names allowed by /api/events. Keep in sync with app/api/events/route.ts. */
export const EVENT_NAMES = [
  'search',
  'view_restaurant',
  'save',
  'share',
  'outbound_grab',
  'outbound_shopeefood',
  'directions',
  'report_issue',
  'mode_switch',
  'category_click',
  'promo_click',
  'map_open',
  'map_pin_select',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

type Props = Record<string, string | number | boolean | undefined>;

const ANON_KEY = 'eiv:anon';

function anonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

/** Fire-and-forget. Never throws, never blocks navigation, never sends PII. */
export function track(name: EventName, props: Props = {}): void {
  try {
    const body = JSON.stringify({ name, props, anonId: anonymousId(), path: location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/events', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } });
    }
    // Same event to GA4 — a no-op unless the visitor accepted analytics cookies.
    gaEvent(name, props);
  } catch {
    // Tracking must never break the UI.
  }
}
