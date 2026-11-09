/**
 * Cookie consent for Google Analytics (ops decision F, 09/11). GA4 loads only after "Đồng ý".
 * The choice lives in localStorage; when storage is unavailable we treat it as "no choice yet"
 * and never load GA.
 */
export const CONSENT_KEY = 'eiv:consent';
export const CONSENT_EVENT = 'eiv:consent-change';
export type Consent = 'granted' | 'denied';

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';
export const analyticsEnabled = () => /^G-[A-Z0-9]{4,20}$/.test(GA_ID);

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consent | null): void {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Without storage the banner simply asks again next visit.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
