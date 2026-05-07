export enum AccountType {
    ASSET = 'ASSET',         // Tài sản (VD: Tiền gửi ngân hàng)
    LIABILITY = 'LIABILITY', // Nợ phải trả (VD: Quỹ chiến dịch giữ hộ)
}

export enum LedgerReferenceType {
    DONATION = 'DONATION',             // Tiền vào (Quyên góp)
    DISBURSEMENT = 'DISBURSEMENT',     // Tiền ra (Giải ngân)
    FUND_TRANSFER = 'FUND_TRANSFER',   // Chuyển tiền nội bộ giữa các quỹ
    REFUND = 'REFUND'
}