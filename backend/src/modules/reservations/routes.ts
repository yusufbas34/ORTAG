import { Router } from 'express';
import type { DispatchMode, PaymentMethod, VehicleType } from '@prisma/client';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getRoute } from '../../lib/osrmClient.js';
import { getActivePricingConfig, computePrice } from '../../lib/pricing.js';
import { dispatchReservation } from '../../lib/reservationDispatch.js';
import { serializeReservation } from '../../lib/serializeReservation.js';

export const reservationsRouter = Router();

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

reservationsRouter.post('/', requireAuth, requireRole('RIDER'), async (req, res) => {
  const { pickup, dropoff, vehicleType, dispatchMode, directDriverIds, paymentMethod, scheduledFor } =
    req.body ?? {};

  if (
    !isLocationPoint(pickup) ||
    !isLocationPoint(dropoff) ||
    !VEHICLE_TYPES.includes(vehicleType) ||
    !DISPATCH_MODES.includes(dispatchMode) ||
    !PAYMENT_METHODS.includes(paymentMethod) ||
    typeof scheduledFor !== 'string'
  ) {
    res.status(400).json({
      error: 'pickup, dropoff, vehicleType, dispatchMode, paymentMethod ve scheduledFor zorunludur.',
    });
    return;
  }

  const scheduledDate = new Date(scheduledFor);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
    res.status(400).json({ error: 'scheduledFor gelecekte bir tarih olmalıdır.' });
    return;
  }

  if (dispatchMode === 'DIRECT' && (!Array.isArray(directDriverIds) || directDriverIds.length === 0)) {
    res.status(400).json({ error: 'DIRECT modda en az bir directDriverIds zorunludur.' });
    return;
  }

  try {
    const route = await getRoute(pickup, dropoff);
    const pricingConfig = await getActivePricingConfig();
    const priceTry = computePrice(route.distanceKm, pricingConfig, vehicleType);

    const reservation = await prisma.reservation.create({
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
        scheduledFor: scheduledDate,
        paymentMethod,
        routeGeometry: route.geometry,
        status: 'PENDING_DISPATCH',
      },
    });

    const { dispatched } = await dispatchReservation({
      reservationId: reservation.id,
      vehicleType,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dispatchMode,
      directDriverIds,
    });

    const finalReservation = dispatched
      ? reservation
      : await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    res.status(201).json({ reservation: serializeReservation(finalReservation) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Randevu oluşturulamadı.' });
  }
});

reservationsRouter.get('/mine', requireAuth, requireRole('RIDER'), async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { riderId: req.auth!.userId },
    orderBy: { scheduledFor: 'asc' },
  });
  res.json({ reservations: reservations.map(serializeReservation) });
});

const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const;

// Past reservations for either side, mirroring /rides/history's shape.
reservationsRouter.get('/history', requireAuth, async (req, res) => {
  const { userId, role } = req.auth!;
  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: [...HISTORY_STATUSES] },
      ...(role === 'DRIVER' ? { assignedDriverId: userId } : { riderId: userId }),
    },
    orderBy: { scheduledFor: 'desc' },
    take: 50,
  });
  res.json({ reservations: reservations.map(serializeReservation) });
});

reservationsRouter.get('/:id', requireAuth, async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation || (reservation.riderId !== req.auth!.userId && reservation.assignedDriverId !== req.auth!.userId)) {
    res.status(404).json({ error: 'Randevu bulunamadı.' });
    return;
  }
  res.json({ reservation: serializeReservation(reservation) });
});

reservationsRouter.post('/:id/cancel', requireAuth, async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation || reservation.riderId !== req.auth!.userId) {
    res.status(404).json({ error: 'Randevu bulunamadı.' });
    return;
  }

  if (['COMPLETED', 'CANCELLED'].includes(reservation.status)) {
    res.status(409).json({ error: 'Bu randevu artık iptal edilemez.' });
    return;
  }

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELLED', cancelledReason: 'Yolcu tarafından iptal edildi' },
    }),
    prisma.reservationOffer.updateMany({
      where: { reservationId: reservation.id, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    }),
  ]);

  res.status(204).end();
});
