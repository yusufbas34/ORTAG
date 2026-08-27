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
  isFavorite: boolean;
}

const AVG_CITY_SPEED_KMH = 25;

async function getFavoriteDriverIds(riderId?: string): Promise<Set<string>> {
  if (!riderId) return new Set();
  const favorites = await prisma.favorite.findMany({ where: { riderId }, select: { driverId: true } });
  return new Set(favorites.map((f) => f.driverId));
}

export async function findNearbyDrivers(
  lat: number,
  lng: number,
  vehicleType: VehicleType,
  limit = 5,
  riderId?: string,
): Promise<NearbyDriver[]> {
  const [drivers, favoriteIds] = await Promise.all([
    prisma.driverProfile.findMany({
      where: {
        isAvailable: true,
        vehicleType,
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: { user: true },
    }),
    getFavoriteDriverIds(riderId),
  ]);

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
        isFavorite: favoriteIds.has(d.userId),
      };
    })
    // Favorite drivers surface first regardless of distance — the rider
    // explicitly asked to be matched with someone they already trust.
    .sort((a, b) => (a.isFavorite === b.isFavorite ? a.distanceKm - b.distanceKm : a.isFavorite ? -1 : 1))
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
  isFavorite: boolean;
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
  riderId?: string,
): Promise<ReservationDriverOption[]> {
  const [drivers, favoriteIds] = await Promise.all([
    prisma.driverProfile.findMany({
      where: { vehicleType },
      include: { user: true },
    }),
    getFavoriteDriverIds(riderId),
  ]);

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
        isFavorite: favoriteIds.has(d.userId),
      };
    })
    .sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name);
    });
}
