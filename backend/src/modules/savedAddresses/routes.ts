import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';

export const savedAddressesRouter = Router();

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

savedAddressesRouter.get('/', requireAuth, async (req, res) => {
  const addresses = await prisma.savedAddress.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ addresses });
});

savedAddressesRouter.post('/', requireAuth, async (req, res) => {
  const { label, ...point } = req.body ?? {};
  if (typeof label !== 'string' || label.trim().length === 0 || !isLocationPoint(point)) {
    res.status(400).json({ error: 'label ve konum (lat, lng, address) zorunludur.' });
    return;
  }

  const address = await prisma.savedAddress.create({
    data: {
      userId: req.auth!.userId,
      label: label.trim().slice(0, 40),
      address: point.address,
      lat: point.lat,
      lng: point.lng,
    },
  });
  res.status(201).json({ address });
});

savedAddressesRouter.delete('/:id', requireAuth, async (req, res) => {
  await prisma.savedAddress.deleteMany({ where: { id: req.params.id, userId: req.auth!.userId } });
  res.status(204).end();
});
