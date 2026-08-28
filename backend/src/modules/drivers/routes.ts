import { Router } from 'express';
import type { VehicleType } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { findNearbyDrivers, findAllDriversForReservation } from '../../lib/nearbyDrivers.js';
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

  const riderId = req.auth!.role === 'RIDER' ? req.auth!.userId : undefined;
  const drivers = await findNearbyDrivers(lat, lng, vehicleType as VehicleType, 20, riderId);
  res.json({ drivers });
});

// Used by the reservation flow's manual driver picker — a scheduled pickup is
// in the future, so an offline driver right now is still a valid target.
driversRouter.get('/all', requireAuth, async (req, res) => {
  const vehicleType = req.query.vehicleType;
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;

  if (!VEHICLE_TYPES.includes(vehicleType as VehicleType)) {
    res.status(400).json({ error: 'Geçerli bir vehicleType zorunludur.' });
    return;
  }

  const riderId = req.auth!.role === 'RIDER' ? req.auth!.userId : undefined;
  const drivers = await findAllDriversForReservation(
    vehicleType as VehicleType,
    Number.isFinite(lat) ? lat : undefined,
    Number.isFinite(lng) ? lng : undefined,
    riderId,
  );
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

driversRouter.patch('/me', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const { vehiclePlate, vehicleModel, vehicleType, iban } = req.body ?? {};

  const data: Record<string, string> = {};
  if (vehiclePlate !== undefined) {
    if (typeof vehiclePlate !== 'string' || vehiclePlate.trim().length < 3) {
      res.status(400).json({ error: 'Geçerli bir plaka girin.' });
      return;
    }
    data.vehiclePlate = vehiclePlate.trim().toUpperCase();
  }
  if (vehicleModel !== undefined) {
    if (typeof vehicleModel !== 'string' || vehicleModel.trim().length < 2) {
      res.status(400).json({ error: 'Geçerli bir araç modeli girin.' });
      return;
    }
    data.vehicleModel = vehicleModel.trim();
  }
  if (vehicleType !== undefined) {
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      res.status(400).json({ error: 'Geçerli bir araç tipi girin.' });
      return;
    }
    data.vehicleType = vehicleType;
  }
  if (iban !== undefined) {
    if (typeof iban !== 'string' || iban.trim().length < 15) {
      res.status(400).json({ error: 'Geçerli bir IBAN girin.' });
      return;
    }
    data.iban = iban.trim().toUpperCase();
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Güncellenecek en az bir alan gereklidir.' });
    return;
  }

  const profile = await prisma.driverProfile.update({ where: { userId: req.auth!.userId }, data });
  res.json({ profile });
});

driversRouter.post('/me/availability', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const { isAvailable, lat, lng } = req.body ?? {};
  if (typeof isAvailable !== 'boolean') {
    res.status(400).json({ error: 'isAvailable (boolean) zorunludur.' });
    return;
  }
  const hasLocation = typeof lat === 'number' && typeof lng === 'number';

  const profile = await prisma.driverProfile.update({
    where: { userId: req.auth!.userId },
    data: {
      isAvailable,
      ...(hasLocation ? { currentLat: lat, currentLng: lng, lastLocationAt: new Date() } : {}),
    },
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
