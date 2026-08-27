import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, requireRole('RIDER'), async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { riderId: req.auth!.userId },
    include: { driver: { include: { driverProfile: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    favorites: favorites
      .filter((f) => f.driver.driverProfile)
      .map((f) => ({
        driverId: f.driverId,
        name: f.driver.name,
        vehiclePlate: f.driver.driverProfile!.vehiclePlate,
        vehicleModel: f.driver.driverProfile!.vehicleModel,
        vehicleType: f.driver.driverProfile!.vehicleType,
        isAvailable: f.driver.driverProfile!.isAvailable,
      })),
  });
});

favoritesRouter.post('/', requireAuth, requireRole('RIDER'), async (req, res) => {
  const { driverId } = req.body ?? {};
  if (typeof driverId !== 'string') {
    res.status(400).json({ error: 'driverId zorunludur.' });
    return;
  }

  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverId } });
  if (!driverProfile) {
    res.status(404).json({ error: 'Şoför bulunamadı.' });
    return;
  }

  await prisma.favorite.upsert({
    where: { riderId_driverId: { riderId: req.auth!.userId, driverId } },
    create: { riderId: req.auth!.userId, driverId },
    update: {},
  });
  res.status(204).end();
});

favoritesRouter.delete('/:driverId', requireAuth, requireRole('RIDER'), async (req, res) => {
  await prisma.favorite.deleteMany({ where: { riderId: req.auth!.userId, driverId: req.params.driverId } });
  res.status(204).end();
});
