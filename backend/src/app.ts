import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { favoritesRouter } from './modules/favorites/routes.js';
import { savedAddressesRouter } from './modules/savedAddresses/routes.js';
import { pushRouter } from './modules/push/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend compiles to backend/dist, so the frontend build sits two levels up.
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

export function createApp() {
  const app = express();

  // Railway/most PaaS terminate TLS upstream — trust their proxy so secure
  // cookies and req.protocol behave correctly behind it.
  app.set('trust proxy', 1);

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Railway sets this automatically on every deploy, so the version changes
  // whenever new code ships — no manual bump needed. The frontend uses it to
  // notice a fresh deploy and nudge the user to reload / update the APK.
  app.get('/api/app-version', (_req, res) => {
    res.json({
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      downloadUrl: 'https://github.com/yusufbas34/ORTAG/releases/download/apk-latest/yol.apk',
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/geocode', geocodeRouter);
  app.use('/api/rides', ridesRouter);
  app.use('/api/drivers', driversRouter);
  app.use('/api/ride-offers', rideOffersRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/reservation-offers', reservationOffersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/saved-addresses', savedAddressesRouter);
  app.use('/api/push', pushRouter);

  // In production this single service also serves the built frontend, so
  // one Railway deploy + one HTTPS domain is enough for a real PWA install
  // test — no separate static host or cross-origin cookie/CORS setup needed.
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        next();
        return;
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  return app;
}
