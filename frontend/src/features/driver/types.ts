export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface IncomingOffer {
  offerId: string;
  rideId: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  distanceKm: number;
  priceTry: number;
  paymentMethod: 'CASH' | 'IBAN_TRANSFER';
  expiresInSec: number;
}

export interface AcceptedRide {
  id: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  distanceKm: number;
  durationMin: number;
  priceTry: number;
  paymentMethod: 'CASH' | 'IBAN_TRANSFER';
  status: string;
  cancelledReason?: string | null;
}

export interface ReservationSummary {
  id: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  scheduledFor: string;
  distanceKm: number;
  priceTry: number;
  paymentMethod: 'CASH' | 'IBAN_TRANSFER';
  status: string;
}

export interface ReservationOfferItem {
  offerId: string;
  reservation: ReservationSummary;
}

export interface IncomingReservationOffer {
  offerId: string;
  reservationId: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  scheduledFor: string;
  distanceKm: number;
  priceTry: number;
  paymentMethod: 'CASH' | 'IBAN_TRANSFER';
}
