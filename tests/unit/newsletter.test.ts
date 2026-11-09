import { describe, expect, it } from 'vitest';
import { SignupSchema, UnsubscribeSchema, createRateLimiter, normalizeEmail } from '@/lib/newsletter';

describe('SignupSchema', () => {
  it('accepts a valid sign-up and trims the email', () => {
    const r = SignupSchema.safeParse({ email: '  Ban@Example.com ', city: 'ha-noi', consent: true });
    expect(r.success).toBe(true);
    expect(r.success && normalizeEmail(r.data.email)).toBe('ban@example.com');
  });

  it('requires explicit consent', () => {
    expect(SignupSchema.safeParse({ email: 'a@b.vn', consent: false }).success).toBe(false);
    expect(SignupSchema.safeParse({ email: 'a@b.vn' }).success).toBe(false);
  });

  it('rejects bad emails, odd city slugs and a filled honeypot', () => {
    expect(SignupSchema.safeParse({ email: 'not-an-email', consent: true }).success).toBe(false);
    expect(SignupSchema.safeParse({ email: 'a@b.vn', city: 'Hà Nội', consent: true }).success).toBe(false);
    expect(SignupSchema.safeParse({ email: 'a@b.vn', consent: true, website: 'spam' }).success).toBe(false);
  });
});

describe('UnsubscribeSchema', () => {
  it('only accepts 43-char base64url tokens', () => {
    expect(UnsubscribeSchema.safeParse({ token: 'a'.repeat(43) }).success).toBe(true);
    expect(UnsubscribeSchema.safeParse({ token: 'a'.repeat(42) }).success).toBe(false);
    expect(UnsubscribeSchema.safeParse({ token: `${'a'.repeat(42)}/` }).success).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('allows `limit` hits per window, then resets', () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow('ip', 0), allow('ip', 10), allow('ip', 20)]).toEqual([true, true, false]);
    expect(allow('other', 20)).toBe(true);
    expect(allow('ip', 1001)).toBe(true);
  });
});
