import type { DispatchMode, PaymentMethod, VehicleType } from '@prisma/client';

export function serializeReservation(reservation: {
  id: string;
  riderId: string;
  assignedDriverId: string | null;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  priceTry: number;
  dispatchMode: DispatchMode;
  scheduledFor: Date;
  status: string;
  paymentMethod: PaymentMethod;
  createdAt: Date;
}) {
  return {
    id: reservation.id,
    riderId: reservation.riderId,
    assignedDriverId: reservation.assignedDriverId,
    pickup: { lat: reservation.pickupLat, lng: reservation.pickupLng, address: reservation.pickupAddress },
    dropoff: { lat: reservation.dropoffLat, lng: reservation.dropoffLng, address: reservation.dropoffAddress },
    vehicleType: reservation.vehicleType,
    distanceKm: reservation.distanceKm,
    durationMin: reservation.durationMin,
    priceTry: reservation.priceTry,
    dispatchMode: reservation.dispatchMode,
    scheduledFor: reservation.scheduledFor,
    status: reservation.status,
    paymentMethod: reservation.paymentMethod,
    createdAt: reservation.createdAt,
  };
}
