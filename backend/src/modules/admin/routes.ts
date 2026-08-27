import { Router } from 'express';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getActivePricingConfig } from '../../lib/pricing.js';

export const adminRouter = Router();

const MIN_ADJUSTMENT_PERCENT = -50;
const MAX_ADJUSTMENT_PERCENT = 200;
const USER_LIST_ROLES: UserRole[] = ['RIDER', 'DRIVER'];

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/users', async (req, res) => {
  const role = req.query.role;
  if (!USER_LIST_ROLES.includes(role as UserRole)) {
    res.status(400).json({ error: 'role RIDER veya DRIVER olmalıdır.' });
    return;
  }

  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const users = await prisma.user.findMany({
    where: {
      role: role as UserRole,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isBanned: u.isBanned,
      bannedReason: u.bannedReason,
      createdAt: u.createdAt,
      vehiclePlate: u.driverProfile?.vehiclePlate ?? null,
      vehicleModel: u.driverProfile?.vehicleModel ?? null,
    })),
  });
});

adminRouter.post('/users/:id/ban', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role === 'ADMIN') {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  const { reason } = req.body ?? {};
  const bannedReason = typeof reason === 'string' && reason.trim().length > 0 ? reason.trim().slice(0, 300) : null;

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { isBanned: true, bannedReason, bannedAt: new Date() },
  });
  res.json({ user: { id: user.id, isBanned: user.isBanned, bannedReason: user.bannedReason } });
});

adminRouter.post('/users/:id/unban', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { isBanned: false, bannedReason: null, bannedAt: null },
  });
  res.json({ user: { id: user.id, isBanned: user.isBanned, bannedReason: user.bannedReason } });
});

adminRouter.get('/pricing', async (_req, res) => {
  const config = await getActivePricingConfig();
  const history = await prisma.pricingConfigHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { updatedBy: { select: { name: true } } },
  });

  res.json({
    config,
    history: history.map((h) => ({
      id: h.id,
      adjustmentPercent: h.adjustmentPercent,
      baseRatePerKm: h.baseRatePerKm,
      updatedByName: h.updatedBy.name,
      createdAt: h.createdAt,
    })),
  });
});

// Completed-ride report for the admin panel — filterable by driver and date
// range, and returned as flat rows so the frontend can export them to CSV
// as-is without any extra shaping.
adminRouter.get('/earnings', async (req, res) => {
  const { driverId, from, to } = req.query;

  const fromDate = typeof from === 'string' && from ? new Date(from) : null;
  const toDate = typeof to === 'string' && to ? new Date(to) : null;

  const rides = await prisma.ride.findMany({
    where: {
      status: 'COMPLETED',
      ...(typeof driverId === 'string' && driverId ? { driverId } : {}),
      ...(fromDate || toDate
        ? {
            completedAt: {
              ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
              ...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      driver: { include: { driverProfile: true } },
      rider: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 500,
  });

  const rows = rides.map((r) => ({
    id: r.id,
    completedAt: r.completedAt,
    driverName: r.driver?.name ?? '—',
    vehiclePlate: r.driver?.driverProfile?.vehiclePlate ?? '—',
    riderName: r.rider.name,
    pickupAddress: r.pickupAddress,
    dropoffAddress: r.dropoffAddress,
    distanceKm: r.distanceKm,
    priceTry: r.priceTry,
    paymentMethod: r.paymentMethod,
  }));

  res.json({
    rows,
    summary: {
      totalRides: rows.length,
      totalRevenue: rows.reduce((sum, r) => sum + r.priceTry, 0),
    },
  });
});

// Simple driver picker for the earnings filter dropdown.
adminRouter.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } });
  res.json({ drivers: drivers.map((d) => ({ userId: d.userId, name: d.user.name, vehiclePlate: d.vehiclePlate })) });
});

adminRouter.post('/pricing', async (req, res) => {
  const { adjustmentPercent } = req.body ?? {};

  if (
    typeof adjustmentPercent !== 'number' ||
    adjustmentPercent < MIN_ADJUSTMENT_PERCENT ||
    adjustmentPercent > MAX_ADJUSTMENT_PERCENT
  ) {
    res.status(400).json({
      error: `adjustmentPercent ${MIN_ADJUSTMENT_PERCENT} ile ${MAX_ADJUSTMENT_PERCENT} arasında bir sayı olmalıdır.`,
    });
    return;
  }

  const current = await getActivePricingConfig();
  const updated = await prisma.pricingConfig.update({
    where: { id: current.id },
    data: { adjustmentPercent, updatedByUserId: req.auth!.userId },
  });

  await prisma.pricingConfigHistory.create({
    data: {
      baseRatePerKm: updated.baseRatePerKm,
      adjustmentPercent: updated.adjustmentPercent,
      updatedByUserId: req.auth!.userId,
    },
  });

  res.json({ config: updated });
});
