import api from './api';

export const disbursementService = {
    // 1. TNV xin giải ngân
    requestDisbursement: (campaignId, data) => api.post(`/disbursements/campaign/${campaignId}/request`, data),

    // 2. Lấy danh sách giải ngân của 1 chiến dịch
    getByCampaign: (campaignId) => api.get(`/disbursements/campaign/${campaignId}`),

    // 3. TNV up hóa đơn (Dùng FormData vì có up file)
    uploadProofs: (disbursementId, formData) => api.post(`/disbursements/${disbursementId}/proofs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    getAllForAdmin: (params) => api.get('/disbursements', { params }),

    approveOrReject: (id, payload) => api.patch(`/disbursements/${id}/approve`, payload),

    confirmTransfer: (id, txReference) => api.patch(`/disbursements/${id}/transfer`, { txReference }),

    auditProof: (proofId, payload) => api.patch(`/disbursements/proofs/${proofId}/audit`, payload),

    getPublicTransparency: (campaignId) => api.get(`/disbursements/campaign/${campaignId}/public-transparency`),

    verifySignature: (proofId) => api.post(`/disbursements/proofs/${proofId}/verify-signature`),

    resolveFlaggedProof: (proofId, payload) => api.post(`/disbursements/${proofId}/resolve-flag`, payload),

};