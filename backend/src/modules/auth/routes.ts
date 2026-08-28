import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prismaClient.js';
import { signAuthToken } from '../../lib/jwt.js';
import { sendActivationEmail, sendPasswordResetEmail } from '../../lib/email.js';
import { requireAuth } from '../../middleware/auth.js';
import type { VehicleType } from '@prisma/client';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export const authRouter = Router();

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: import('express').Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function publicUser(user: { id: string; email: string; name: string; role: string; emailVerified: boolean }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified };
}

const VEHICLE_TYPES: VehicleType[] = ['STANDARD', 'XL'];

authRouter.post('/register/rider', async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    res.status(400).json({ error: 'email, password ve name zorunludur.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Bu email zaten kayıtlı.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'RIDER',
      riderProfile: { create: {} },
    },
  });

  await sendActivationEmail(user.email, user.id);

  const token = signAuthToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/register/driver', async (req, res) => {
  const { email, password, name, vehiclePlate, vehicleModel, vehicleType, iban } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof name !== 'string' ||
    typeof vehiclePlate !== 'string' ||
    typeof vehicleModel !== 'string' ||
    typeof iban !== 'string' ||
    !VEHICLE_TYPES.includes(vehicleType)
  ) {
    res.status(400).json({ error: 'email, password, name, vehiclePlate, vehicleModel, vehicleType ve iban zorunludur.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Bu email zaten kayıtlı.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'DRIVER',
      driverProfile: {
        create: { vehiclePlate, vehicleModel, vehicleType, iban, isAvailable: false },
      },
    },
  });

  await sendActivationEmail(user.email, user.id);

  const token = signAuthToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'email ve password zorunludur.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Email veya şifre hatalı.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Email veya şifre hatalı.' });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: user.bannedReason ? `Hesabınız engellendi: ${user.bannedReason}` : 'Hesabınız yönetici tarafından engellendi.' });
    return;
  }

  const token = signAuthToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);
  res.json({ user: publicUser(user) });
});

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'email zorunludur.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond identically whether or not the email is registered —
  // otherwise this endpoint could be used to check which emails have accounts.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });
    sendPasswordResetEmail(user.email, token).catch((err) => console.error('[auth] reset email error', err));
  }

  res.status(204).end();
});

authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'token ve password zorunludur.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
    return;
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı iste.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.status(204).end();
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }
  res.json({ user: publicUser(user) });
});

// Only the display name is editable here — email changes would need a new
// verification round-trip, which is out of scope for now.
authRouter.patch('/me', requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'İsim en az 2 karakter olmalıdır.' });
    return;
  }
  const user = await prisma.user.update({ where: { id: req.auth!.userId }, data: { name: name.trim() } });
  res.json({ user: publicUser(user) });
});
