import { Router } from 'express';
import type { DispatchMode, PaymentMethod, VehicleType } from '@prisma/client';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getRoute } from '../../lib/osrmClient.js';
import { getActivePricingConfig, computePrice } from '../../lib/pricing.js';
import { dispatchRide } from '../../lib/dispatch.js';
import { serializeRide, serializeDriverInfo } from '../../lib/serializeRide.js';
import { emitToDriver, emitToRider } from '../../realtime/socket.js';
import { sendPushToUser } from '../../lib/push.js';

const ACTIVE_STATUSES = ['REQUESTED', 'DISPATCHING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] as const;
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'] as const;

async function getDriverInfoForRide(driverId: string | null) {
  if (!driverId) return null;
  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId: driverId },
    include: { user: true },
  });
  return driverProfile ? serializeDriverInfo(driverProfile) : null;
}

export const ridesRouter = Router();

const VEHICLE_TYPES: VehicleType[] = ['STANDARD', 'XL'];
const DISPATCH_MODES: DispatchMode[] = ['BROADCAST', 'DIRECT'];
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'IBAN_TRANSFER'];

interface LocationPointInput {
  lat: number;
  lng: number;
  address: string;
}

function isLocationPoint(value: unknown): value is LocationPointInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.lat === 'number' && typeof v.lng === 'number' && typeof v.address === 'string';
}

ridesRouter.post('/quote', requireAuth, requireRole('RIDER'), async (req, res) => {
  const { pickup, dropoff } = req.body ?? {};

  if (!isLocationPoint(pickup) || !isLocationPoint(dropoff)) {
    res.status(400).json({ error: 'pickup ve dropoff (lat, lng, address) zorunludur.' });
    return;
  }

  try {
    const route = await getRoute(pickup, dropoff);
    const pricingConfig = await getActivePricingConfig();

    const quotes = VEHICLE_TYPES.map((vehicleType) => ({
      vehicleType,
      priceTry: computePrice(route.distanceKm, pricingConfig, vehicleType),
    }));

    res.json({
      distanceKm: Math.round(route.distanceKm * 10) / 10,
      durationMin: Math.round(route.durationMin),
      quotes,
      routeGeometry: route.geometry,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Rota/fiyat hesaplanamadı.' });
  }
});

ridesRouter.post('/', requireAuth, requireRole('RIDER'), async (req, res) => {
  const { pickup, dropoff, vehicleType, dispatchMode, directDriverId, paymentMethod } = req.body ?? {};

  if (
    !isLocationPoint(pickup) ||
    !isLocationPoint(dropoff) ||
    !VEHICLE_TYPES.includes(vehicleType) ||
    !DISPATCH_MODES.includes(dispatchMode) ||
    !PAYMENT_METHODS.includes(paymentMethod)
  ) {
    res.status(400).json({ error: 'pickup, dropoff, vehicleType, dispatchMode ve paymentMethod zorunludur.' });
    return;
  }

  if (dispatchMode === 'DIRECT' && typeof directDriverId !== 'string') {
    res.status(400).json({ error: 'DIRECT modda directDriverId zorunludur.' });
    return;
  }

  try {
    // Distance/duration/price are always derived server-side — client-submitted
    // values are never trusted, to prevent fare tampering.
    const route = await getRoute(pickup, dropoff);
    const pricingConfig = await getActivePricingConfig();
    const priceTry = computePrice(route.distanceKm, pricingConfig, vehicleType);

    const ride = await prisma.ride.create({
      data: {
        riderId: req.auth!.userId,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        dropoffAddress: dropoff.address,
        vehicleType,
        distanceKm: Math.round(route.distanceKm * 10) / 10,
        durationMin: Math.round(route.durationMin),
        priceTry,
        dispatchMode,
        paymentMethod,
        status: 'DISPATCHING',
      },
    });

    const { dispatched } = await dispatchRide({
      rideId: ride.id,
      vehicleType,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dispatchMode,
      directDriverId,
    });

    const finalRide = dispatched ? ride : await prisma.ride.findUniqueOrThrow({ where: { id: ride.id } });
    res.status(201).json({ ride: serializeRide(finalRide) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Yolculuk oluşturulamadı.' });
  }
});

// Restores whichever ride the current user (rider or driver) has in flight —
// used to rebuild the "active ride" view after a page reload, since it can't
// rely on one-time navigation state alone.
ridesRouter.get('/active', requireAuth, async (req, res) => {
  const { userId, role } = req.auth!;
  const ride = await prisma.ride.findFirst({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      ...(role === 'DRIVER' ? { driverId: userId } : { riderId: userId }),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!ride) {
    res.json({ ride: null, driver: null });
    return;
  }

  const driver = await getDriverInfoForRide(ride.driverId);
  res.json({ ride: serializeRide(ride), driver });
});

// Past rides (completed, cancelled, or never matched) for either side — the
// "otherParty" label differs by role since a rider looks up the driver's
// vehicle info while a driver only needs the rider's name.
ridesRouter.get('/history', requireAuth, async (req, res) => {
  const { userId, role } = req.auth!;
  const rides = await prisma.ride.findMany({
    where: {
      status: { in: [...HISTORY_STATUSES] },
      ...(role === 'DRIVER' ? { driverId: userId } : { riderId: userId }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      rider: true,
      driver: { include: { driverProfile: true } },
    },
  });

  res.json({
    rides: rides.map((ride) => ({
      ...serializeRide(ride),
      otherParty:
        role === 'DRIVER'
          ? { name: ride.rider.name }
          : ride.driver
            ? {
                name: ride.driver.name,
                vehiclePlate: ride.driver.driverProfile?.vehiclePlate ?? null,
                vehicleModel: ride.driver.driverProfile?.vehicleModel ?? null,
              }
            : null,
    })),
  });
});

ridesRouter.get('/:id', requireAuth, async (req, res) => {
  const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
  if (!ride || (ride.riderId !== req.auth!.userId && ride.driverId !== req.auth!.userId)) {
    res.status(404).json({ error: 'Yolculuk bulunamadı.' });
    return;
  }
  const driver = await getDriverInfoForRide(ride.driverId);
  res.json({ ride: serializeRide(ride), driver });
});

ridesRouter.post('/:id/arriving', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const claim = await prisma.ride.updateMany({
    where: { id: req.params.id, driverId: req.auth!.userId, status: 'ACCEPTED' },
    data: { status: 'DRIVER_ARRIVING' },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu yolculuk şu an bu durumda güncellenemez.' });
    return;
  }

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: req.params.id } });
  emitToRider(ride.riderId, 'ride:status', { rideId: ride.id, status: 'DRIVER_ARRIVING' });
  sendPushToUser(ride.riderId, { title: 'Şoförün yolda!', body: 'Şoförün sana doğru geliyor.' }).catch(() => {});
  res.json({ ride: serializeRide(ride) });
});

ridesRouter.post('/:id/start', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const claim = await prisma.ride.updateMany({
    where: { id: req.params.id, driverId: req.auth!.userId, status: 'DRIVER_ARRIVING' },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu yolculuk şu an bu durumda güncellenemez.' });
    return;
  }

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: req.params.id } });
  emitToRider(ride.riderId, 'ride:status', { rideId: ride.id, status: 'IN_PROGRESS' });
  res.json({ ride: serializeRide(ride) });
});

