import api from './api';

export const ledgerService = {
    getBalances: () => api.get('/ledger/balances'),
    getLines: (params) => api.get('/ledger/lines', { params })
};