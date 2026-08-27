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

export type PaymentMethod = 'CASH' | 'IBAN_TRANSFER';

export type RideStatus =
  | 'REQUESTED'
  | 'DISPATCHING'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_FOUND';

export interface Ride {
  id: string;
  riderId: string;
  driverId: string | null;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  priceTry: number;
  dispatchMode: 'BROADCAST' | 'DIRECT';
  status: RideStatus;
  paymentMethod: PaymentMethod;
  cancelledReason?: string | null;
  createdAt: string;
}

export interface DriverContactInfo {
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  iban: string;
  currentLat: number | null;
  currentLng: number | null;
}

export interface DriverSummary {
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  currentLat: number;
  currentLng: number;
  distanceKm: number;
  etaMin: number;
}

export interface ReservationDriverOption {
  userId: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  isAvailable: boolean;
  distanceKm: number | null;
  etaMin: number | null;
}

export type ReservationStatus = 'PENDING_DISPATCH' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

export interface Reservation {
  id: string;
  riderId: string;
  assignedDriverId: string | null;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  priceTry: number;
  dispatchMode: 'BROADCAST' | 'DIRECT';
  scheduledFor: string;
  status: ReservationStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}