ridesRouter.post('/:id/complete', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const claim = await prisma.ride.updateMany({
    where: { id: req.params.id, driverId: req.auth!.userId, status: 'IN_PROGRESS' },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu yolculuk şu an bu durumda güncellenemez.' });
    return;
  }

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: req.params.id } });
  emitToRider(ride.riderId, 'ride:status', { rideId: ride.id, status: 'COMPLETED' });
  sendPushToUser(ride.riderId, { title: 'Yolculuk tamamlandı', body: 'İyi günler dileriz!' }).catch(() => {});
  res.json({ ride: serializeRide(ride) });
});

ridesRouter.post('/:id/cancel', requireAuth, async (req, res) => {
  const { userId, role } = req.auth!;
  const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
  if (!ride || (ride.riderId !== userId && ride.driverId !== userId)) {
    res.status(404).json({ error: 'Yolculuk bulunamadı.' });
    return;
  }

  if (['COMPLETED', 'CANCELLED'].includes(ride.status)) {
    res.status(409).json({ error: 'Bu yolculuk artık iptal edilemez.' });
    return;
  }

  const { reason } = req.body ?? {};
  const cancelledBy = role === 'DRIVER' ? 'Şoför' : 'Yolcu';
  const cancelledReason =
    typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim().slice(0, 300)
      : `${cancelledBy} bir sebep belirtmeden iptal etti`;

  await prisma.$transaction([
    prisma.ride.update({
      where: { id: ride.id },
      data: { status: 'CANCELLED', cancelledReason },
    }),
    prisma.rideOffer.updateMany({
      where: { rideId: ride.id, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    }),
  ]);

  // Let the other party know in real time — the rider needs to stop waiting
  // if the driver cancels, and the driver needs to clear their active ride
  // if the rider cancels.
  if (role === 'DRIVER') {
    emitToRider(ride.riderId, 'ride:status', { rideId: ride.id, status: 'CANCELLED', cancelledReason });
    sendPushToUser(ride.riderId, { title: 'Yolculuk iptal edildi', body: cancelledReason }).catch(() => {});
  } else if (ride.driverId) {
    emitToDriver(ride.driverId, 'ride:status', { rideId: ride.id, status: 'CANCELLED', cancelledReason });
    sendPushToUser(ride.driverId, { title: 'Yolculuk iptal edildi', body: cancelledReason }).catch(() => {});
  }

  res.status(204).end();
});
