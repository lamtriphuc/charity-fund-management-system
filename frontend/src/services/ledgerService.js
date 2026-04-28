import api from './api';

export const ledgerService = {
    // Lấy toàn bộ giao dịch sổ cái
    getAllTransactions: (params) => {
        return api.get('/ledger/transactions', { params });
    },
    // Lấy số dư các tài khoản tổng quát (Cash, Fund, Expense)
    getAccountBalances: () => {
        return api.get('/ledger/balances');
    }
};