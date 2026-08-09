const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TAG-ride-app/1.0';

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

interface NominatimSearchItem {
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=tr`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Adres araması başarısız oldu (${res.status}).`);
  }

  const data = (await res.json()) as NominatimSearchItem[];
  return data.map((item) => ({
    address: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const url = `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=json`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Ters adres arama başarısız oldu (${res.status}).`);
  }

  const data = (await res.json()) as { display_name: string };
  return { address: data.display_name, lat, lng };
}
