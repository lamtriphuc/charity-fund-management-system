import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 10000,
});

// INTERCEPTOR: Can thiệp vào mọi Request gửi ĐI
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');

        // Nếu có Token, tự động gắn vào Header của Request
        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// INTERCEPTOR: Can thiệp vào mọi Response nhận VỀ
api.interceptors.response.use(
    (response) => {
        // Nếu API gọi thành công, chỉ lấy đúng cục data trả về
        return response.data;
    },
    (error) => {
        // Nếu Backend báo lỗi 401 (Hết hạn Token hoặc Cấm truy cập)
        if (error.response && error.response.status === 401) {
            if (error.config.url !== '/auth/login') {
                console.error('Phiên đăng nhập hết hạn!');
                localStorage.removeItem('access_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;