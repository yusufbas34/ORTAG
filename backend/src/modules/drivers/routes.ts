import { Router } from 'express';
import type { VehicleType } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { findNearbyDrivers } from '../../lib/nearbyDrivers.js';
import { prisma } from '../../lib/prismaClient.js';
import { serializeReservation } from '../../lib/serializeReservation.js';

export const driversRouter = Router();

const VEHICLE_TYPES: VehicleType[] = ['STANDARD', 'XL'];

driversRouter.get('/nearby', requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const vehicleType = req.query.vehicleType;

  if (Number.isNaN(lat) || Number.isNaN(lng) || !VEHICLE_TYPES.includes(vehicleType as VehicleType)) {
    res.status(400).json({ error: 'lat, lng ve geçerli bir vehicleType zorunludur.' });
    return;
  }

  const drivers = await findNearbyDrivers(lat, lng, vehicleType as VehicleType, 20);
  res.json({ drivers });
});

driversRouter.get('/me', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
  if (!profile) {
    res.status(404).json({ error: 'Şoför profili bulunamadı.' });
    return;
  }
  res.json({ profile });
});

driversRouter.post('/me/availability', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const { isAvailable } = req.body ?? {};
  if (typeof isAvailable !== 'boolean') {
    res.status(400).json({ error: 'isAvailable (boolean) zorunludur.' });
    return;
  }

  const profile = await prisma.driverProfile.update({
    where: { userId: req.auth!.userId },
    data: { isAvailable },
  });
  res.json({ profile });
});

driversRouter.get('/me/reservations', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const [pendingOffers, confirmed] = await Promise.all([
    prisma.reservationOffer.findMany({
      where: { driverId: req.auth!.userId, status: 'PENDING' },
      include: { reservation: true },
      orderBy: { sentAt: 'desc' },
    }),
    prisma.reservation.findMany({
      where: { assignedDriverId: req.auth!.userId, status: 'CONFIRMED' },
      orderBy: { scheduledFor: 'asc' },
    }),
  ]);

  res.json({
    pendingOffers: pendingOffers.map((o) => ({
      offerId: o.id,
      reservation: serializeReservation(o.reservation),
    })),
    confirmedReservations: confirmed.map(serializeReservation),
  });
});
