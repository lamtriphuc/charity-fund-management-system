import api from './api';

export const analyticService = {
    getDashboardStats: () => {
        return api.get('/admin/dashboard-stats');
    },
    exportDisbursementReport: () => {
        return api.get('/admin/export/disbursements', {
            responseType: 'blob',
        });
    }
};