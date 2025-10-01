import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { storage } from '@/lib/storage';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => ({
        getItem: () => {
          const authData = storage.getLocal('auth');
          return authData ? JSON.stringify({ state: authData }) : null;
        },
        setItem: (_key: string, value: string) => {
          try {
            const parsed = JSON.parse(value);
            storage.setLocal('auth', parsed.state);
          } catch (error) {
            console.error('Failed to persist auth state:', error);
          }
        },
        removeItem: () => {
          storage.removeLocal('auth');
        },
      })),
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);
