import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Outgoing mail through the Hostinger mailbox (SMTP_* env vars, set in hPanel).
 * Without them mail is skipped and logged once — features that send mail still work.
 */
const g = globalThis as unknown as { __eivMail?: Transporter | null; __eivMailWarned?: boolean };

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function transporter(): Transporter | null {
  if (g.__eivMail !== undefined) return g.__eivMail;
  if (!mailConfigured()) {
    g.__eivMail = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  g.__eivMail = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return g.__eivMail;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}

/** Never throws: a mail failure must not fail the request that triggered it. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = transporter();
  if (!t) {
    if (!g.__eivMailWarned) console.warn('[mail] SMTP_* not set — skipping outgoing mail');
    g.__eivMailWarned = true;
    return false;
  }
  try {
    await t.sendMail({ from: `EatInVietnam <${process.env.SMTP_USER}>`, ...mail });
    return true;
  } catch (e) {
    console.error('[mail] send failed:', (e as Error).message);
    return false;
  }
}
