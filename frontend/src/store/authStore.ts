import { create } from 'zustand';
import { apiClient, ApiError } from '../lib/apiClient';
import { connectSocket, disconnectSocket } from '../lib/socketClient';

export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'ready';
  error: string | null;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  registerRider: (data: { email: string; password: string; name: string }) => Promise<AuthUser>;
  registerDriver: (data: {
    email: string;
    password: string;
    name: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleType: 'STANDARD' | 'XL';
    iban: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  fetchMe: async () => {
    set({ status: 'loading' });
    try {
      const { user } = await apiClient.get<{ user: AuthUser }>('/auth/me');
      set({ user, status: 'ready' });
      connectSocket();
    } catch {
      set({ user: null, status: 'ready' });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const { user } = await apiClient.post<{ user: AuthUser }>('/auth/login', { email, password });
      set({ user, status: 'ready' });
      connectSocket();
      return user;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Giriş başarısız.';
      set({ error: message });
      throw err;
    }
  },

  registerRider: async (data) => {
    set({ error: null });
    try {
      const { user } = await apiClient.post<{ user: AuthUser }>('/auth/register/rider', data);
      set({ user, status: 'ready' });
      connectSocket();
      return user;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Kayıt başarısız.';
      set({ error: message });
      throw err;
    }
  },

  registerDriver: async (data) => {
    set({ error: null });
    try {
      const { user } = await apiClient.post<{ user: AuthUser }>('/auth/register/driver', data);
      set({ user, status: 'ready' });
      connectSocket();
      return user;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Kayıt başarısız.';
      set({ error: message });
      throw err;
    }
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
    disconnectSocket();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
