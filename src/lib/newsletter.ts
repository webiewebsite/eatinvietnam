import { z } from 'zod';

/** Bump when the consent wording in WaitlistForm changes; stored with each sign-up. */
export const CONSENT_TEXT = 'waitlist-v1';

export const SignupSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  city: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional()
    .nullable(),
  consent: z.literal(true),
  website: z.string().max(0).optional().nullable(), // honeypot must stay empty
});
export type Signup = z.infer<typeof SignupSchema>;

/** Lower-cases the whole address: providers treat local parts case-insensitively in practice. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const UnsubscribeSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export { createRateLimiter } from '@/lib/rate-limit';
