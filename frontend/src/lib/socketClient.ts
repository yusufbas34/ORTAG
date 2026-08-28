import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
const readyListeners = new Set<(socket: Socket) => void>();

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io({ withCredentials: true });
  readyListeners.forEach((cb) => cb(socket!));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// Components attach their listeners in a `useEffect` that runs once on
// mount, but `connectSocket()` (called from the auth store once `/auth/me`
// resolves) can finish a tick later than that — a plain `getSocket()` read
// at mount can see `null` and permanently skip attaching, silently missing
// every realtime event for that screen's lifetime. This calls `cb` right
// away if a socket already exists, and again the moment one is created.
export function onSocketReady(cb: (socket: Socket) => void): () => void {
  if (socket) cb(socket);
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}
