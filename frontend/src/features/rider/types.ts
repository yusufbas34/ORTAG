export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

export type VehicleType = 'STANDARD' | 'XL';

export interface VehicleQuote {
  vehicleType: VehicleType;
  priceTry: number;
}

export interface QuoteResponse {
  distanceKm: number;
  durationMin: number;
  quotes: VehicleQuote[];
  routeGeometry: { type: 'LineString'; coordinates: [number, number][] };
}
