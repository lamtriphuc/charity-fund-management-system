import api from './api';

export const userService = {
    // Lấy danh sách người dùng
    getAll: (params) => {
        return api.get('/users', { params });
    },
    // Cập nhật trạng thái hoặc quyền hạn
    update: (id, data) => {
        return api.patch(`/users/${id}`, data);
    },
    // Xóa/Khóa người dùng
    delete: (id) => {
        return api.delete(`/users/${id}`);
    }
};