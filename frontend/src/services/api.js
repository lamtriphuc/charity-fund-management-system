import axios from 'axios';

// Tạo một instance (bản sao) của Axios trỏ thẳng tới Backend của bạn
const api = axios.create({
    baseURL: 'http://localhost:3000', // Đổi port nếu Backend của bạn chạy port khác
    timeout: 10000, // Quá 10s không phản hồi là báo lỗi
});

// INTERCEPTOR: Can thiệp vào mọi Request gửi ĐI
api.interceptors.request.use(
    (config) => {
        // Lấy Token từ LocalStorage (Bạn sẽ lưu nó vào đây lúc Login)
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
            console.error('Phiên đăng nhập hết hạn!');
            // Xóa token cũ đi
            localStorage.removeItem('access_token');
            // Đá người dùng văng ra trang đăng nhập
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;