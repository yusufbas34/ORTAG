import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth/routes.js';
import { geocodeRouter } from './modules/geocode/routes.js';
import { ridesRouter } from './modules/rides/routes.js';
import { driversRouter } from './modules/drivers/routes.js';
import { rideOffersRouter } from './modules/rideOffers/routes.js';
import { reservationsRouter } from './modules/reservations/routes.js';
import { reservationOffersRouter } from './modules/reservationOffers/routes.js';
import { adminRouter } from './modules/admin/routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/geocode', geocodeRouter);
  app.use('/api/rides', ridesRouter);
  app.use('/api/drivers', driversRouter);
  app.use('/api/ride-offers', rideOffersRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/reservation-offers', reservationOffersRouter);
  app.use('/api/admin', adminRouter);

  return app;
}
