'use client';

import { missingForPublish, type RestaurantInputT } from '@/lib/admin/schemas';
import { PhotoManager, type ManagedPhoto } from './PhotoManager';
import { RestaurantForm, type AreaOption } from './RestaurantForm';
import { StatusPanel } from './StatusPanel';

export interface EditorData {
  id: number;
  slug: string;
  status: string;
  slugLocked: boolean;
  verifiedAt: string | null;
  verifiedByName: string | null;
  verificationMethod: string | null;
  reverifyDueAt: string | null;
  input: RestaurantInputT;
  photos: ManagedPhoto[];
}

/** Edit page: form + status/verification + photos; the status panel knows about unsaved edits. */
export function RestaurantEditor({
  data,
  districts,
  wards,
  r2Ready,
  history,
}: {
  data: EditorData;
  districts: AreaOption[];
  wards: string[];
  r2Ready: boolean;
  history: React.ReactNode;
}) {
  return (
    <RestaurantForm
      id={data.id}
      initial={data.input}
      districts={districts}
      wards={wards}
      photos={data.photos.map((p) => ({ id: p.id, alt: p.alt, preview: p.preview }))}
      locked={data.slugLocked}
      slug={data.slug}
      aside={(dirty) => (
        <>
          <StatusPanel
            id={data.id}
            slug={data.slug}
            status={data.status}
            verifiedAt={data.verifiedAt}
            verifiedByName={data.verifiedByName}
            verificationMethod={data.verificationMethod}
            reverifyDueAt={data.reverifyDueAt}
            missing={missingForPublish(data.input)}
            dirty={dirty}
          />
          <PhotoManager restaurantId={data.id} photos={data.photos} r2Ready={r2Ready} />
          {history}
        </>
      )}
    />
  );
}

/** New restaurant: an empty draft (OSM suggestions are added on top in #30). */
export function RestaurantCreator({ districts, wards, defaultDistrict }: { districts: AreaOption[]; wards: string[]; defaultDistrict: string }) {
  return (
    <RestaurantForm
      id={null}
      initial={emptyRestaurant(defaultDistrict)}
      districts={districts}
      wards={wards}
      photos={[]}
      locked={false}
      slug={null}
      aside={() => (
        <p className="rounded-card border border-line bg-surface p-4 text-[14px] text-muted">
          Quán mới được lưu ở trạng thái <b>nháp</b> (chưa hiện trên web). Sau khi lưu bạn thêm ảnh, rồi xác minh để đăng.
        </p>
      )}
    />
  );
}

export const emptyRestaurant = (district: string): RestaurantInputT => ({
  name: '',
  slug: undefined,
  venueType: '',
  address: '',
  lat: Number.NaN,
  lng: Number.NaN,
  district,
  ward: null,
  priceMin: null,
  priceMax: null,
  highlight: '',
  tip: null,
  busyHint: null,
  phone: null,
  grabUrl: null,
  shopeeUrl: null,
  editorPick: false,
  ratingAvg: null,
  ratingCount: 0,
  features: [],
  amenities: [],
  dishes: [],
  primaryDish: null,
  vibes: [],
  hours: [],
  menu: [],
  source: 'editor',
});
