import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Typography, Card, Image, Alert, Space, Row, Col, Divider, message, Avatar } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, IdcardOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService } from '../../services/userService'; // Thay đổi đường dẫn tùy dự án của bạn

const { Title, Text } = Typography;
const { TextArea } = Input;

const AdminKycManagement = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({ status: 'PENDING', keyword: '' });

    // States cho Modal chi tiết & xét duyệt
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();
    const [actionType, setActionType] = useState(null); // 'APPROVED' hoặc 'REJECTED'

    const fetchKycProfiles = async (page = 1) => {
        setLoading(true);
        try {
            const res = await userService.findKycProfilesForAdmin({
                status: filters.status,
                page,
                limit: pagination.pageSize,
                keyword: filters.keyword
            });

            setData(res.data?.data || res.data || []);
            if (res.data?.meta) {
                setPagination({
                    ...pagination,
                    current: res.data.meta.currentPage,
                    total: res.data.meta.totalItems
                });
            }
        } catch (error) {
            message.error(error.response?.data?.message || "Lỗi tải danh sách hồ sơ KYC");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKycProfiles(1);
    }, [filters.status]);

    const handleSearch = () => {
        fetchKycProfiles(1);
    };

    const handleOpenReview = (record) => {
        setSelectedProfile(record);
        setActionType(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleAuditKyc = async (values) => {
        setSubmitLoading(true);
        try {
            // Gọi API approveKyc: PATCH /users/kyc-profiles/:kycId/approve
            await userService.approveKyc(selectedProfile.id, {
                status: values.status,
                rejectionReason: values.rejectionReason,
                roleName: values.roleName
            });

            message.success(`Đã xử lý hồ sơ KYC thành công!`);
            setIsModalOpen(false);
            fetchKycProfiles(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi duyệt");
        } finally {
            setSubmitLoading(false);
        }
    };

    const columns = [
        {
            title: 'Ngày nộp',
            dataIndex: 'submittedAt',
            key: 'submittedAt',
            render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Tài khoản',
            key: 'user',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <Avatar src={r.user?.avatarUrl} icon={<UserOutlined />} size="large" className="border border-gray-200" />
                    <div>
                        <div className="font-bold">{r.user?.fullName}</div>
                        <div className="text-gray-400 text-xs">{r.user?.email}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Thông tin OCR (FPT AI)',
            key: 'ocrInfo',
            render: (_, r) => (
                <div className="text-sm">
                    <div><Text type="secondary">Họ tên:</Text> <strong className="uppercase">{r.extractedName || 'N/A'}</strong></div>
                    <div><Text type="secondary">Số CCCD:</Text> <code className="text-brand! font-bold">{r.extractedIdNumber || 'N/A'}</code></div>
                    <div className="text-xs text-gray-500 mt-1">
                        {r.extractedDob || '--'} | Giới tính: {r.extractedGender || '--'}
                    </div>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const map = {
                    PENDING: { color: 'orange', text: 'Chờ duyệt' },
                    APPROVED: { color: 'green', text: 'Đã duyệt' },
                    REJECTED: { color: 'red', text: 'Bị từ chối' }
                };
                return <Tag color={map[status]?.color || 'default'}>{map[status]?.text || status}</Tag>;
            }
        },
        {
            title: 'Thao tác',
            align: 'center',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    className={record.status === 'PENDING' ? "bg-gray-800 border-none" : "bg-blue-600 border-none"}
                    onClick={() => handleOpenReview(record)}
                >
                    {record.status === 'PENDING' ? 'Xét duyệt' : 'Xem chi tiết'}
                </Button>
            )
        }
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} className="text-primary! m-0">Quản lý Định danh (KYC)</Title>
                    <Text className="text-gray-500">Phê duyệt hồ sơ nâng cấp tài khoản của Tình nguyện viên</Text>
                </div>

                {/* Bộ lọc trạng thái */}
                <Select
                    className="w-48 h-10"
                    value={filters.status}
                    onChange={(val) => setFilters({ ...filters, status: val })}
                    options={[
                        { value: 'PENDING', label: '⏳ Chờ xét duyệt' },
                        { value: 'APPROVED', label: '🟢 Đã phê duyệt' },
                        { value: 'REJECTED', label: '🔴 Đã từ chối' }
                    ]}
                />
            </div>

            {/* Thanh tìm kiếm */}
            <Card className="mb-6 rounded-xl border-gray-100 shadow-sm" size="small">
                <div className="flex gap-2">
                    <Input
                        placeholder="Tìm theo Tên hoặc Email tài khoản..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        onPressEnter={handleSearch}
                        className="h-10 rounded-lg"
                    />
                    <Button type="primary" className="bg-brand! h-10 px-6 rounded-lg border-none" onClick={handleSearch}>
                        Tìm kiếm
                    </Button>
                </div>
            </Card>

            {/* Bảng dữ liệu chính */}
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    onChange: (page) => fetchKycProfiles(page)
                }}
                className="bg-white rounded-xl shadow-sm border border-gray-100"
            />

            {/* MODAL CHI TIẾT VÀ XÉT DUYỆT HỒ SƠ */}
            <Modal
                title={<span className="text-xl font-bold text-primary!"><IdcardOutlined /> Chi tiết Hồ sơ Thẩm định KYC</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={850}
                centered
                destroyOnClose
            >
                {selectedProfile && (
                    <div className="mt-4">
                        {/* 1. KHỐI ĐỐI CHIẾU THÔNG TIN */}
                        {/* 1. KHỐI ĐỐI CHIẾU THÔNG TIN */}
                        <Row gutter={16} className="mb-6">
                            {/* Cột 1: Thông tin User */}
                            <Col span={10}>
                                <Card title={<span className="text-xs font-bold text-gray-500 uppercase"><UserOutlined /> Thông tin Đăng ký</span>} size="small" className="bg-gray-50 border-gray-200 rounded-xl h-full">
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                                        <Avatar src={selectedProfile.user?.avatarUrl} size={48} icon={<UserOutlined />} className="shadow-sm" />
                                        <div>
                                            <div className="font-bold text-base">{selectedProfile.user?.fullName}</div>
                                            <div className="text-gray-500 text-xs">{selectedProfile.user?.email}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><Text type="secondary">Quyền hiện tại:</Text> <Tag color="blue" className="ml-1">{selectedProfile.user?.role?.name || 'DONOR'}</Tag></div>
                                        <div><Text type="secondary">Ngày nộp hồ sơ:</Text> <span className="font-medium ml-1">{dayjs(selectedProfile.submittedAt).format('DD/MM/YYYY HH:mm')}</span></div>
                                    </div>
                                </Card>
                            </Col>

                            {/* Cột 2: Thông tin CCCD bóc tách */}
                            <Col span={14}>
                                <Card title={<span className="text-xs font-bold text-green-600 uppercase"><IdcardOutlined /> Dữ liệu bóc tách từ AI (OCR)</span>} size="small" className="bg-green-50/30 border-green-200 rounded-xl h-full">
                                    <div className="space-y-3 text-sm">
                                        <Row>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Họ tên trên thẻ</Text>
                                                <strong className="text-green-700 text-base uppercase">{selectedProfile.extractedName || 'N/A'}</strong>
                                            </Col>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Số CCCD</Text>
                                                <strong className="font-mono text-brand! text-base">{selectedProfile.extractedIdNumber || 'N/A'}</strong>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Ngày sinh</Text>
                                                <span className="font-medium">{selectedProfile.extractedDob || 'N/A'}</span>
                                            </Col>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Giới tính</Text>
                                                <span className="font-medium">{selectedProfile.extractedGender || 'N/A'}</span>
                                            </Col>
                                        </Row>
                                        <div>
                                            <Text type="secondary" className="block text-xs">Nơi thường trú</Text>
                                            <div className="font-medium bg-white p-2 mt-1 rounded border border-green-100 shadow-sm leading-relaxed">
                                                {selectedProfile.extractedAddress || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        </Row>

                        {/* 2. KHỐI ẢNH CHỨNG TỪ (HỖ TRỢ ZOOM) */}
                        <Divider plain className="text-gray-400 text-xs">HÌNH ẢNH CHỨNG TỪ ĐỐI CHIẾU</Divider>
                        <Alert message="Mẹo: Click vào ảnh để phóng to, xoay ảnh để kiểm tra kỹ các góc khuất hóa đơn/chữ nổi." type="info" showIcon className="mb-4 text-xs rounded-lg" />

                        <Image.PreviewGroup>
                            <Row gutter={16} className="mb-6">
                                <Col span={8}>
                                    <div className="text-center">
                                        <div className="font-semibold text-xs text-gray-500 mb-1">Mặt trước CCCD</div>
                                        <div className="h-40 border border-gray-200 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm">
                                            <Image src={selectedProfile.frontImageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="text-center">
                                        <div className="font-semibold text-xs text-gray-500 mb-1">Mặt sau CCCD</div>
                                        <div className="h-40 border border-gray-200 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm">
                                            <Image src={selectedProfile.backImageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="text-center">
                                        <div className="font-semibold text-xs text-gray-500 mb-1">Ảnh Chân dung chân thực</div>
                                        <div className="h-40 border border-gray-200 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm">
                                            <Image src={selectedProfile.portraitImageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Image.PreviewGroup>

                        {/* 3. KHỐI FORM THAO TÁC XÉT DUYỆT CHỈ HIỆN KHI TRẠNG THÁI CHỜ DUYỆT */}
                        {selectedProfile.status === 'PENDING' ? (
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-6">
                                <h4 className="font-bold text-base mb-4 text-center text-primary!">QUYẾT ĐỊNH THẨM ĐỊNH HỒ SƠ</h4>
                                <Form form={form} layout="vertical" onFinish={handleAuditKyc}>

                                    <Form.Item name="status" label={<span className="font-bold">Kết quả phê duyệt</span>} rules={[{ required: true, message: 'Vui lòng chọn kết quả!' }]}>
                                        <Select placeholder="Chọn quyết định..." onChange={(val) => setActionType(val)}>
                                            <Select.Option value="APPROVED">🟢 ĐẠT - Phê duyệt định danh tài khoản này</Select.Option>
                                            <Select.Option value="REJECTED">🔴 KHÔNG ĐẠT - Từ chối hồ sơ này</Select.Option>
                                        </Select>
                                    </Form.Item>

                                    {/* Nâng cấp Quyền nếu chọn Đạt */}
                                    {actionType === 'APPROVED' && (
                                        <Form.Item name="roleName" label={<span className="font-bold">Cấp quyền hạn mới cho thành viên</span>} initialValue="VOLUNTEER" rules={[{ required: true }]}>
                                            <Select options={[
                                                { value: 'VOLUNTEER', label: 'Tình Nguyện Viên (Được quyền xin tạo quỹ & rút tiền)' },
                                                { value: 'AUDITOR', label: 'Kiểm Toán Viên (Ban kiểm soát)' },
                                                { value: 'ADMIN', label: 'Mod Quản Trị Hệ Thống' }
                                            ]} />
                                        </Form.Item>
                                    )}

                                    {/* Nhập lý do nếu từ chối */}
                                    {actionType === 'REJECTED' && (
                                        <Form.Item name="rejectionReason" label={<span className="font-bold text-red-600">Lý do từ chối hồ sơ</span>} rules={[{ required: true, message: 'Bắt buộc nhập lý do từ chối!' }]}>
                                            <TextArea rows={3} placeholder="Ví dụ: Ảnh mặt sau bị mờ, không rõ số hoặc thông tin không trùng khớp với dữ liệu đăng ký..." className="rounded-lg" />
                                        </Form.Item>
                                    )}

                                    <div className="flex justify-end gap-2 mt-4">
                                        <Button onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                                        <Button type="primary" htmlType="submit" className={actionType === 'REJECTED' ? "bg-red-600 border-none font-bold" : "bg-green-600 border-none font-bold"} loading={submitLoading} disabled={!actionType}>
                                            Xác nhận hành động
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        ) : (
                            // Nếu hồ sơ cũ đã được giải quyết -> Hiện thông tin kết quả cũ
                            <div className="mt-4 border-t pt-4">
                                {selectedProfile.status === 'APPROVED' ? (
                                    <Alert message="Hồ sơ đã duyệt" description={`Hồ sơ KYC này đã được hệ thống phê duyệt hợp lệ thành công vào lúc ${dayjs(selectedProfile.reviewedAt).format('DD/MM/YYYY HH:mm')}.`} type="success" showIcon />
                                ) : (
                                    <Alert message="Hồ sơ đã bị từ chối" description={<div><div><strong>Lý do từ chối:</strong> {selectedProfile.rejectionReason}</div><div className="text-xs text-gray-400 mt-1">Xử lý lúc: {dayjs(selectedProfile.reviewedAt).format('DD/MM/YYYY HH:mm')}</div></div>} type="error" showIcon />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminKycManagement;