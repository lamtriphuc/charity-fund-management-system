import React, { useState, useEffect } from 'react';
import { Table, Tag, Avatar, Button, Input, Select, Dropdown, Modal, message, Result, Descriptions, Image, Space } from 'antd';
import {
    UserOutlined,
    SearchOutlined,
    MoreOutlined,
    LockOutlined,
    UnlockOutlined,
    SafetyCertificateOutlined,
    IdcardOutlined,
    CheckOutlined,
    CloseOutlined
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import useAuthStore from '../../store/authStore';

const { Search } = Input;

// Logic kiểm tra quyền hạn thao tác lên tài khoản khác
const canManageTargetUser = (currentUser, targetRole) => {
    if (!currentUser || !currentUser.role) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (currentUser.role === 'ADMIN') {
        return ['DONOR', 'VOLUNTEER'].includes(targetRole);
    }
    return false;
};

// Lấy danh sách Role được phép gán
const getAssignableRoles = (currentUserRole) => {
    if (currentUserRole === 'SUPER_ADMIN') {
        return [
            { value: 'ADMIN', label: 'Admin (Duyệt chiến dịch)' },
            { value: 'AUDITOR', label: 'Ban kiểm soát (Chỉ xem)' },
            { value: 'VOLUNTEER', label: 'Tình nguyện viên' },
            { value: 'DONOR', label: 'Nhà hảo tâm' },
        ];
    }
    return [
        { value: 'VOLUNTEER', label: 'Tình nguyện viên' },
        { value: 'DONOR', label: 'Nhà hảo tâm' },
    ];
};

const AdminUser = () => {
    const { user: currentUser } = useAuthStore();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // State Modal Phân quyền
    const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState(null);

    // State Modal KYC
    const [isKycModalVisible, setIsKycModalVisible] = useState(false);
    const [processingKyc, setProcessingKyc] = useState(false);

    const [tableParams, setTableParams] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // Fetch dữ liệu từ API
    const fetchUsers = async (page = tableParams.current, limit = tableParams.pageSize) => {
        setLoading(true);
        try {
            const params = { page, limit };
            if (searchTerm) params.keyword = searchTerm;
            if (roleFilter !== '') params.role = roleFilter;

            const response = await userService.getAll(params);
            setUsers(response.data);
            setTableParams({
                ...tableParams,
                current: page,
                total: response.meta?.totalItems || 0,
            });
        } catch (error) {
            message.error('Không thể tải danh sách người dùng!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.permissions?.includes('MANAGE_USERS') || currentUser?.permissions?.includes('*')) {
            fetchUsers(1, tableParams.pageSize);
        }
    }, [searchTerm, roleFilter]);

    // Xử lý Khóa/Mở khóa
    const handleToggleStatus = async (userId, currentStatus) => {
        const updatedStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        const previousUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, status: updatedStatus } : u));

        try {
            await userService.updateStatus(userId, updatedStatus);
            message.success(`Đã ${updatedStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'} tài khoản thành công!`);
        } catch (error) {
            setUsers(previousUsers);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái.');
        }
    };

    // Mở Modal Phân quyền
    const handleOpenRoleModal = (record) => {
        setSelectedUser(record);
        setNewRole(record.role?.name || record.role || 'DONOR');
        setIsRoleModalVisible(true);
    };

    // Lưu Phân quyền
    const handleSubmitChangeRole = async () => {
        if (!selectedUser || !newRole) return;
        try {
            await userService.updateRole(selectedUser.id, newRole);
            message.success(`Đã cập nhật quyền thành ${newRole} thành công!`);
            setIsRoleModalVisible(false);
            fetchUsers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi phân quyền người dùng.');
        }
    };

    // Mở Modal KYC
    const handleOpenKycModal = (record) => {
        setSelectedUser(record);
        setIsKycModalVisible(true);
    };

    // Xử lý Duyệt/Từ chối KYC
    const handleUpdateKycStatus = async (status) => {
        let reason = '';
        if (status === 'REJECTED') {
            reason = window.prompt('Nhập lý do từ chối hồ sơ KYC (Ví dụ: Ảnh mờ, sai thông tin):');
            if (reason === null) return; // Hủy thao tác nếu ấn Cancel
        }

        setProcessingKyc(true);
        try {
            // Giả định bạn có hàm updateKycStatus trong userService
            await userService.updateKycStatus(selectedUser.id, { kycStatus: status, rejectReason: reason });
            message.success(status === 'VERIFIED' ? 'Đã duyệt hồ sơ KYC!' : 'Đã từ chối hồ sơ KYC.');
            setIsKycModalVisible(false);
            fetchUsers(); // Cập nhật lại bảng
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái KYC.');
        } finally {
            setProcessingKyc(false);
        }
    };

    const handleTableChange = (pagination) => {
        fetchUsers(pagination.current, pagination.pageSize);
    };

    const columns = [
        {
            title: 'Người dùng',
            dataIndex: 'fullName',
            key: 'user',
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <Avatar src={record?.avatarUrl} icon={<UserOutlined />} className="" />
                    <div>
                        <div className="font-bold text-primary!">{text}</div>
                        <div className="text-xs text-gray-400">{record.email}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Quyền hạn',
            dataIndex: 'role',
            key: 'role',
            render: (roleData) => {
                const roleName = typeof roleData === 'object' ? roleData?.name : roleData;
                const isHighLevel = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
                return (
                    <Tag className={`border-none! font-bold ${isHighLevel ? 'bg-purple-100! text-purple-600!' : 'bg-gray-100! text-gray-600!'}`}>
                        {roleName || 'DONOR'}
                    </Tag>
                );
            }
        },
        {
            title: 'Xác thực KYC',
            dataIndex: 'kycStatus',
            key: 'kycStatus',
            render: (status) => {
                const colors = { VERIFIED: 'green', PENDING: 'orange', REJECTED: 'red', NONE: 'default' };
                const labels = { VERIFIED: 'Đã xác thực', PENDING: 'Chờ duyệt', REJECTED: 'Từ chối', NONE: 'Chưa có' };
                return (
                    <Tag color={colors[status] || 'default'} className="border-none! font-semibold">
                        {labels[status] || 'Chưa cập nhật'}
                    </Tag>
                );
            }
        },
        {
            title: 'Ngày tham gia',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${status === 'ACTIVE' ? 'bg-green-100! text-green-600!' : 'bg-red-100! text-red-600!'}`}>
                    {status === 'ACTIVE' ? 'Hoạt động' : 'Đang khóa'}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => {
                const targetRole = typeof record.role === 'object' ? record.role?.name : record.role;
                const canManage = canManageTargetUser(currentUser, targetRole);

                if (!canManage) {
                    return <span className="text-gray-300 text-xs">Không có quyền</span>;
                }

                return (
                    <Dropdown
                        styles={{ root: { width: 160 } }}
                        menu={{
                            items: [
                                {
                                    key: 'view_kyc',
                                    icon: <IdcardOutlined />,
                                    label: 'Xem hồ sơ KYC',
                                    onClick: () => handleOpenKycModal(record)
                                },
                                {
                                    key: 'role',
                                    icon: <SafetyCertificateOutlined />,
                                    label: 'Phân quyền',
                                    onClick: () => handleOpenRoleModal(record)
                                },
                                {
                                    key: 'toggle_status',
                                    danger: record.status === 'ACTIVE',
                                    icon: record.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />,
                                    label: record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa',
                                    onClick: () => handleToggleStatus(record.id, record.status)
                                }
                            ]
                        }}
                        trigger={['click']}
                    >
                        <Button type="text" icon={<MoreOutlined className="text-lg!" />} />
                    </Dropdown>
                );
            }
        },
    ];

    const hasAccess = currentUser?.permissions?.includes('MANAGE_USERS') || currentUser?.permissions?.includes('*');
    if (!hasAccess) {
        return (
            <div className="bg-white! p-8 rounded-3xl! shadow-sm flex justify-center items-center h-96">
                <Result status="403" title="403 Forbidden" subTitle="Bạn không có quyền truy cập vào phân hệ này." />
            </div>
        );
    }

    return (
        <div className="bg-white! p-8 rounded-3xl! shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Quản lý Con người</h1>
                    <p className="text-gray-500 m-0">Kiểm soát danh sách người dùng, phân quyền và duyệt KYC.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Search
                        placeholder="Tìm theo tên hoặc email..."
                        allowClear
                        onSearch={(value) => setSearchTerm(value)}
                        className="w-full md:w-72"
                        size="large"
                        prefix={<SearchOutlined />}
                    />
                    <Select
                        defaultValue=""
                        size="large"
                        className="w-40"
                        onChange={(value) => setRoleFilter(value)}
                        options={[
                            { value: '', label: 'Tất cả vai trò' },
                            { value: 'ADMIN', label: 'Admin' },
                            { value: 'AUDITOR', label: 'Ban kiểm soát' },
                            { value: 'VOLUNTEER', label: 'Tình nguyện viên' },
                            { value: 'DONOR', label: 'Nhà hảo tâm' },
                        ]}
                    />
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                className="custom-admin-table"
                pagination={{
                    current: tableParams.current,
                    pageSize: tableParams.pageSize,
                    total: tableParams.total,
                    showSizeChanger: false,
                }}
                onChange={handleTableChange}
            />

            {/* Modal Phân Quyền */}
            <Modal
                title={`Phân quyền cho: ${selectedUser?.fullName}`}
                open={isRoleModalVisible}
                onOk={handleSubmitChangeRole}
                onCancel={() => setIsRoleModalVisible(false)}
                okText="Lưu thay đổi"
                cancelText="Hủy"
            >
                <div className="mt-4 mb-2 font-medium">Chọn vai trò hệ thống:</div>
                <Select
                    className="w-full"
                    size="large"
                    value={newRole}
                    onChange={(value) => setNewRole(value)}
                    options={getAssignableRoles(currentUser.role)}
                />
                <div className="mt-4 text-xs text-gray-500">
                    Lưu ý: Thay đổi quyền hạn sẽ có tác dụng ngay lập tức trên hệ thống. Tránh cấp quyền Admin cho tài khoản chưa xác thực KYC.
                </div>
            </Modal>

            {/* Modal Hồ sơ KYC */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <IdcardOutlined className="text-blue-600" />
                        <span>Hồ sơ định danh (KYC)</span>
                    </div>
                }
                open={isKycModalVisible}
                onCancel={() => setIsKycModalVisible(false)}
                footer={null}
                width={700}
                centered
            >
                {selectedUser && (
                    <div className="mt-4">
                        {/* Thông tin Text */}
                        <Descriptions bordered size="small" column={1} style={{ label: { fontWeight: 'bold', width: '150px' } }}>
                            <Descriptions.Item label="Họ và tên">{selectedUser.fullName}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                            <Descriptions.Item label="Số CCCD">{selectedUser.idCardNumber || 'Chưa cập nhật'}</Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">{selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={
                                    selectedUser.kycStatus === 'VERIFIED' ? 'green' :
                                        selectedUser.kycStatus === 'PENDING' ? 'orange' :
                                            selectedUser.kycStatus === 'REJECTED' ? 'red' : 'default'
                                }>
                                    {selectedUser.kycStatus || 'NONE'}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Hình ảnh CCCD */}
                        <div className="mt-6 mb-2 font-bold text-slate-700">Hình ảnh minh chứng:</div>
                        <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 justify-center">
                            {selectedUser.idCardFront ? (
                                <div className="text-center">
                                    <Image src={selectedUser.idCardFront} width={250} height={150} className="object-cover rounded shadow-sm border border-gray-300" />
                                    <div className="text-xs text-gray-500 mt-1">Mặt trước CCCD</div>
                                </div>
                            ) : <div className="w-[250px] h-[150px] bg-gray-200 flex items-center justify-center text-gray-400 rounded">Thiếu mặt trước</div>}

                            {selectedUser.idCardBack ? (
                                <div className="text-center">
                                    <Image src={selectedUser.idCardBack} width={250} height={150} className="object-cover rounded shadow-sm border border-gray-300" />
                                    <div className="text-xs text-gray-500 mt-1">Mặt sau CCCD</div>
                                </div>
                            ) : <div className="w-[250px] h-[150px] bg-gray-200 flex items-center justify-center text-gray-400 rounded">Thiếu mặt sau</div>}
                        </div>

                        {/* Nút thao tác (Chỉ hiện nếu đang PENDING) */}
                        {selectedUser.kycStatus === 'PENDING' && (
                            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                                <Button
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={() => handleUpdateKycStatus('REJECTED')}
                                    loading={processingKyc}
                                >
                                    Từ chối hồ sơ
                                </Button>
                                <Button
                                    type="primary"
                                    className="bg-green-600 hover:bg-green-700 border-none"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleUpdateKycStatus('VERIFIED')}
                                    loading={processingKyc}
                                >
                                    Phê duyệt hợp lệ
                                </Button>
                            </div>
                        )}

                        {/* Hiển thị lý do từ chối nếu có */}
                        {selectedUser.kycStatus === 'REJECTED' && selectedUser.kycRejectReason && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded border border-red-200 text-sm">
                                <strong>Lý do từ chối: </strong> {selectedUser.kycRejectReason}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminUser;