import axios from 'axios';

const url = `${import.meta.env.VITE_API_URL}:${import.meta.env.VITE_PORT}`

const api = axios.create({
    baseURL: url,
    timeout: 20000,
    // BẮT BUỘC CÓ: Để Axios tự động gửi cookie refresh_token lên Backend
    withCredentials: true,
});

// Các biến dùng để xử lý hàng đợi khi refresh token
let isRefreshing = false;
let failedQueue = [];
let isRedirecting = false;

// Hàm xử lý hàng đợi: Khi lấy được token mới, chạy lại các API đang chờ
const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// 1. INTERCEPTOR REQUEST: Tự động đính kèm Access Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. INTERCEPTOR RESPONSE: Bắt lỗi 401 và gọi Refresh Token
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        if (!error.response) {
            return Promise.reject(error);
        }

        const is401 = error.response.status === 401;

        const isAuthRoute =
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh');

        if (!is401 || isAuthRoute) {
            return Promise.reject(error);
        }

        // Tránh loop
        if (originalRequest._retry) {
            return Promise.reject(error);
        }

        // Đang refresh -> queue
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    originalRequest._retry = true;
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        // START REFRESH
        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const res = await api.post('/auth/refresh');

            const newToken = res.accessToken;

            localStorage.setItem('access_token', newToken);

            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            processQueue(null, newToken);
            isRefreshing = false;

            return api(originalRequest);

        } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;

            localStorage.removeItem('access_token');

            // clear zustand persist
            localStorage.removeItem('auth-storage');

            const publicPaths = [
                '/',
                '/login',
                '/register',
            ];

            const currentPath = window.location.pathname;

            const isPublicPage =
                publicPaths.includes(currentPath) ||
                currentPath.startsWith('/campaigns');

            // Chỉ redirect nếu đang ở private page
            if (!isPublicPage && !isRedirecting) {
                isRedirecting = true;

                // Trigger event cho React xử lý
                window.dispatchEvent(new Event('auth-expired'));

                window.location.replace('/login');
                setTimeout(() => { isRedirecting = false; }, 3000);
            }

            return Promise.reject(refreshError);

        }
    }
);

export default api;