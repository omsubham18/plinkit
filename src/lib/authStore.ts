import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { isInAppBrowser } from './inAppBrowser';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: (returnTo?: string) => Promise<{ blockedInApp?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,

  signInWithGoogle: async (returnTo) => {
    if (isInAppBrowser()) {
      return { blockedInApp: true };
    }

    try {
      const destination = returnTo || window.location.pathname || '/checkout';
      sessionStorage.setItem('plinkit-return-to', destination);

      const redirectUrl = `${window.location.origin}${destination}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to start Google sign-in',
      };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (err) {
      console.error('Error signing out:', err);
    }
  },

  initializeAuth: () => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));
