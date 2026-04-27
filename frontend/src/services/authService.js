import api from './api';

export const authService = {
    // Đăng nhập
    login: (credentials) => {
        return api.post('/auth/login', credentials);
    },

    // Đăng ký
    register: (userData) => {
        return api.post('/auth/register', userData);
    },

    // Quên mật khẩu
    forgotPassword: (email) => {
        return api.post('/auth/forgot-password', { email });
    },

    // Lấy thông tin user hiện tại
    getMe: () => {
        return api.get('/auth/me');
    }
};