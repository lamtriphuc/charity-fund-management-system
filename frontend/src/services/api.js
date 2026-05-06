import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 20000,
    // BẮT BUỘC CÓ: Để Axios tự động gửi cookie refresh_token lên Backend
    withCredentials: true,
});

// Các biến dùng để xử lý hàng đợi khi refresh token
let isRefreshing = false;
let failedQueue = [];

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

        // Nếu lỗi 401, chưa từng retry và không phải là gọi API login/refresh
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {

            // Nếu ĐANG có 1 request khác gọi refresh rồi, ta cho request này vào hàng đợi
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return api(originalRequest); // Gọi lại API ban đầu
                    })
                    .catch((err) => Promise.reject(err));
            }

            // Bắt đầu quá trình refresh
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Gọi API cấp lại token (Cookie tự động được gửi ngầm do withCredentials: true)
                const res = await api.post('/auth/refresh');

                // Backend của bạn trả về { access_token: ... }
                const newToken = res.access_token;

                // Lưu token mới
                localStorage.setItem('access_token', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                // Giải phóng hàng đợi, cho các API khác chạy tiếp
                processQueue(null, newToken);

                // Gọi lại API vừa bị fail
                return api(originalRequest);

            } catch (refreshError) {
                // THẤT BẠI: Hết hạn cả Refresh Token
                processQueue(refreshError, null);
                localStorage.removeItem('access_token');

                // --- XỬ LÝ CHUYỂN HƯỚNG THÔNG MINH ---
                // Khai báo các trang KHÔNG CẦN đăng nhập (Public pages)
                const publicPaths = ['/', '/login', '/register', '/campaigns'];
                const currentPath = window.location.pathname;

                // Kiểm tra xem trang hiện tại có bắt đầu bằng các path public không
                const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith('/campaigns'));

                if (!isPublicPage) {
                    // Nếu đang ở trang yêu cầu đăng nhập (Profile, Dashboard...) -> Đá ra Login
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục!');
                    window.location.href = '/login';
                } else {
                    // Nếu đang ở trang chủ/khám phá -> Chỉ báo lỗi nhẹ, không đá ra login
                    console.warn('Đã tự động đăng xuất do hết hạn phiên làm việc.');
                    // Tùy chọn: Bạn có thể gọi 1 hàm trigger event để React set state user = null ở đây
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;