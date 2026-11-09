import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
}

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  /** Short-lived access token — kept in memory only (never in localStorage). */
  accessToken: string | null;
  user: SessionUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'unknown',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}));
