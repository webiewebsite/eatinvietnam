import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Bricolage_Grotesque } from 'next/font/google';
import { CookieConsent } from '@/components/CookieConsent';
import { SITE_NAME, SITE_TAGLINE, siteUrl } from '@/lib/seo';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['vietnamese', 'latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--ff-display',
});

const sans = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--ff-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: 'Khám phá quán ăn ngon có tuyển chọn ở Sài Gòn: tìm theo món, giá, giờ mở và vị trí.',
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: 'vi_VN', type: 'website' },
  // Demo data must never be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#FFF8EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
