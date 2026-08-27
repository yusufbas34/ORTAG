import type { DispatchMode, PaymentMethod, VehicleType } from '@prisma/client';

export type RouteGeometry = { type: 'LineString'; coordinates: [number, number][] };

function asRouteGeometry(value: unknown): RouteGeometry | null {
  if (
    value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'LineString' &&
    Array.isArray((value as { coordinates?: unknown }).coordinates)
  ) {
    return value as RouteGeometry;
  }
  return null;
}

export function serializeDriverInfo(driverProfile: {
  user: { name: string };
  vehiclePlate: string;
  vehicleModel: string;
  iban: string;
  currentLat: number | null;
  currentLng: number | null;
}) {
  return {
    name: driverProfile.user.name,
    vehiclePlate: driverProfile.vehiclePlate,
    vehicleModel: driverProfile.vehicleModel,
    iban: driverProfile.iban,
    currentLat: driverProfile.currentLat,
    currentLng: driverProfile.currentLng,
  };
}

export function serializeRide(ride: {
  id: string;
  riderId: string;
  driverId: string | null;
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
  status: string;
  paymentMethod: PaymentMethod;
  routeGeometry?: unknown;
  cancelledReason?: string | null;
  createdAt: Date;
}) {
  return {
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    pickup: { lat: ride.pickupLat, lng: ride.pickupLng, address: ride.pickupAddress },
    dropoff: { lat: ride.dropoffLat, lng: ride.dropoffLng, address: ride.dropoffAddress },
    vehicleType: ride.vehicleType,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    priceTry: ride.priceTry,
    dispatchMode: ride.dispatchMode,
    status: ride.status,
    paymentMethod: ride.paymentMethod,
    routeGeometry: asRouteGeometry(ride.routeGeometry),
    cancelledReason: ride.cancelledReason ?? null,
    createdAt: ride.createdAt,
  };
}
