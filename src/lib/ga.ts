import { GA_ID, analyticsEnabled } from '@/lib/consent';

type Gtag = (...args: unknown[]) => void;
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>;

let loaded = false;

/** Injects gtag.js. Call only after the visitor chose "Đồng ý". Ads features stay off. */
export function loadGa(): void {
  if (loaded || !analyticsEnabled()) return;
  loaded = true;
  const w = window as GaWindow;
  w[`ga-disable-${GA_ID}`] = false;
  w.dataLayer = w.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array copy.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  w.gtag('js', new Date());
  w.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

/** Withdrawal: stop sending and drop the _ga cookies on this domain. */
export function disableGa(): void {
  if (!analyticsEnabled()) return;
  const w = window as GaWindow;
  w[`ga-disable-${GA_ID}`] = true;
  w.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  const host = location.hostname.split('.').slice(-2).join('.');
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim();
    if (name && (name === '_ga' || name.startsWith('_ga_'))) {
      for (const domain of ['', `; domain=.${host}`, `; domain=${location.hostname}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
      }
    }
  }
}

/** Mirrors an app event to GA4 when it is loaded (consent given). */
export function gaEvent(name: string, params: Record<string, unknown>): void {
  if (!loaded) return;
  (window as GaWindow).gtag?.('event', name, params);
}
