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

    updateAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);

        return api.patch('/users/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    submitKyc: (formData) => {
        return api.patch('/users/me/kyc', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    // Xóa/Khóa người dùng
    delete: (id) => {
        return api.delete(`/users/${id}`);
    }
};