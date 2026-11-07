import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EatInVietnam — Ăn ngon, đúng chất Việt',
    short_name: 'EatInVietnam',
    description: 'Khám phá quán ăn ngon có tuyển chọn, bắt đầu từ Sài Gòn.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8EE',
    theme_color: '#FFF8EE',
    lang: 'vi',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
