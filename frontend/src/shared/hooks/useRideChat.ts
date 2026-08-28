import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { onSocketReady } from '../../lib/socketClient';
import { playChime } from '../../lib/sound';

export interface RideChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// Owns message history + live socket updates for a single ride's in-app chat.
// Both the rider and driver sides use this the same way — only the
// "otherPartyName" label shown in the UI differs by role.
export function useRideChat(rideId: string | null) {
  const [messages, setMessages] = useState<RideChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const rideIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    rideIdRef.current = rideId;
    setMessages([]);
    setUnreadCount(0);
    setIsOpen(false);
    if (!rideId) return;

    apiClient
      .get<{ messages: RideChatMessage[] }>(`/rides/${rideId}/messages`)
      .then(({ messages }) => setMessages(messages))
      .catch(() => {});
  }, [rideId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // connectSocket() can finish a tick after this hook mounts — a one-shot
    // getSocket() read here could permanently miss attaching this listener.
    const unsubscribeReady = onSocketReady((socket) => {
      function handleMessage(payload: RideChatMessage & { rideId: string }) {
        if (payload.rideId !== rideIdRef.current) return;
        setMessages((prev) => [...prev, payload]);
        if (isOpenRef.current) return;
        setUnreadCount((n) => n + 1);
        playChime();
      }

      socket.on('ride:message', handleMessage);
      cleanup = () => {
        socket.off('ride:message', handleMessage);
      };
    });

    return () => {
      unsubscribeReady();
      cleanup?.();
    };
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(async (body: string) => {
    const trimmed = body.trim();
    if (!rideIdRef.current || !trimmed) return;
    setSending(true);
    try {
      const { message } = await apiClient.post<{ message: RideChatMessage }>(`/rides/${rideIdRef.current}/messages`, {
        body: trimmed,
      });
      setMessages((prev) => [...prev, message]);
    } finally {
      setSending(false);
    }
  }, []);

  return { messages, isOpen, unreadCount, sending, open, close, sendMessage };
}
