import api from './api';

export const campaignService = {
    getUrgent: () => api.get('/campaigns/urgent'),

    search: (keyword, category) => api.get('/campaigns/search', { params: { keyword, category } }),

    getAll: () => {
        return api.get('/campaigns');
    },

    getById: (id) => api.get(`/campaigns/${id}`),

    createDonations: (campaignId, body) => api.post(`/campaigns/${campaignId}/donations`, body),

    getDonations: (id) => api.get(`/donations/campaign/${id}`),

    checkPaymentStatus: (txReference) => api.get(`/donations/status/${txReference}`),

    cancelDonation: (txReference) => api.post(`/donations/cancel/${txReference}`),

    getStatements: (params) => api.get('/donations/statement', { params }),
};