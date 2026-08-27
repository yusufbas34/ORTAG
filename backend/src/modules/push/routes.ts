import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { getVapidPublicKey } from '../../lib/push.js';

export const pushRouter = Router();

pushRouter.get('/public-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

pushRouter.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body ?? {};
  if (
    typeof endpoint !== 'string' ||
    !keys ||
    typeof keys.p256dh !== 'string' ||
    typeof keys.auth !== 'string'
  ) {
    res.status(400).json({ error: 'Geçersiz abonelik verisi.' });
    return;
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: req.auth!.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: req.auth!.userId, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(204).end();
});

pushRouter.post('/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body ?? {};
  if (typeof endpoint === 'string') {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.auth!.userId } });
  }
  res.status(204).end();
});
