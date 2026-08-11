const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

interface OsrmRouteResponse {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: [number, number][] };
  }[];
}

export async function getRoute(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/` +
    `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM isteği başarısız oldu (${res.status}).`);
  }

  const data = (await res.json()) as OsrmRouteResponse;
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Rota bulunamadı.');
  }

  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry,
  };
}
