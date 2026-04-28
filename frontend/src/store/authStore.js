import { create } from "zustand";
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    // BỌC TOÀN BỘ LOGIC CŨ VÀO TRONG persist()
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,

            login: (userData, token) => {
                localStorage.setItem('access_token', token);
                set({ user: userData, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('access_token');
                set({ user: null, isAuthenticated: false });
            },

            restoreAuth: (userData) => {
                set({ user: userData, isAuthenticated: true });
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);

export default useAuthStore;