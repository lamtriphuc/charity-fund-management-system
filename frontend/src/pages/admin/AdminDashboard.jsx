import React from 'react';
import { Card, Table, Tag, Button, Statistic } from 'antd';
import { BankOutlined, CheckCircleOutlined, SyncOutlined, DollarOutlined } from '@ant-design/icons';

const AdminDashboard = () => {
    // Dữ liệu mock (Giả lập BE)
    const stats = [
        { title: 'Tổng Quỹ Hệ Thống', value: 15200000000, prefix: '₫', icon: <BankOutlined className="text-brand!" /> },
        { title: 'Chờ Giải Ngân', value: 3, suffix: 'yêu cầu', icon: <SyncOutlined spin className="text-cta!" /> },
        { title: 'Chiến dịch Active', value: 24, icon: <CheckCircleOutlined className="text-green-500!" /> },
        { title: 'Lượt Quyên góp', value: 8430, icon: <DollarOutlined className="text-purple-500!" /> },
    ];

    const disbursementRequests = [
        { id: 'GD01', campaign: 'Lũ lụt miền Trung', amount: 500000000, requestDate: '27/04/2026', status: 'Pending' },
        { id: 'GD02', campaign: 'Phẫu thuật tim bé An', amount: 80000000, requestDate: '26/04/2026', status: 'Pending' },
        { id: 'GD03', campaign: 'Xây cầu bản Pa Tần', amount: 250000000, requestDate: '25/04/2026', status: 'Approved' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-black text-primary! mb-8">Tổng Quan Sổ Cái</h1>

            {/* 4 THẺ THỐNG KÊ (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="rounded-2xl! shadow-sm border-gray-100!">
                        <Statistic
                            title={<span className="text-gray-500 font-bold">{stat.title}</span>}
                            value={stat.value}
                            prefix={stat.icon}
                            suffix={stat.suffix}
                            valueStyle={{ fontWeight: 900, color: '#0F172A', marginTop: '8px' }}
                            formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                        />
                    </Card>
                ))}
            </div>

            {/* BẢNG DUYỆT GIẢI NGÂN (DISBURSEMENT) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-primary! m-0">Yêu cầu Giải ngân chờ duyệt</h2>
                    <Button type="primary" className="bg-primary! border-none! font-bold">Xem tất cả</Button>
                </div>

                <Table
                    dataSource={disbursementRequests}
                    rowKey="id"
                    pagination={false}
                    columns={[
                        { title: 'Mã GD', dataIndex: 'id', key: 'id', render: (text) => <span className="font-bold text-gray-500">{text}</span> },
                        { title: 'Chiến dịch', dataIndex: 'campaign', key: 'campaign', render: (text) => <span className="font-bold text-primary!">{text}</span> },
                        {
                            title: 'Số tiền rút',
                            dataIndex: 'amount',
                            key: 'amount',
                            render: (val) => <span className="text-cta! font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}</span>
                        },
                        { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'requestDate' },
                        {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            key: 'status',
                            render: (status) => (
                                <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${status === 'Pending' ? 'bg-orange-100! text-orange-600!' : 'bg-green-100! text-green-600!'}`}>
                                    {status === 'Pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                                </Tag>
                            )
                        },
                        {
                            title: 'Thao tác',
                            key: 'action',
                            render: (_, record) => (
                                <Button
                                    type="primary"
                                    size="small"
                                    disabled={record.status !== 'Pending'}
                                    className={`font-bold ${record.status === 'Pending' ? 'bg-brand! border-none!' : ''}`}
                                >
                                    Duyệt
                                </Button>
                            )
                        },
                    ]}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;