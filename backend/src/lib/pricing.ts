import type { PricingConfig, VehicleType } from '@prisma/client';
import { prisma } from './prismaClient.js';

const PRICING_SINGLETON_ID = 'singleton';

export const VEHICLE_TYPE_MULTIPLIER: Record<VehicleType, number> = {
  STANDARD: 1,
  XL: 1.5,
};

export async function getActivePricingConfig(): Promise<PricingConfig> {
  const existing = await prisma.pricingConfig.findUnique({ where: { id: PRICING_SINGLETON_ID } });
  if (existing) {
    return existing;
  }
  return prisma.pricingConfig.create({
    data: { id: PRICING_SINGLETON_ID, baseRatePerKm: 40, adjustmentPercent: 0 },
  });
}

export function computePrice(
  distanceKm: number,
  config: Pick<PricingConfig, 'baseRatePerKm' | 'adjustmentPercent'>,
  vehicleType: VehicleType,
): number {
  const raw =
    distanceKm * config.baseRatePerKm * (1 + config.adjustmentPercent / 100) * VEHICLE_TYPE_MULTIPLIER[vehicleType];
  return Math.round(raw);
}
