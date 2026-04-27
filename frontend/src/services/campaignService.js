import api from './api';

export const campaignService = {
    search: (keyword) => {
        return api.get(`/campaigns/search?q=${keyword}`);
    },

    getAll: () => {
        return api.get('/campaigns');
    },

    getById: (id) => api.get(`/campaigns/${id}`),

    getDonations: (id) => api.get(`/donations/campaign/${id}`),
};