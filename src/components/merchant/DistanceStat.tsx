'use client';

import { useState } from 'react';
import { distanceFields } from '@/lib/distance';
import { scooterMinutes, type LatLng } from '@/lib/geo';
import { requestViewerLocation, useViewerLocation } from '@/lib/location-client';

/**
 * Distance cell of the merchant stat strip. The page is ISR (no cookies on the server),
 * so the distance is computed here from the same rounded location every other screen uses.
 */
export function DistanceStat({ place }: { place: LatLng }) {
  const origin = useViewerLocation();
  const [asking, setAsking] = useState(false);
  const { distance, distanceLabel } = distanceFields(origin, place);

  if (distance == null) {
    return (
      <>
        <dd className="font-display text-[17px] font-extrabold text-muted">—</dd>
        <dd>
          <button
            type="button"
            disabled={asking}
            onClick={async () => {
              setAsking(true);
              try {
                await requestViewerLocation();
              } catch {
                // denied/unavailable: keep showing the button
              } finally {
                setAsking(false);
              }
            }}
            className="min-h-6 text-badge font-semibold text-thanhlong underline underline-offset-2"
          >
            {asking ? 'đang lấy…' : 'xem khoảng cách'}
          </button>
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
