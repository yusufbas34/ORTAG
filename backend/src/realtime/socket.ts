import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { UserRole } from '@prisma/client';
import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prismaClient.js';
import { haversineKm, estimateEtaMin } from '../lib/geo.js';

let io: SocketIOServer | null = null;

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token = parseCookie(socket.handshake.headers.cookie, 'auth_token');
    if (!token) {
      next(new Error('unauthorized'));
      return;
    }
    try {
      const payload = verifyAuthToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data as { userId: string; role: UserRole };
    const room = role === 'DRIVER' ? `driver:${userId}` : `rider:${userId}`;
    socket.join(room);

    // Driver's live position while en route — persisted for future nearby
    // searches, and relayed to whichever rider is currently on this driver's
    // active trip so their tracking map can move the car marker in real time.
    if (role === 'DRIVER') {
      socket.on('driver:location', (payload: { lat: number; lng: number }) => {
        if (typeof payload?.lat !== 'number' || typeof payload?.lng !== 'number') return;

        prisma.driverProfile
          .update({
            where: { userId },
            data: { currentLat: payload.lat, currentLng: payload.lng, lastLocationAt: new Date() },
          })
          .catch(() => {});

        prisma.ride
          .findFirst({
            where: { driverId: userId, status: { in: ['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] } },
            select: {
              id: true,
              riderId: true,
              status: true,
              pickupLat: true,
              pickupLng: true,
              dropoffLat: true,
              dropoffLng: true,
            },
          })
          .then((ride) => {
            if (!ride) return;
            // Before pickup the rider cares how far the driver still is from
            // them; once the trip has started, the countdown switches to the
            // remaining distance to the destination instead.
            const target =
              ride.status === 'IN_PROGRESS'
                ? { lat: ride.dropoffLat, lng: ride.dropoffLng }
                : { lat: ride.pickupLat, lng: ride.pickupLng };
            const etaMin = estimateEtaMin(haversineKm(payload.lat, payload.lng, target.lat, target.lng));
            emitToRider(ride.riderId, 'ride:driver_location', { rideId: ride.id, lat: payload.lat, lng: payload.lng, etaMin });
          })
          .catch(() => {});
      });
    }
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO sunucusu henüz başlatılmadı.');
  return io;
}

export function emitToRider(riderId: string, event: string, payload: unknown) {
  getIO().to(`rider:${riderId}`).emit(event, payload);
}

export function emitToDriver(driverId: string, event: string, payload: unknown) {
  getIO().to(`driver:${driverId}`).emit(event, payload);
}
