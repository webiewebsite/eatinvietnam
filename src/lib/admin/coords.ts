/**
 * Reads coordinates pasted by an editor: "10.7769, 106.7009", a Google Maps link
 * (…/@10.7769,106.7009,17z, …?q=10.77,106.70, …!3d10.77!4d106.70) or an OSM link
 * (…#map=18/10.77/106.70, …?mlat=10.77&mlon=106.70). Pure, used by the admin form.
 */
export interface Coords {
  lat: number;
  lng: number;
}

const inVietnam = (c: Coords) => c.lat >= 8 && c.lat <= 23.5 && c.lng >= 102 && c.lng <= 110;
const num = '(-?\\d{1,3}(?:\\.\\d+)?)';

export function parseCoords(input: string): Coords | null {
  let s = input.trim().replace(/\+/g, ' ');
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep the raw text: a stray "%" is not a reason to fail
  }
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`), // Google place pin (most precise in share links)
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&](?:q|query|ll|destination)=${num},\\s*${num}`),
    new RegExp(`mlat=${num}&mlon=${num}`),
    new RegExp(`#map=\\d+/${num}/${num}`),
    new RegExp(`^${num}\\s*[,;\\s]\\s*${num}$`),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const c = { lat: Number(m[1]), lng: Number(m[2]) };
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      if (inVietnam(c)) return c;
      // Pasted the other way round ("106.70, 10.77").
      const swapped = { lat: c.lng, lng: c.lat };
      if (inVietnam(swapped)) return swapped;
    }
  }
  return null;
}

/** HCMC launch area (rough), for a soft warning — other cities come later. */
export const inHcmc = (c: Coords) => c.lat >= 10.35 && c.lat <= 11.2 && c.lng >= 106.35 && c.lng <= 107.05;

export const googleMapsLink = (c: Coords) => `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
