import type { VehicleType } from '@prisma/client';
import { prisma } from './prismaClient.js';
import { haversineKm } from './geo.js';

export interface NearbyDriver {
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

const AVG_CITY_SPEED_KMH = 25;

export async function findNearbyDrivers(
  lat: number,
  lng: number,
  vehicleType: VehicleType,
  limit = 5,
): Promise<NearbyDriver[]> {
  const drivers = await prisma.driverProfile.findMany({
    where: {
      isAvailable: true,
      vehicleType,
      currentLat: { not: null },
      currentLng: { not: null },
    },
    include: { user: true },
  });

  return drivers
    .map((d) => {
      const distanceKm = haversineKm(lat, lng, d.currentLat!, d.currentLng!);
      return {
        userId: d.userId,
        name: d.user.name,
        vehiclePlate: d.vehiclePlate,
        vehicleModel: d.vehicleModel,
        vehicleType: d.vehicleType,
        currentLat: d.currentLat!,
        currentLng: d.currentLng!,
        distanceKm: Math.round(distanceKm * 10) / 10,
        etaMin: Math.max(1, Math.round((distanceKm / AVG_CITY_SPEED_KMH) * 60)),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
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

/**
 * Lists every driver of a given vehicle type regardless of online status or
 * recorded location — a scheduled reservation can be sent to a driver who
 * happens to be offline right now but may well be on shift by the pickup time.
 */
export async function findAllDriversForReservation(
  vehicleType: VehicleType,
  lat?: number,
  lng?: number,
): Promise<ReservationDriverOption[]> {
  const drivers = await prisma.driverProfile.findMany({
    where: { vehicleType },
    include: { user: true },
  });

  const hasOrigin = typeof lat === 'number' && typeof lng === 'number';

  return drivers
    .map((d) => {
      const hasLocation = hasOrigin && d.currentLat !== null && d.currentLng !== null;
      const distanceKm = hasLocation ? haversineKm(lat!, lng!, d.currentLat!, d.currentLng!) : null;
      return {
        userId: d.userId,
        name: d.user.name,
        vehiclePlate: d.vehiclePlate,
        vehicleModel: d.vehicleModel,
        vehicleType: d.vehicleType,
        isAvailable: d.isAvailable,
        distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
        etaMin: distanceKm !== null ? Math.max(1, Math.round((distanceKm / AVG_CITY_SPEED_KMH) * 60)) : null,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name);
    });
}
