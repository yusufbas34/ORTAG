import { Router } from 'express';
import { prisma } from '../../lib/prismaClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { emitToDriver, emitToRider } from '../../realtime/socket.js';
import { serializeRide, serializeDriverInfo } from '../../lib/serializeRide.js';
import { sendPushToUser } from '../../lib/push.js';

export const rideOffersRouter = Router();

rideOffersRouter.post('/:id/accept', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const offer = await prisma.rideOffer.findUnique({ where: { id: req.params.id } });
  if (!offer || offer.driverId !== req.auth!.userId) {
    res.status(404).json({ error: 'Talep bulunamadı.' });
    return;
  }

  // Atomic claim: only succeeds if this offer is still PENDING. This is what
  // makes "first accept wins" race-safe across simultaneous driver requests.
  const claim = await prisma.rideOffer.updateMany({
    where: { id: offer.id, status: 'PENDING' },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu talep artık geçerli değil.' });
    return;
  }

  const rideClaim = await prisma.ride.updateMany({
    where: { id: offer.rideId, status: { in: ['REQUESTED', 'DISPATCHING'] } },
    data: { status: 'ACCEPTED', driverId: offer.driverId, acceptedAt: new Date() },
  });

  if (rideClaim.count === 0) {
    // Ride was cancelled (or otherwise resolved) in the moment between offer
    // claim and ride claim — undo the offer so it doesn't look accepted.
    await prisma.rideOffer.update({ where: { id: offer.id }, data: { status: 'EXPIRED' } });
    res.status(409).json({ error: 'Bu yolculuk artık aktif değil.' });
    return;
  }

  const otherOffers = await prisma.rideOffer.findMany({
    where: { rideId: offer.rideId, status: 'PENDING' },
  });
  if (otherOffers.length > 0) {
    await prisma.rideOffer.updateMany({
      where: { id: { in: otherOffers.map((o) => o.id) } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
    for (const other of otherOffers) {
      emitToDriver(other.driverId, 'ride:offer_closed', { offerId: other.id, reason: 'taken_by_other' });
    }
  }

  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId: offer.driverId },
    include: { user: true },
  });

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: offer.rideId } });
  emitToRider(ride.riderId, 'ride:status', {
    rideId: ride.id,
    status: ride.status,
    driverId: ride.driverId,
    driver: driverProfile ? serializeDriverInfo(driverProfile) : null,
  });
  sendPushToUser(ride.riderId, {
    title: 'Şoförün bulundu!',
    body: driverProfile ? `${driverProfile.user.name} yolculuğunu kabul etti.` : 'Şoförün yolculuğunu kabul etti.',
  }).catch(() => {});

  res.json({ ride: serializeRide(ride) });
});

rideOffersRouter.post('/:id/reject', requireAuth, requireRole('DRIVER'), async (req, res) => {
  const offer = await prisma.rideOffer.findUnique({ where: { id: req.params.id } });
  if (!offer || offer.driverId !== req.auth!.userId) {
    res.status(404).json({ error: 'Talep bulunamadı.' });
    return;
  }

  const claim = await prisma.rideOffer.updateMany({
    where: { id: offer.id, status: 'PENDING' },
    data: { status: 'REJECTED', respondedAt: new Date() },
  });
  if (claim.count === 0) {
    res.status(409).json({ error: 'Bu talep artık geçerli değil.' });
    return;
  }

  const ride = await prisma.ride.findUnique({ where: { id: offer.rideId } });
  if (ride && ride.dispatchMode === 'DIRECT' && ride.status === 'DISPATCHING') {
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'NO_DRIVER_FOUND' } });
    emitToRider(ride.riderId, 'ride:status', { rideId: ride.id, status: 'NO_DRIVER_FOUND' });
  }

  res.status(204).end();
});
