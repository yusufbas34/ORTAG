import type { DispatchMode, VehicleType } from '@prisma/client';
import { prisma } from './prismaClient.js';
import { findNearbyDrivers } from './nearbyDrivers.js';
import { emitToDriver, emitToRider } from '../realtime/socket.js';
import { sendPushToUser } from './push.js';

const DISPATCH_TIMEOUT_MS = 5 * 60 * 1000;
const BROADCAST_CANDIDATE_COUNT = 5;

/**
 * Creates RideOffer rows for the given ride, pushes a `ride:offer` event to
 * each targeted driver, and schedules an expiry timer. If the ride is still
 * unaccepted when the timer fires, it's marked NO_DRIVER_FOUND and any
 * pending offers are closed out.
 */
export async function dispatchRide(params: {
  rideId: string;
  vehicleType: VehicleType;
  pickupLat: number;
  pickupLng: number;
  dispatchMode: DispatchMode;
  directDriverId?: string;
}): Promise<{ dispatched: boolean }> {
  const { rideId, vehicleType, pickupLat, pickupLng, dispatchMode, directDriverId } = params;

  const targetDriverIds: string[] =
    dispatchMode === 'DIRECT' && directDriverId
      ? [directDriverId]
      : (await findNearbyDrivers(pickupLat, pickupLng, vehicleType, BROADCAST_CANDIDATE_COUNT)).map(
          (d) => d.userId,
        );

  if (targetDriverIds.length === 0) {
    const ride = await prisma.ride.update({ where: { id: rideId }, data: { status: 'NO_DRIVER_FOUND' } });
    emitToRider(ride.riderId, 'ride:status', { rideId, status: 'NO_DRIVER_FOUND' });
    sendPushToUser(ride.riderId, { title: 'Uygun şoför bulunamadı', body: 'Şu an yakınında müsait şoför yok, tekrar dene.' }).catch(() => {});
    return { dispatched: false };
  }

  const offers = await Promise.all(
    targetDriverIds.map((driverId) => prisma.rideOffer.create({ data: { rideId, driverId } })),
  );

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });
  for (const offer of offers) {
    emitToDriver(offer.driverId, 'ride:offer', {
      offerId: offer.id,
      rideId: ride.id,
      pickup: { lat: ride.pickupLat, lng: ride.pickupLng, address: ride.pickupAddress },
      dropoff: { lat: ride.dropoffLat, lng: ride.dropoffLng, address: ride.dropoffAddress },
      distanceKm: ride.distanceKm,
      priceTry: ride.priceTry,
      paymentMethod: ride.paymentMethod,
      expiresInSec: DISPATCH_TIMEOUT_MS / 1000,
    });
    // A driver's socket connection drops the moment the app is backgrounded
    // or the phone sleeps — push is the only way a time-sensitive new ride
    // request can still reach them, so this fires alongside the socket event
    // rather than as a fallback for it.
    sendPushToUser(offer.driverId, {
      title: 'Yeni Yolculuk Talebi!',
      body: `${ride.pickupAddress} → ${ride.dropoffAddress} • ₺${ride.priceTry}`,
    }).catch(() => {});
  }

  setTimeout(() => {
    expireRideIfUnaccepted(rideId).catch((err) => console.error('[dispatch] expiry error', err));
  }, DISPATCH_TIMEOUT_MS);

  return { dispatched: true };
}

async function expireRideIfUnaccepted(rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.status !== 'DISPATCHING') return;

  const pendingOffers = await prisma.rideOffer.findMany({ where: { rideId, status: 'PENDING' } });

  await prisma.$transaction([
    prisma.ride.update({ where: { id: rideId }, data: { status: 'NO_DRIVER_FOUND' } }),
    prisma.rideOffer.updateMany({
      where: { rideId, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    }),
  ]);

  emitToRider(ride.riderId, 'ride:status', { rideId, status: 'NO_DRIVER_FOUND' });
  sendPushToUser(ride.riderId, { title: 'Uygun şoför bulunamadı', body: 'Kimse yolculuğunu zamanında kabul etmedi, tekrar dene.' }).catch(() => {});
  for (const offer of pendingOffers) {
    emitToDriver(offer.driverId, 'ride:offer_closed', { offerId: offer.id, reason: 'expired' });
  }
}
