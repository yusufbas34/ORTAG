import { Router } from 'express';
import type { VehicleType } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getRoute } from '../../lib/osrmClient.js';
import { getActivePricingConfig, computePrice } from '../../lib/pricing.js';

export const ridesRouter = Router();

const VEHICLE_TYPES: VehicleType[] = ['STANDARD', 'XL'];

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
