import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EatInVietnam',
  description: 'Ăn ngon, đúng chất Việt — bắt đầu từ Sài Gòn.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
