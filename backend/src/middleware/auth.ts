import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prismaClient.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
    return;
  }

  try {
    const payload = verifyAuthToken(token);

    // Checked on every request (not baked into the JWT) so an admin ban takes
    // effect immediately, even for a session token that's still valid.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isBanned: true, bannedReason: true },
    });
    if (!user) {
      res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ error: user.bannedReason ? `Hesabınız engellendi: ${user.bannedReason}` : 'Hesabınız yönetici tarafından engellendi.' });
      return;
    }

    req.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  }
}
