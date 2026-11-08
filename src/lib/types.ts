export type RestaurantStatus = 'draft' | 'pending' | 'verified' | 'temp_closed' | 'closed';

/** One opening window on one weekday. `close <= open` means the window runs past midnight. */
export interface OpeningSlot {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit?: { name: string; url: string };
}

export interface MenuItem {
  name: string;
  desc?: string;
  price: number;
  group: string;
  /** Editor's pick ("Đáng thử"). Replaces review-based "N người khen" until phase 2. */
  mustTry?: boolean;
  photo?: Photo;
}

export interface Restaurant {
  slug: string;
  name: string;
  status: RestaurantStatus;
  /** Primary dish slug (taxonomy) — drives breadcrumb and the map pin label. */
  dish: string;
  dishes: string[];
  district: string;
  venueType: string;
  address: string;
  lat: number;
  lng: number;
  priceMin: number | null;
  priceMax: number | null;
  priceUpdatedAt: string; // ISO date
  /** Last on-site/phone verification by an editor (ISO date). Overdue after REVERIFY_DAYS. */
  verifiedAt: string;
  /** Editorial rating until user reviews ship (phase 2). */
  rating: { avg: number; count: number };
  editorPick: boolean;
  highlight: string;
  tip?: string;
  features: string[];
  amenities: string[];
  busyHint?: string;
  hours: OpeningSlot[];
  photos: Photo[];
  menu: MenuItem[];
  phone?: string;
  grabUrl?: string;
  shopeeUrl?: string;
  isDemo: true;
}

export interface SearchFilters {
  terms: string[];
  dishes: string[];
  group?: string;
  district?: string;
  priceMax?: number;
  radiusKm?: number;
  openNow?: boolean;
  lateNight?: boolean;
  sort?: 'distance' | 'rating';
}
