import api from './api';

export const profileService = {
    // Lấy thông tin chi tiết của user hiện tại
    getMe: () => api.get('/auth/me'),

    // Cập nhật thông tin cơ bản
    updateInfo: (data) => api.patch('/users/profile', data),

    // Gửi hồ sơ KYC (Ảnh CMND/CCCD, v.v.)
    submitKYC: (formData) => {
        return api.post('/users/kyc', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};