import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth/routes.js';
import { geocodeRouter } from './modules/geocode/routes.js';
import { ridesRouter } from './modules/rides/routes.js';

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

  return app;
}
