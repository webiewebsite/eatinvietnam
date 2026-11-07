import type { Ref } from 'react';
import type { BBox, LatLng } from '@/lib/geo';
import type { CardData } from '@/lib/restaurants';

export interface MapHandle {
  /** Current visible bounds (for "Tìm trong khu vực này"). */
  getBounds: () => BBox;
}

export interface MapViewProps {
  ref?: Ref<MapHandle>;
  cards: CardData[];
  selected: string | null;
  onSelect: (slug: string) => void;
  user: LatLng | null;
  /** Called after the user pans/zooms the map. */
  onMoved: () => void;
}
