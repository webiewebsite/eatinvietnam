'use client';

import { useLocationConsent } from '@/components/LocationConsent';
import { distanceFields } from '@/lib/distance';
import { scooterMinutes, type LatLng } from '@/lib/geo';
import { useViewerLocation } from '@/lib/location-client';

/**
 * Distance cell of the merchant stat strip. The page is ISR (no cookies on the server),
 * so the distance is computed here from the same rounded location every other screen uses.
 */
export function DistanceStat({ place }: { place: LatLng }) {
  const origin = useViewerLocation();
  const { ask, sheet } = useLocationConsent();
  const { distance, distanceLabel } = distanceFields(origin, place);

  if (distance == null) {
    return (
      <>
        <dd className="font-display text-[17px] font-extrabold text-muted">—</dd>
        <dd>
          <button
            type="button"
            onClick={() => void ask()}
            className="min-h-6 text-badge font-semibold text-thanhlong underline underline-offset-2"
          >
            xem khoảng cách
          </button>
          {sheet}
        </dd>
      </>
    );
  }

  return (
    <>
      <dd className="font-display text-[17px] font-extrabold">{distanceLabel}</dd>
      <dd className="text-badge text-muted">~{scooterMinutes(distance)} phút xe</dd>
    </>
  );
}
