import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
      return;
    }
    next();
  };
}
