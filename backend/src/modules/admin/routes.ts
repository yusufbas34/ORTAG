import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getActivePricingConfig } from '../../lib/pricing.js';

export const adminRouter = Router();

const MIN_ADJUSTMENT_PERCENT = -50;
const MAX_ADJUSTMENT_PERCENT = 200;

adminRouter.use(requireAuth, requireRole('ADMIN'));

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
