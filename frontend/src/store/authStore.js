import { create } from "zustand";

const useAuthStore = create(set => ({
    user: null,
    isAuthenticated: false,

    // khi đăng nhập
    login: (userData, token) => {
        localStorage.setItem('access_token', token)
        set({ user: userData, isAuthenticated: true })
    },

    logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, isAuthenticated: false });
    },

    // khi F5
    restoreAuth: (userData) => {
        set({ user: userData, isAuthenticated: true });
    }

}))

export default useAuthStore;