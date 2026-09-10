// Google Maps Platform geocoding helpers (Geocoding API).
// Requires VITE_GOOGLE_MAPS_API_KEY in .env and the Geocoding API enabled.
export const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const GEOCODE = 'https://maps.googleapis.com/maps/api/geocode/json';

function short(result) {
  const c = result.address_components || [];
  const pick = (t) => c.find((x) => x.types.includes(t))?.long_name;
  const parts = [
    pick('point_of_interest') || pick('premise') || pick('street_number'),
    pick('route'),
    pick('sublocality') || pick('neighborhood'),
    pick('locality'),
  ].filter(Boolean);
  return parts.slice(0, 3).join(', ') || result.formatted_address;
}

/** Forward-geocode a typed query → [{ lat, lon, display_name }] (Nominatim-shaped). */
export async function geoSearch(query) {
  const q = (query || '').trim();
  if (!q || !GMAPS_KEY) return [];
  const params = new URLSearchParams({
    address: q,
    key: GMAPS_KEY,
    region: 'ph',
    components: 'country:PH',
    language: 'en',
  });
  const res = await fetch(`${GEOCODE}?${params}`);
  const data = await res.json();
  if (data.status !== 'OK') return [];
  return data.results.slice(0, 6).map((r) => ({
    lat: String(r.geometry.location.lat),
    lon: String(r.geometry.location.lng),
    display_name: r.formatted_address,
    short_name: short(r),
  }));
}

/** Reverse-geocode → { display_name }. */
export async function geoReverse(lat, lng) {
  if (!GMAPS_KEY) return { display_name: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` };
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: GMAPS_KEY, language: 'en' });
  const res = await fetch(`${GEOCODE}?${params}`);
  const data = await res.json();
  const r = data.results?.[0];
  return { display_name: data.status === 'OK' && r ? r.formatted_address : `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` };
}
