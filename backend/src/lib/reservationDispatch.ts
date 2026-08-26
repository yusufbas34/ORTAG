import type { DispatchMode, VehicleType } from '@prisma/client';
import { prisma } from './prismaClient.js';
import { findNearbyDrivers } from './nearbyDrivers.js';
import { emitToDriver } from '../realtime/socket.js';

const BROADCAST_CANDIDATE_COUNT = 5;

/**
 * Creates ReservationOffer rows and pushes a `reservation:offer` event to
 * each targeted driver. Unlike instant rides, there's no short expiry timer
 * here — a scheduled pickup is a future commitment, not an urgent request,
 * so offers stay open until a driver responds or the rider cancels.
 */
export async function dispatchReservation(params: {
  reservationId: string;
  vehicleType: VehicleType;
  pickupLat: number;
  pickupLng: number;
  dispatchMode: DispatchMode;
  directDriverIds?: string[];
}): Promise<{ dispatched: boolean }> {
  const { reservationId, vehicleType, pickupLat, pickupLng, dispatchMode, directDriverIds } = params;

  const targetDriverIds: string[] =
    dispatchMode === 'DIRECT' && directDriverIds
      ? directDriverIds
      : (await findNearbyDrivers(pickupLat, pickupLng, vehicleType, BROADCAST_CANDIDATE_COUNT)).map(
          (d) => d.userId,
        );

  if (targetDriverIds.length === 0) {
    await prisma.reservation.update({ where: { id: reservationId }, data: { status: 'EXPIRED' } });
    return { dispatched: false };
  }

  const offers = await Promise.all(
    targetDriverIds.map((driverId) => prisma.reservationOffer.create({ data: { reservationId, driverId } })),
  );

  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  for (const offer of offers) {
    emitToDriver(offer.driverId, 'reservation:offer', {
      offerId: offer.id,
      reservationId: reservation.id,
      pickup: { lat: reservation.pickupLat, lng: reservation.pickupLng, address: reservation.pickupAddress },
      dropoff: { lat: reservation.dropoffLat, lng: reservation.dropoffLng, address: reservation.dropoffAddress },
      scheduledFor: reservation.scheduledFor,
      distanceKm: reservation.distanceKm,
      priceTry: reservation.priceTry,
      paymentMethod: reservation.paymentMethod,
    });
  }

  return { dispatched: true };
}
