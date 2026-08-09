export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN';

export type VehicleType = 'STANDARD' | 'XL';

export type PaymentMethod = 'CASH' | 'IBAN_TRANSFER';

export type DispatchMode = 'BROADCAST' | 'DIRECT';

export type RideStatus =
  | 'REQUESTED'
  | 'DISPATCHING'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_FOUND';

export type RideOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type ReservationStatus =
  | 'PENDING_DISPATCH'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPoint extends LatLng {
  address: string;
}

export interface QuoteRequest {
  pickup: LocationPoint;
  dropoff: LocationPoint;
}

export interface VehicleQuote {
  vehicleType: VehicleType;
  priceTry: number;
}

export interface QuoteResponse {
  distanceKm: number;
  durationMin: number;
  quotes: VehicleQuote[];
}

export interface DriverSummary {
  id: string;
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  currentLat: number;
  currentLng: number;
  distanceKm: number;
  etaMin: number;
}

export interface RideDto {
  id: string;
  riderId: string;
  driverId: string | null;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  priceTry: number;
  dispatchMode: DispatchMode;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface ReservationDto extends Omit<RideDto, 'status'> {
  scheduledFor: string;
  status: ReservationStatus;
  assignedDriverId: string | null;
}
