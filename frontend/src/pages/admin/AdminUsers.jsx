import React, { useState } from 'react';
import { Table, Tag, Avatar, Button, Input, Select, Dropdown, Modal, message } from 'antd';
import {
    UserOutlined,
    SearchOutlined,
    MoreOutlined,
    LockOutlined,
    UnlockOutlined,
    EditOutlined
} from '@ant-design/icons';

const { Search } = Input;

const AdminUsers = () => {
    // Mock Data người dùng
    const [users, setUsers] = useState([
        { id: 'U001', fullName: 'Nguyễn Văn Admin', email: 'admin@charity.com', role: 'ADMIN', status: 'Active', createdAt: '01/01/2026', avatar: '' },
        { id: 'U002', fullName: 'Trần Thị Donor', email: 'donor1@gmail.com', role: 'USER', status: 'Active', createdAt: '15/04/2026', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
        { id: 'U003', fullName: 'Lê Mạnh Thường Quân', email: 'manhthuongquan@outlook.com', role: 'USER', status: 'Blocked', createdAt: '20/04/2026', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d' },
    ]);

    const handleUpdateStatus = (id, newStatus) => {
        message.success(`Đã cập nhật trạng thái người dùng thành ${newStatus}`);
    };

    const columns = [
        {
            title: 'Người dùng',
            dataIndex: 'fullName',
            key: 'user',
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <Avatar src={record.avatar} icon={<UserOutlined />} className="bg-brand!" />
                    <div>
                        <div className="font-bold text-primary!">{text}</div>
                        <div className="text-xs text-gray-400">{record.id}</div>
                    </div>
                </div>
            )
        },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Quyền hạn',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag className={`border-none! font-bold ${role === 'ADMIN' ? 'bg-purple-100! text-purple-600!' : 'bg-gray-100! text-gray-600!'}`}>
                    {role}
                </Tag>
            )
        },
        { title: 'Ngày tham gia', dataIndex: 'createdAt', key: 'createdAt' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${status === 'Active' ? 'bg-green-100! text-green-600!' : 'bg-red-100! text-red-600!'}`}>
                    {status === 'Active' ? 'Hoạt động' : 'Đang khóa'}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Dropdown
                    menu={{
                        items: [
                            { key: 'edit', icon: <EditOutlined />, label: 'Sửa thông tin' },
                            {
                                key: 'toggle_status',
                                danger: record.status === 'Active',
                                icon: record.status === 'Active' ? <LockOutlined /> : <UnlockOutlined />,
                                label: record.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa',
                                onClick: () => handleUpdateStatus(record.id, record.status === 'Active' ? 'Blocked' : 'Active')
                            }
                        ]
                    }}
                    trigger={['click']}
                >
                    <Button type="text" icon={<MoreOutlined className="text-lg!" />} />
                </Dropdown>
            )
        },
    ];

    return (
        <div className="bg-white! p-8 rounded-3xl! shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Quản lý Con người</h1>
                    <p className="text-gray-500 m-0">Kiểm soát danh sách người dùng và phân quyền hệ thống.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Search
                        placeholder="Tìm theo tên hoặc email..."
                        className="w-full md:w-72"
                        size="large"
                        prefix={<SearchOutlined />}
                    />
                    <Select
                        defaultValue="all"
                        size="large"
                        className="w-40"
                        options={[
                            { value: 'all', label: 'Tất cả vai trò' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'user', label: 'User' },
                        ]}
                    />
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                pagination={{ pageSize: 8 }}
                className="custom-admin-table"
            />
        </div>
    );
};

export default AdminUsers;