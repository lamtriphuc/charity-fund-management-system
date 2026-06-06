import api from './api';

export const userService = {
    // Lấy danh sách người dùng
    getAll: (params) => {
        return api.get('/users', { params });
    },

    getProfile: () => api.get('/users/me'),

    updateStatus: (id, status) => {
        return api.patch(`/users/${id}/status`, { status });
    },

    updateRole: (id, roleName) => {
        return api.patch(`/users/${id}/role`, { roleName });
    },

    // Cập nhật trạng thái hoặc quyền hạn
    updateProfile: (data) => {
        return api.patch('/users/me', data);
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
    },

    approveKyc: (kycId, data) => api.patch(`/users/kyc-profiles/${kycId}/approve`, data),

    getMyDonations: () => api.get('/donations/me'),
    getMyKycHistory: () => api.get('/users/me/kyc/history'),

    findKycProfilesForAdmin: (params) => api.get('/users/kyc-profiles', { params }),

    getMyNotifications: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
};