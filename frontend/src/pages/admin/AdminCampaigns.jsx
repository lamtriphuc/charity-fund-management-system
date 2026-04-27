import React, { useState } from 'react';
import { Table, Tag, Button, Input, Select, Space, Dropdown } from 'antd';
import {
    SearchOutlined,
    PlusOutlined,
    MoreOutlined,
    CheckCircleOutlined,
    StopOutlined,
    EyeOutlined
} from '@ant-design/icons';

const { Search } = Input;

const AdminCampaigns = () => {
    // Mock Data
    const [campaigns, setCampaigns] = useState([
        { id: 'CD001', title: 'Xây trường mầm non bản vùng cao', organizer: 'Quỹ Hy Vọng', target: 500000000, current: 350000000, status: 'Active', createdAt: '20/04/2026' },
        { id: 'CD002', title: 'Phẫu thuật tim bé An', organizer: 'Hội Chữ Thập Đỏ', target: 80000000, current: 0, status: 'Pending', createdAt: '26/04/2026' },
        { id: 'CD003', title: 'Xây cầu bản Pa Tần', organizer: 'Nhóm Tình Nguyện Xanh', target: 250000000, current: 250000000, status: 'Completed', createdAt: '10/03/2026' },
        { id: 'CD004', title: 'Thư viện vùng sâu', organizer: 'Trí Tuệ Việt', target: 100000000, current: 40000000, status: 'Failed', createdAt: '01/01/2026' },
    ]);

    // Format tiền VNĐ
    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // Render tag trạng thái đẹp mắt
    const renderStatusTag = (status) => {
        const statusConfig = {
            Pending: { color: 'bg-orange-100! text-orange-600!', label: 'Chờ duyệt' },
            Active: { color: 'bg-blue-100! text-blue-600!', label: 'Đang chạy' },
            Completed: { color: 'bg-green-100! text-green-600!', label: 'Đã hoàn thành' },
            Failed: { color: 'bg-red-100! text-red-600!', label: 'Thất bại/Hủy' },
        };
        const config = statusConfig[status];
        return <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${config.color}`}>{config.label}</Tag>;
    };

    // Menu thao tác cho từng dòng
    const getActionMenu = (record) => [
        { key: 'view', icon: <EyeOutlined />, label: 'Xem chi tiết' },
        // Chỉ hiện nút Duyệt nếu đang Pending
        ...(record.status === 'Pending' ? [
            { type: 'divider' },
            { key: 'approve', icon: <CheckCircleOutlined className="text-green-500!" />, label: <span className="text-green-500! font-semibold">Duyệt chiến dịch</span> },
            { key: 'reject', danger: true, icon: <StopOutlined />, label: 'Từ chối' }
        ] : [])
    ];

    // Cấu hình các cột của Bảng
    const columns = [
        { title: 'Mã', dataIndex: 'id', key: 'id', render: (text) => <span className="font-bold text-gray-500">{text}</span> },
        { title: 'Tên chiến dịch', dataIndex: 'title', key: 'title', width: '30%', render: (text) => <span className="font-bold text-primary!">{text}</span> },
        { title: 'Tổ chức', dataIndex: 'organizer', key: 'organizer' },
        {
            title: 'Tiến độ',
            key: 'progress',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-brand!">{formatMoney(record.current)}</div>
                    <div className="text-xs text-gray-400">/ {formatMoney(record.target)}</div>
                </div>
            )
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt' },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status) => renderStatusTag(status) },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']} placement="bottomRight">
                    <Button type="text" icon={<MoreOutlined className="text-lg!" />} className="text-gray-500! hover:bg-gray-100!" />
                </Dropdown>
            )
        },
    ];

    return (
        <div className="bg-white! p-6 rounded-2xl! shadow-sm border border-gray-100">
            {/* Tiêu đề & Nút Tạo mới */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Quản lý Chiến dịch</h1>
                    <p className="text-gray-500 m-0 mt-1">Duyệt, theo dõi tiến độ và quản lý tất cả dự án gây quỹ.</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} className="bg-primary! border-none! font-bold h-10 px-6 rounded-lg!">
                    Tạo chiến dịch
                </Button>
            </div>

            {/* Bộ lọc & Tìm kiếm */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Search
                    placeholder="Tìm theo tên, mã chiến dịch..."
                    allowClear
                    className="w-full md:w-96"
                    size="large"
                />
                <Select
                    defaultValue="all"
                    size="large"
                    className="w-full md:w-48"
                    options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'pending', label: 'Chờ duyệt' },
                        { value: 'active', label: 'Đang chạy' },
                        { value: 'completed', label: 'Đã hoàn thành' },
                    ]}
                />
                <Select
                    defaultValue="newest"
                    size="large"
                    className="w-full md:w-48"
                    options={[
                        { value: 'newest', label: 'Mới nhất' },
                        { value: 'oldest', label: 'Cũ nhất' },
                        { value: 'highest_fund', label: 'Gây quỹ nhiều nhất' },
                    ]}
                />
            </div>

            {/* Bảng Dữ liệu */}
            <Table
                columns={columns}
                dataSource={campaigns}
                rowKey="id"
                pagination={{ pageSize: 10, className: "mt-6!" }}
                className="custom-admin-table"
                scroll={{ x: 800 }} // Cho phép cuộn ngang trên màn hình nhỏ
            />
        </div>
    );
};

export default AdminCampaigns;