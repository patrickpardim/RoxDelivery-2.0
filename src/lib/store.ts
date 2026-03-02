import { create } from 'zustand';
import { supabase } from './supabase';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  setSession: (session: any) => void;
  signOut: () => Promise<void>;
}

// Simple mock store for demo mode
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null, session: null });
  },
}));
