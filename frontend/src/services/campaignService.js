import api from './api';

export const campaignService = {
    createCampaign: (formData) => api.post('/campaigns', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),

    getAllForAd: (params) => api.get('/campaigns', { params }),
    approveCampaign: (id) => api.patch(`/campaigns/${id}/approve`),
    rejectCampaign: (id, reason) => api.patch(`/campaigns/${id}/reject`, { reason }),

    getUrgent: () => api.get('/campaigns/urgent'),

    search: (keyword = '', category = '', status = '', sort = 'DESC', page = 1, limit = 20) =>
        api.get('/campaigns/search', {
            params: { keyword, category, status, sort, page, limit }
        }),

    getAll: () => {
        return api.get('/campaigns');
    },

    getById: (id) => api.get(`/campaigns/${id}`),

    createDonations: (campaignId, body) => api.post(`/campaigns/${campaignId}/donations`, body),

    getDonations: (id) => api.get(`/donations/campaign/${id}`),

    checkPaymentStatus: (txReference) => api.get(`/donations/status/${txReference}`),

    cancelDonation: (txReference) => api.post(`/donations/cancel/${txReference}`),

    getStatements: (params) => api.get('/donations/statement', { params }),

    getMyCampaigns: () => api.get('/campaigns/me'),

    cancelAndReallocate: (id, reason) => api.patch(`/campaigns/${id}/cancel-reallocate`, { reason }),
};