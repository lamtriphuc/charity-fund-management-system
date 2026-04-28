import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, DatePicker, Card, Statistic, Space } from 'antd';
import { SearchOutlined, SwapOutlined, FileProtectOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

const AdminLedger = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([
        { id: 'TX-9901', date: '27/04/2026 14:30', description: 'Quyên góp từ Nguyễn Văn A - Chiến dịch CD001', debit: 500000, credit: 0, account: 'TK Tiền mặt', reference: 'CD001' },
        { id: 'TX-9902', date: '27/04/2026 14:30', description: 'Ghi tăng quỹ chiến dịch CD001', debit: 0, credit: 500000, account: 'TK Quỹ Giáo dục', reference: 'CD001' },
        { id: 'TX-9905', date: '26/04/2026 09:15', description: 'Giải ngân đợt 1 - Xây cầu Pa Tần', debit: 0, credit: 250000000, account: 'TK Tiền mặt', reference: 'CD003' },
        { id: 'TX-9906', date: '26/04/2026 09:15', description: 'Ghi giảm quỹ chiến dịch CD003', debit: 250000000, credit: 0, account: 'TK Quỹ Hạ tầng', reference: 'CD003' },
    ]);

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const columns = [
        {
            title: 'Mã Giao Dịch',
            dataIndex: 'id',
            key: 'id',
            render: (text) => <span className="font-mono! font-bold text-gray-500 text-xs">{text}</span>
        },
        { title: 'Thời gian', dataIndex: 'date', key: 'date', width: 160 },
        {
            title: 'Tài khoản hạch toán',
            dataIndex: 'account',
            key: 'account',
            render: (text) => <Tag className="bg-slate-100! border-none! text-primary! font-semibold px-3">{text}</Tag>
        },
        {
            title: 'Nội dung',
            dataIndex: 'description',
            key: 'description',
            width: '30%',
            render: (text) => <span className="text-primary! font-medium">{text}</span>
        },
        {
            title: 'Nợ (Debit)',
            dataIndex: 'debit',
            key: 'debit',
            align: 'right',
            render: (val) => val > 0 ? <span className="text-green-600! font-bold">+{formatMoney(val)}</span> : '-'
        },
        {
            title: 'Có (Credit)',
            dataIndex: 'credit',
            key: 'credit',
            align: 'right',
            render: (val) => val > 0 ? <span className="text-red-600! font-bold">-{formatMoney(val)}</span> : '-'
        },
        {
            title: 'Đối ứng',
            dataIndex: 'reference',
            key: 'reference',
            align: 'center',
            render: (ref) => <span className="text-brand! font-bold hover:underline cursor-pointer">{ref}</span>
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Sổ Cái Hệ Thống</h1>
                    <p className="text-gray-500 m-0">Dòng tiền chi tiết được hạch toán theo nguyên tắc kế toán kép.</p>
                </div>
                <Tag icon={<FileProtectOutlined />} className="bg-green-50! text-green-600! border-green-200! px-4 py-1 text-sm font-bold">
                    Blockchain Verified
                </Tag>
            </div>

            {/* Thống kê nhanh số dư */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Tổng tiền mặt (Khả dụng)"
                        value={12450000000}
                        valueStyle={{ color: '#0F172A', fontWeight: 900 }}
                        suffix="₫"
                    />
                </Card>
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Tổng nợ phải trả (Quỹ CD)"
                        value={11200000000}
                        valueStyle={{ color: '#2563EB', fontWeight: 900 }}
                        suffix="₫"
                    />
                </Card>
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Thặng dư hệ thống"
                        value={1250000000}
                        valueStyle={{ color: '#F59E0B', fontWeight: 900 }}
                        suffix="₫"
                    />
                </Card>
            </div>

            {/* Bộ lọc */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <Input
                    placeholder="Tìm mã giao dịch, nội dung..."
                    prefix={<SearchOutlined />}
                    className="w-full md:w-80 rounded-lg! h-11"
                />
                <RangePicker className="h-11 rounded-lg!" />
                <Space>
                    <Tag className="px-4 py-1 cursor-pointer bg-brand! text-white! border-none!">Tất cả</Tag>
                    <Tag className="px-4 py-1 cursor-pointer hover:bg-gray-100! transition-colors">Tiền mặt</Tag>
                    <Tag className="px-4 py-1 cursor-pointer hover:bg-gray-100! transition-colors">Quỹ dự phòng</Tag>
                </Space>
            </div>

            {/* Bảng giao dịch */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    pagination={{ pageSize: 10, className: "p-6!" }}
                    className="custom-admin-table"
                />
            </div>
        </div>
    );
};

export default AdminLedger;