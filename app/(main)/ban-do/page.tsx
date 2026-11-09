import type { Metadata } from 'next';
import { MapExplorer } from '@/components/map/MapExplorer';
import { currentDate } from '@/lib/hours';
import { getViewerLocation } from '@/lib/location-server';
import { searchRestaurants, toCard } from '@/lib/restaurants';
import { readSearchParams } from '@/lib/search/url';

export const metadata: Metadata = {
  title: 'Bản đồ món ngon',
  description: 'Xem quán ăn ngon quanh bạn trên bản đồ: lọc theo món, giá, giờ mở.',
};

// API contract for the real data source: GET /api/search?bbox=&dish=&open= returns ≤ 50 restaurants.
const MAX_PINS = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MapPage({ searchParams }: Props) {
  const { q, filters } = readSearchParams(await searchParams);
  const now = currentDate();
  const { items } = await searchRestaurants(filters, { origin: await getViewerLocation(), now, limit: MAX_PINS });
  return <MapExplorer cards={items.map((h) => toCard(h, now))} filters={filters} q={q} />;
}
