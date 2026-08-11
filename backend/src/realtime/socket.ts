import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { UserRole } from '@prisma/client';
import { verifyAuthToken } from '../lib/jwt.js';

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
