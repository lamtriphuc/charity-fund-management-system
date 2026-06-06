import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, message, Select, Typography, Divider, Card, Image, Alert, Descriptions, Radio } from 'antd';
import { StopOutlined, FileSearchOutlined, SafetyCertificateOutlined, WarningOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatMoney } from '../../utils/helper';
import { disbursementService } from '../../services/disbursementService';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ================= MODAL DÀNH CHO SUPER ADMIN =================
const ResolveFlagModal = ({ visible, onClose, proofData, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState(null);

    useEffect(() => {
        if (visible) { form.resetFields(); setActionType(null); }
    }, [visible, form]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await disbursementService.resolveFlaggedProof(proofData.id, values);
            message.success('Đã xử lý chứng từ thành công!');
            onSuccess();
            onClose();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<span className="text-red-600 font-bold"><WarningOutlined /> Phán xử Hóa đơn Cảnh báo</span>}
            open={visible}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <Alert
                message="Lý do bị Kiểm toán viên đánh cờ:"
                description={<strong className="text-red-500">{proofData?.flaggedReason || 'Không rõ lý do'}</strong>}
                type="error" showIcon className="mb-4"
            />
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="action" label="Quyết định của Ban quản trị" rules={[{ required: true, message: 'Vui lòng chọn quyết định!' }]}>
                    <Radio.Group onChange={(e) => setActionType(e.target.value)} className="w-full flex flex-col gap-2">
                        <Radio.Button value="OVERRIDE_ACCEPT" className="w-full text-center text-green-600 font-semibold border-green-200">
                            Gỡ cờ - Chấp nhận hóa đơn hợp lệ
                        </Radio.Button>
                        <Radio.Button value="CONFIRM_FRAUD" className="w-full text-center text-red-600 font-semibold border-red-200">
                            Xác nhận Gian lận - Khóa quỹ ngay lập tức
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                {actionType && (
                    <Form.Item name="resolutionNote" label="Ghi chú / Biên bản xử lý" rules={[{ required: true, message: 'Vui lòng nhập lý do/ghi chú xử lý!' }]}>
                        <TextArea rows={4} placeholder="Nhập biên bản phán xử..." />
                    </Form.Item>
                )}
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={onClose} disabled={loading}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={loading} danger={actionType === 'CONFIRM_FRAUD'}>
                        Xác nhận Quyết định
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

// ================= MAIN COMPONENT =================
const AdminDisbursements = () => {
    const { user: currentUser } = useAuthStore();
    const isSuperAdmin = currentUser?.permissions?.includes('*') || currentUser?.role === 'SUPER_ADMIN';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({ status: undefined });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [resolveModalVisible, setResolveModalVisible] = useState(false);
    const [flaggedProof, setFlaggedProof] = useState(null);

    const [rejectForm] = Form.useForm();

    const fetchDisbursements = async (page = 1) => {
        setLoading(true);
        try {
            const res = await disbursementService.getAllForAdmin({ page, limit: pagination.pageSize, status: filters.status });
            setData(res.data?.data || res.data);
            if (res.data?.meta) setPagination({ ...pagination, current: res.data.meta.currentPage, total: res.data.meta.totalItems });
        } catch (error) {
            message.error("Lỗi tải danh sách giải ngân");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisbursements(1);
    }, [filters]);

    const handleApprove = async (isApproved, values = null) => {
        setActionLoading(true);
        try {
            await disbursementService.approveOrReject(selectedRecord.id, { isApproved, reason: values?.reason });
            message.success(isApproved ? 'Đã duyệt phiếu! Chờ kế toán chuyển khoản.' : 'Đã từ chối phiếu!');
            setIsModalOpen(false);
            rejectForm.resetFields();
            fetchDisbursements(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmTransfer = async (values) => {
        setActionLoading(true);
        try {
            // values.txReference là mã GD ngân hàng Kế toán nhập vào
            await disbursementService.confirmTransfer(selectedRecord.id, values.txReference);
            message.success('Đã xác nhận chuyển khoản và ghi nhận Sổ cái!');
            setIsModalOpen(false);
            fetchDisbursements(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xác nhận chuyển khoản');
        } finally {
            setActionLoading(false);
        }
    };

    const columns = [
        { title: 'Ngày tạo', dataIndex: 'createdAt', render: (val) => dayjs(val).format('DD/MM/YYYY') },
        { title: 'Chiến dịch', render: (_, r) => <span className="font-bold text-primary! line-clamp-1">{r.campaign?.title}</span>, width: '30%' },
        { title: 'Số tiền', dataIndex: 'amount', render: (val) => <span className="text-brand! font-black">{formatMoney(Number(val))}</span> },
        { title: 'Người nhận', render: (_, r) => r.volunteer?.fullName },
        {
            title: 'Trạng thái',
            // KHÔNG dùng dataIndex để có thể truy cập toàn bộ record
            render: (_, record) => {
                const proofs = record.proofs || [];

                if (record.status === 'TRANSFERRED' && proofs.length === 0) {
                    return <Tag color="warning" className="border-none font-medium">Chưa có minh chứng</Tag>;
                }

                if (record.status === 'TRANSFERRED' && proofs.some(p => p.verificationStatus === 'FLAGGED')) {
                    return <Tag color="red" className="border-none font-medium">Chứng từ bị cảnh báo</Tag>;
                }

                if (record.status === 'TRANSFERRED' && proofs.some(p => p.verificationStatus === 'REJECTED')) {
                    return <Tag color="red" className="border-none font-medium">Chứng từ bị từ chối</Tag>;
                }

                if (record.status === 'TRANSFERRED' && proofs.some(p => p.verificationStatus === 'PENDING_AUDIT')) {
                    return <Tag color="processing" className="border-none font-medium">Chờ kiểm toán chứng từ</Tag>;
                }

                const map = {
                    PENDING_APPROVAL: { color: 'orange', text: 'Chờ duyệt chi' },
                    PENDING_TRANSFER: { color: 'blue', text: 'Chờ chuyển khoản' },
                    TRANSFERRED: { color: 'green', text: 'Đã giải ngân' },
                    REJECTED: { color: 'red', text: 'Từ chối' },
                };

                return (
                    <Tag color={map[record.status]?.color || 'default'} className="border-none font-medium">
                        {map[record.status]?.text || record.status}
                    </Tag>
                );
            }
        },
        {
            title: 'Thao tác', align: 'center',
            render: (_, record) => (
                <Button type="primary" size="small" className="bg-gray-800 border-none" onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}>
                    Chi tiết
                </Button>
            )
        }
    ];

    const renderActionButtons = () => {
        if (!selectedRecord) return null;

        // 1. CHỨC NĂNG DUYỆT CHI TIỀN (Khối bị xóa nhầm)
        if (selectedRecord.status === 'PENDING_APPROVAL') {
            return (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-lg mb-4 text-center">XÉT DUYỆT GIẢI NGÂN</h4>
                    <Button className="w-full h-14 bg-green-500 hover:bg-green-600 border-none font-bold shadow-md text-base mb-4" onClick={() => handleApprove(true)} loading={actionLoading}>
                        <ThunderboltOutlined /> DUYỆT CHI TIỀN NGAY
                    </Button>
                    <Divider plain className="my-4 text-gray-400">Hoặc Từ chối</Divider>
                    <Form form={rejectForm} layout="vertical" onFinish={(vals) => handleApprove(false, vals)}>
                        <Form.Item name="reason" rules={[{ required: true, message: 'Nhập lý do từ chối' }]}>
                            <Input.TextArea rows={2} placeholder="Nhập lý do từ chối..." className="rounded-lg" />
                        </Form.Item>
                        <Button danger htmlType="submit" className="w-full font-bold" loading={actionLoading} icon={<StopOutlined />}>Từ chối phiếu này</Button>
                    </Form>
                </div>
            );
        }

        // 2. CHỨC NĂNG XÁC NHẬN CHUYỂN TIỀN (Dành cho Kế toán)
        if (selectedRecord.status === 'PENDING_TRANSFER') {
            return (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mt-4">
                    <h4 className="font-bold text-lg mb-4 text-center text-blue-700">XÁC NHẬN ĐÀ CHUYỂN KHOẢN</h4>
                    <Alert
                        message="Vui lòng thực hiện chuyển khoản ngoài hệ thống (Vietcombank, MBBank...) trước khi xác nhận tại đây."
                        type="info" showIcon className="mb-4"
                    />
                    <Form layout="vertical" onFinish={handleConfirmTransfer}>
                        <Form.Item
                            name="txReference"
                            label={<span className="font-bold">Mã giao dịch ngân hàng (TxReference)</span>}
                            rules={[{ required: true, message: 'Bắt buộc nhập mã đối soát để ghi Sổ cái!' }]}
                        >
                            <Input className="h-12 rounded-lg font-mono text-lg" placeholder="VD: FT123456789..." />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" className="w-full h-12 bg-blue-600 font-bold" loading={actionLoading}>
                            XÁC NHẬN
                        </Button>
                    </Form>
                </div>
            );
        }

        // 3. CHỨC NĂNG PHÁN XỬ CỦA SUPER ADMIN KHI HÓA ĐƠN BỊ CẮM CỜ
        if (selectedRecord.status === 'TRANSFERRED') {
            const proofs = selectedRecord.proofs || [];
            return (
                <div className="mt-6">
                    {/* BỔ SUNG: Hiển thị người đã duyệt chi (nếu Backend trả về) */}
                    {selectedRecord.approvedBy && (
                        <Alert
                            message={`Phiếu này đã được duyệt chi bởi: ${selectedRecord.approvedBy.fullName}`}
                            type="success"
                            className="mb-4 bg-green-50 border-green-200"
                            showIcon
                        />
                    )}

                    <h4 className="font-bold text-lg text-primary! mb-4 border-b pb-2"><FileSearchOutlined /> HÓA ĐƠN CHỨNG TỪ</h4>

                    {/* BỔ SUNG: Cảnh báo rõ ràng khi chưa có chứng từ */}
                    {proofs.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                            <WarningOutlined className="text-4xl text-yellow-500 mb-3" />
                            <h4 className="text-lg font-bold text-yellow-700 mb-1">Chưa có minh chứng giải ngân</h4>
                            <p className="text-gray-600 mb-0">Tình nguyện viên chưa tải lên hóa đơn/chứng từ cho khoản giải ngân này. Vui lòng nhắc nhở họ hoàn thành để đảm bảo tính minh bạch.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {proofs.map((proof) => (
                                <Card key={proof.id} size="small" className="shadow-sm border-gray-200">
                                    <div className="flex gap-4">
                                        <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded border bg-gray-100">
                                            <Image src={proof.fileUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                {proof.verificationStatus === 'FLAGGED' && <Tag color="red" className="mb-2"><WarningOutlined /> Bị Auditor đánh cờ!</Tag>}
                                                {proof.verificationStatus === 'VERIFIED' && <Tag color="green" className="mb-2"><SafetyCertificateOutlined /> Hợp lệ</Tag>}
                                                {proof.flaggedReason && <div className="bg-red-50 p-2 text-xs border border-red-100 rounded text-red-600 mb-2"><strong>Auditor báo cáo:</strong> {proof.flaggedReason}</div>}
                                                {proof.resolutionNote && <div className="bg-blue-50 p-2 text-xs border border-blue-100 rounded text-blue-600 mb-2"><strong>Ban quản trị:</strong> {proof.resolutionNote}</div>}
                                            </div>
                                            {isSuperAdmin && proof.verificationStatus === 'FLAGGED' && (
                                                <Button type="primary" danger size="small" onClick={() => { setFlaggedProof(proof); setResolveModalVisible(true); }}>
                                                    Xử lý
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} className="text-primary! m-0">Quản lý Giải ngân</Title>
                    <Text className="text-gray-500">Duyệt lệnh xuất tiền khỏi quỹ chiến dịch</Text>
                </div>
                <Select
                    className="w-48 h-10" placeholder="Lọc trạng thái" allowClear
                    onChange={(val) => setFilters({ status: val })}
                    options={[
                        { value: 'PENDING_APPROVAL', label: 'Chờ duyệt chi' },
                        { value: 'PENDING_TRANSFER', label: 'Chờ chuyển khoản' },
                        { value: 'TRANSFERRED', label: 'Đã giải ngân' },
                        { value: 'NO_PROOF', label: 'Chưa nộp minh chứng' },
                        { value: 'FLAGGED_PROOF', label: 'Chứng từ bị cảnh báo' },
                        { value: 'REJECTED_PROOF', label: 'Chứng từ bị từ chối' },
                    ]}
                />
            </div>

            <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ ...pagination, onChange: (page) => fetchDisbursements(page) }} className="bg-white rounded-xl shadow-sm border border-gray-100" />

            <Modal title={<span className="text-xl font-bold text-primary!">Chi tiết phiếu giải ngân</span>} open={isModalOpen} onCancel={() => { setIsModalOpen(false); setSelectedRecord(null); fetchDisbursements(pagination.current); }} footer={null} width={700} centered>
                {selectedRecord && (
                    <div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <Descriptions column={1} size="small" labelStyle={{ fontWeight: 'bold', width: '120px' }}>
                                <Descriptions.Item label="Chiến dịch">{selectedRecord.campaign?.title}</Descriptions.Item>
                                <Descriptions.Item label="Mục đích">{selectedRecord.purpose}</Descriptions.Item>
                                <Descriptions.Item label="Số tiền"><span className="text-brand! font-black text-lg">{formatMoney(Number(selectedRecord.amount))}</span></Descriptions.Item>
                            </Descriptions>
                        </div>
                        {renderActionButtons()}
                    </div>
                )}
            </Modal>

            <ResolveFlagModal visible={resolveModalVisible} onClose={() => { setResolveModalVisible(false); setFlaggedProof(null); }} proofData={flaggedProof} onSuccess={() => { setIsModalOpen(false); fetchDisbursements(pagination.current); }} />
        </div>
    );
};

export default AdminDisbursements;