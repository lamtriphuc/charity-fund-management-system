export enum AccountType {
    // 1. ASSET (Tài sản): Tiền thật đang nằm trong các ngân hàng (VD: Vietcombank, Momo)
    // - Tăng ghi Nợ, Giảm ghi Có.
    ASSET = 'ASSET',

    // 2. LIABILITY (Nợ phải trả/Nghĩa vụ): Tiền mà quỹ ĐANG GIỮ HỘ cho các chiến dịch.
    // - Tăng ghi Có, Giảm ghi Nợ.
    LIABILITY = 'LIABILITY',

    // // 3. REVENUE (Doanh thu/Nguồn thu): Tổng tiền Quyên góp nhận được (Dùng để báo cáo).
    // // - Tăng ghi Có, Giảm ghi Nợ.
    // REVENUE = 'REVENUE',

    // // 4. EXPENSE (Chi phí/Giải ngân): Tổng tiền đã chi ra cho Tình nguyện viên/Người thụ hưởng.
    // // - Tăng ghi Nợ, Giảm ghi Có.
    // EXPENSE = 'EXPENSE'
}

export enum LedgerReferenceType {
    DONATION = 'DONATION',             // Tiền vào (Quyên góp)
    DISBURSEMENT = 'DISBURSEMENT',     // Tiền ra (Giải ngân)
    FUND_REALLOCATION = 'FUND_REALLOCATION'
}