import api from './api';


export const auditService = {
    getAuditLogs: (page = 1, limit = 20, keyword = '', startDate = '', endDate = '') => {
        return api.get(`/auditor/audit-logs`, {
            params: { page, limit, keyword, startDate, endDate }
        });
    }
};