import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Select, Dropdown, Modal, message, Form, Alert, Tooltip } from 'antd';
import {
    PlusOutlined,
    MoreOutlined,
    CheckCircleOutlined,
    StopOutlined,
    EyeOutlined,
    ExclamationCircleOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { campaignService } from '../../services/campaignService';
import { useNavigate } from 'react-router-dom';

const { Search, TextArea } = Input;
const { confirm } = Modal;

const AdminCampaigns = () => {
    const navigate = useNavigate();

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });

    // States quản lý bộ lọc
    const [filters, setFilters] = useState({ keyword: '', status: '', sort: 'DESC' });

    // States quản lý Modal Từ chối
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [rejectingCampaignId, setRejectingCampaignId] = useState(null);
    const [rejectForm] = Form.useForm();

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelForm] = Form.useForm();
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    // 1. HÀM FETCH DỮ LIỆU TỪ BACKEND
    const fetchCampaigns = async (page = 1, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pagination.pageSize || 20,
                sort: currentFilters.sort || 'DESC',
            };

            if (currentFilters.status) {
                params.status = currentFilters.status;
            }

            if (currentFilters.keyword?.trim()) {
                params.keyword = currentFilters.keyword.trim();
            }

            const res = await campaignService.getAllForAd(params);

            setCampaigns(res.data);
            setPagination(prev => ({
                ...prev,
                current: res.meta?.currentPage || page,
                total: res.meta?.totalItems || 0,
            }));
        } catch (error) {
            message.error('Lỗi khi tải danh sách chiến dịch');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Load data lần đầu
    useEffect(() => {
        fetchCampaigns(1, filters);
    }, []);

    // 2. CÁC HÀM XỬ LÝ LỌC & PHÂN TRANG
    const handleTableChange = (newPagination) => {
        fetchCampaigns(newPagination.current, filters);
    };

    const handleSearch = (value) => {
        const newFilters = { ...filters, keyword: value };
        setFilters(newFilters);
        fetchCampaigns(1, newFilters);
    };

    const handleStatusChange = (value) => {
        const newFilters = { ...filters, status: value === 'all' ? '' : value };
        setFilters(newFilters);
        fetchCampaigns(1, newFilters);
    };

    const handleSortChange = (value) => {
        const newFilters = { ...filters, sort: value };
        setFilters(newFilters);
        fetchCampaigns(1, newFilters);
    };

    // 3. NGHIỆP VỤ: DUYỆT CHIẾN DỊCH
    const handleApprove = (id) => {
        confirm({
            title: 'Xác nhận duyệt chiến dịch?',
            icon: <ExclamationCircleOutlined />,
            content: 'Chiến dịch sẽ được chuyển sang trạng thái ACTIVE và hệ thống sẽ tự động khởi tạo Quỹ tiếp nhận tiền.',
            okText: 'Đồng ý Duyệt',
            okButtonProps: { className: 'bg-green-500 hover:bg-green-600 border-none' },
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await campaignService.approveCampaign(id);
                    message.success('Đã duyệt chiến dịch thành công!');
                    fetchCampaigns(pagination.current, filters); // Reload lại bảng
                } catch (error) {
                    message.error(error.response?.data?.message || 'Lỗi khi duyệt chiến dịch');
                }
            },
        });
    };

    // 4. NGHIỆP VỤ: TỪ CHỐI CHIẾN DỊCH
    const showRejectModal = (id) => {
        setRejectingCampaignId(id);
        setIsRejectModalVisible(true);
    };

    const submitReject = async (values) => {
        try {
            await campaignService.rejectCampaign(rejectingCampaignId, values.reason);
            message.success('Đã từ chối chiến dịch!');
            setIsRejectModalVisible(false);
            rejectForm.resetFields();
            fetchCampaigns(pagination.current, filters); // Reload lại bảng
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi từ chối chiến dịch');
        }
    };

    // Format UI Helper
    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const renderStatusTag = (status) => {
        const statusConfig = {
            PENDING: { color: 'bg-orange-100! text-orange-600!', label: 'Chờ duyệt' },
            ACTIVE: { color: 'bg-blue-100! text-blue-600!', label: 'Đang chạy' },
            REJECTED: { color: 'bg-red-100! text-red-600!', label: 'Bị từ chối' },
            COMPLETED: { color: 'bg-green-100! text-green-600!', label: 'Đủ mục tiêu' },
            CLOSED: { color: 'bg-gray-100! text-gray-500!', label: 'Đã đóng' },
            SUSPENDED: { color: 'bg-red-100! text-red-700!', label: 'Tạm dừng' },
        };
        const config = statusConfig[status] || { color: 'bg-gray-100! text-gray-600!', label: status };
        return <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${config.color}`}>{config.label}</Tag>;
    };

    const handleCancelCampaign = async (values) => {
        try {
            await campaignService.cancelAndReallocate(selectedCampaign.id, values.reason);
            message.success('Đã đóng chiến dịch và điều chuyển quỹ thành công!');
            setIsCancelModalOpen(false);
            cancelForm.resetFields();
            fetchCampaigns(); // Load lại danh sách
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const getActionMenu = (record) => [
        {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => navigate(`/admin/campaigns/${record.id}`) // Thay URL theo route thực tế của bạn
        },
        ...(record.status === 'PENDING' ? [
            { type: 'divider' },
            {
                key: 'approve',
                icon: <CheckCircleOutlined className="text-green-500!" />,
                label: <span className="text-green-500! font-semibold">Duyệt chiến dịch</span>,
                onClick: () => handleApprove(record.id)
            },
            {
                key: 'reject',
                danger: true,
                icon: <StopOutlined />,
                label: 'Từ chối',
                onClick: () => showRejectModal(record.id)
            }
        ] : []),
        ...(record.status === 'ACTIVE' ? [
            { type: 'divider' },
            {
                key: 'cancel',
                danger: true,
                icon: <WarningOutlined />,
                label: 'Đóng & Điều chuyển',
                onClick: () => {
                    setSelectedCampaign(record); // Lưu trữ record đang chọn
                    setIsCancelModalOpen(true);  // Mở Modal cảnh báo
                }
            }
        ] : [])
    ];

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'id',
            key: 'id',
            width: 120,
            render: (text) => (
                <Tooltip title={text}>
                    <span className="font-mono text-xs text-gray-500 cursor-pointer">
                        {text.substring(0, 8).toUpperCase()}...
                    </span>
                </Tooltip>
            )
        },
        {
            title: 'Tên chiến dịch',
            dataIndex: 'title',
            key: 'title',
            width: '25%',
            render: (text) => <span className="font-bold text-primary!">{text}</span>
        },
        {
            title: 'Người khởi xướng',
            key: 'createdBy',
            render: (_, record) => <span>{record.createdBy?.fullName || 'N/A'}</span>
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-brand!">{formatMoney(record.currentAmount)}</div>
                    <div className="text-xs text-gray-400">/ {formatMoney(record.targetAmount)}</div>
                </div>
            )
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => <span className="text-gray-500">{new Date(date).toLocaleDateString('vi-VN')}</span>
        },
        {
            title: 'Hạn chót',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => (
                <span className="text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-md">
                    {new Date(date).toLocaleDateString('vi-VN')}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => renderStatusTag(status)
        },
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Quản lý Chiến dịch</h1>
                    <p className="text-gray-500 m-0 mt-1">Duyệt, theo dõi tiến độ và quản lý tất cả dự án gây quỹ.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Search
                    placeholder="Tìm theo tên chiến dịch..."
                    allowClear
                    onSearch={handleSearch}
                    className="w-full md:w-96"
                    size="large"
                />
                <Select
                    defaultValue="all"
                    size="large"
                    onChange={handleStatusChange}
                    className="w-full md:w-48"
                    options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'PENDING', label: 'Chờ duyệt' },
                        { value: 'ACTIVE', label: 'Đang chạy' },
                        { value: 'COMPLETED', label: 'Đã hoàn thành' },
                        { value: 'SUSPENDED', label: 'Tạm dừng' },
                        { value: 'CLOSED', label: 'Đã đóng' },
                        { value: 'REJECTED', label: 'Bị từ chối' },
                    ]}
                />
                <Select
                    defaultValue="DESC"
                    size="large"
                    onChange={handleSortChange}
                    className="w-full md:w-48"
                    options={[
                        { value: 'DESC', label: 'Mới nhất' },
                        { value: 'ASC', label: 'Cũ nhất' },
                    ]}
                />
            </div>

            <Table
                columns={columns}
                dataSource={campaigns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: false,
                    className: "mt-6!"
                }}
                onChange={handleTableChange}
                className="custom-admin-table"
                scroll={{ x: 900 }}
            />

            {/* Modal Nhập lý do từ chối */}
            <Modal
                title={<span className="text-red-500 font-bold">Từ chối Chiến dịch</span>}
                open={isRejectModalVisible}
                onCancel={() => {
                    setIsRejectModalVisible(false);
                    rejectForm.resetFields();
                }}
                footer={null}
            >
                <Form form={rejectForm} layout="vertical" onFinish={submitReject} className="mt-4">
                    <Form.Item
                        name="reason"
                        label="Vui lòng nhập lý do từ chối (bắt buộc):"
                        rules={[{ required: true, message: 'Lý do từ chối không được để trống!' }]}
                    >
                        <TextArea rows={4} placeholder="Ví dụ: Hình ảnh chứng từ không rõ nét, cần bổ sung..." />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsRejectModalVisible(false)}>Hủy</Button>
                        <Button type="primary" danger htmlType="submit">Xác nhận Từ chối</Button>
                    </div>
                </Form>
            </Modal>
            <Modal
                title={<span className="text-red-600 font-bold flex items-center gap-2"><WarningOutlined /> XÁC NHẬN HỦY CHIẾN DỊCH</span>}
                open={isCancelModalOpen}
                onCancel={() => setIsCancelModalOpen(false)}
                footer={null}
            >
                <Alert
                    message="Hành động không thể hoàn tác!"
                    description={`Khi bạn đóng chiến dịch này, số tiền ${selectedCampaign ? formatMoney(selectedCampaign.currentAmount) : '0đ'} sẽ được rút sạch và điều chuyển về Quỹ Dự Phòng. Chiến dịch sẽ bị khóa vĩnh viễn.`}
                    type="error"
                    showIcon
                    className="mb-4"
                />
                <Form form={cancelForm} layout="vertical" onFinish={handleCancelCampaign}>
                    <Form.Item
                        name="reason"
                        label="Lý do hủy / Điều chuyển (Hiển thị công khai)"
                        rules={[{ required: true, message: 'Bắt buộc nhập lý do' }]}
                    >
                        <Input.TextArea rows={3} placeholder="VD: Chiến dịch bị phát hiện gian lận / Đã hết thời hạn nhưng không đạt đủ tiền..." />
                    </Form.Item>
                    <Button danger type="primary" htmlType="submit" className="w-full font-bold h-10">
                        XÁC NHẬN ĐÓNG CHIẾN DỊCH
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminCampaigns;