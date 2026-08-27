import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { emitToDriver, emitToRider } from '../../realtime/socket.js';
import { serializeReservation } from '../../lib/serializeReservation.js';
import { sendPushToUser } from '../../lib/push.js';

export const reservationOffersRouter = Router();

reservationOffersRouter.post('/:id/accept', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const offer = await prisma.reservationOffer.findUnique({ where: { id: req.params.id } });
  if (!offer || offer.driverId !== req.auth!.userId) {
    res.status(404).json({ error: 'Talep bulunamadı.' });
    return;
  }

  // Atomic claim — same first-accept-wins pattern used for instant rides.
  const claim = await prisma.reservationOffer.updateMany({
    where: { id: offer.id, status: 'PENDING' },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu talep artık geçerli değil.' });
    return;
  }

  const reservationClaim = await prisma.reservation.updateMany({
    where: { id: offer.reservationId, status: 'PENDING_DISPATCH' },
    data: { status: 'CONFIRMED', assignedDriverId: offer.driverId, confirmedAt: new Date() },
  });

  if (reservationClaim.count === 0) {
    await prisma.reservationOffer.update({ where: { id: offer.id }, data: { status: 'EXPIRED' } });
    res.status(409).json({ error: 'Bu randevu artık aktif değil.' });
    return;
  }

  const otherOffers = await prisma.reservationOffer.findMany({
    where: { reservationId: offer.reservationId, status: 'PENDING' },
  });
  if (otherOffers.length > 0) {
    await prisma.reservationOffer.updateMany({
      where: { id: { in: otherOffers.map((o) => o.id) } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
    for (const other of otherOffers) {
      emitToDriver(other.driverId, 'reservation:offer_closed', { offerId: other.id, reason: 'taken_by_other' });
    }
  }

  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId: offer.driverId },
    include: { user: true },
  });

  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: offer.reservationId } });
  emitToRider(reservation.riderId, 'reservation:status', {
    reservationId: reservation.id,
    status: reservation.status,
    assignedDriverId: reservation.assignedDriverId,
    driver: driverProfile
      ? { name: driverProfile.user.name, vehiclePlate: driverProfile.vehiclePlate, vehicleModel: driverProfile.vehicleModel }
      : null,
  });
  sendPushToUser(reservation.riderId, {
    title: 'Randevun onaylandı!',
    body: driverProfile ? `${driverProfile.user.name} randevunu kabul etti.` : 'Bir şoför randevunu kabul etti.',
  }).catch(() => {});

  res.json({ reservation: serializeReservation(reservation) });
});

reservationOffersRouter.post('/:id/reject', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const offer = await prisma.reservationOffer.findUnique({ where: { id: req.params.id } });
  if (!offer || offer.driverId !== req.auth!.userId) {
    res.status(404).json({ error: 'Talep bulunamadı.' });
    return;
  }

  const claim = await prisma.reservationOffer.updateMany({
    where: { id: offer.id, status: 'PENDING' },
    data: { status: 'REJECTED', respondedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu talep artık geçerli değil.' });
    return;
  }

  res.status(204).end();
});
