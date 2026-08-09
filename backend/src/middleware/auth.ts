import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAuthToken } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  }
}
