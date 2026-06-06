import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, message, Typography, Card, Space, Image, Alert, Descriptions } from 'antd';
import { FileSearchOutlined, SafetyCertificateOutlined, SecurityScanOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatMoney } from '../../utils/helper';
import { disbursementService } from '../../services/disbursementService';

const { Title, Text } = Typography;

const AuditorProofsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [verifyingId, setVerifyingId] = useState(null);

    // CHỈ LẤY CÁC GIAO DỊCH ĐÃ CHUYỂN TIỀN (Mới có hóa đơn để soi)
    const fetchDisbursements = async (page = 1) => {
        setLoading(true);
        try {
            const res = await disbursementService.getAllForAdmin({ page, limit: pagination.pageSize, status: 'TRANSFERRED' });
            setData(res.data?.data || res.data);
            if (res.data?.meta) setPagination({ ...pagination, current: res.data.meta.currentPage, total: res.data.meta.totalItems });
        } catch (error) {
            message.error("Lỗi tải danh sách kiểm toán");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDisbursements(1); }, []);

    // HÀM KIỂM TOÁN DÀNH RIÊNG CHO AUDITOR
    const handleAudit = async (proofId, status, reason = null) => {
        try {
            await disbursementService.auditProof(proofId, { verificationStatus: status, flaggedReason: reason });
            message.success(status === 'FLAGGED' ? 'Đã cắm cờ báo cáo gian lận!' : 'Đã xác nhận chứng từ hợp lệ.');

            // Cập nhật UI tạm
            const updatedProofs = selectedRecord.proofs.map(p => p.id === proofId ? { ...p, verificationStatus: status, flaggedReason: reason } : p);
            setSelectedRecord({ ...selectedRecord, proofs: updatedProofs });
            fetchDisbursements(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi kiểm toán hóa đơn');
        }
    };

    const handleVerifySignature = async (proofId) => {
        setVerifyingId(proofId);
        try {
            const res = await disbursementService.verifySignature(proofId);
            const { isValid, message: msg } = res.data || res;
            if (isValid) {
                message.success({ content: msg, icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> });
            } else {
                message.error({ content: msg, duration: 5 });
                // Tự động cập nhật UI sang trạng thái bị cắm cờ (FLAGGED)
                const updatedProofs = selectedRecord.proofs.map(p =>
                    p.id === proofId ? {
                        ...p,
                        verificationStatus: 'FLAGGED',
                        flaggedReason: 'HỆ THỐNG TỰ ĐỘNG: Phát hiện ảnh gốc trên máy chủ đã bị thay đổi trái phép (Chữ ký không khớp).'
                    } : p
                );
                setSelectedRecord({ ...selectedRecord, proofs: updatedProofs });
                fetchDisbursements(pagination.current); // Load lại bảng ngoài
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể xác minh chữ ký lúc này.');
        } finally {
            setVerifyingId(null);
        }
    };

    const columns = [
        { title: 'Ngày giải ngân', dataIndex: 'createdAt', render: (val) => dayjs(val).format('DD/MM/YYYY') },
        { title: 'Chiến dịch', render: (_, r) => <span className="font-bold text-slate-700 line-clamp-1">{r.campaign?.title}</span>, width: '35%' },
        { title: 'Số tiền', dataIndex: 'amount', render: (val) => <span className="text-gray-800 font-black">{formatMoney(Number(val))}</span> },
        { title: 'Người nhận', render: (_, r) => r.volunteer?.fullName },
        {
            title: 'Tình trạng chứng từ',
            render: (_, r) => {
                const proofs = r.proofs || [];
                if (proofs.length === 0) return <Tag>Chưa upload</Tag>;
                const hasFlagged = proofs.some(p => p.verificationStatus === 'FLAGGED');
                const hasPending = proofs.some(p => p.verificationStatus === 'PENDING_AUDIT');
                if (hasFlagged) return <Tag color="red">Có nghi vấn</Tag>;
                if (hasPending) return <Tag color="orange">Cần kiểm tra</Tag>;
                return <Tag color="green">Đã kiểm tra</Tag>;
            }
        },
        {
            title: 'Thao tác', align: 'center',
            render: (_, record) => {
                // Kiểm tra xem có chứng từ nào đang chờ duyệt (PENDING_AUDIT) không
                const proofs = record.proofs || [];
                const hasPending = proofs.some(p => p.verificationStatus === 'PENDING_AUDIT');

                return (
                    <Button
                        type={hasPending ? "primary" : "default"}
                        size="small"
                        className={hasPending ? "bg-slate-700 border-none" : ""}
                        onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
                    >
                        {/* Nếu có hóa đơn chưa duyệt -> Nút ghi "Kiểm toán" */}
                        {/* Nếu đã duyệt hết -> Nút ghi "Xem hồ sơ" */}
                        {hasPending ? 'Tiến hành Kiểm toán' : 'Xem hồ sơ'}
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <Title level={2} className="text-slate-800 m-0"><FileSearchOutlined /> Kiểm toán Hóa đơn</Title>
                <Text className="text-gray-500">Tra soát, đối chiếu và đánh dấu các chứng từ có dấu hiệu gian lận</Text>
            </div>

            <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ ...pagination, onChange: (page) => fetchDisbursements(page) }} className="bg-white rounded-xl shadow-sm border border-gray-100" />

            <Modal title={<span className="text-xl font-bold text-slate-800">Hồ sơ Kiểm toán Giao dịch</span>} open={isModalOpen} onCancel={() => { setIsModalOpen(false); setSelectedRecord(null); }} footer={null} width={750} centered>
                {selectedRecord && (
                    <div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                            <Descriptions column={2} size="small" style={{ label: { fontWeight: 'bold' } }}>
                                <Descriptions.Item label="Mã đối soát" span={2}><Tag color="purple">{selectedRecord.txReference || 'N/A'}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Chiến dịch" span={2}>{selectedRecord.campaign?.title}</Descriptions.Item>
                                <Descriptions.Item label="Mục đích rút tiền" span={2}>{selectedRecord.purpose}</Descriptions.Item>
                                <Descriptions.Item label="Số tiền đã chi"><span className="text-brand! font-black">{formatMoney(Number(selectedRecord.amount))}</span></Descriptions.Item>
                                <Descriptions.Item label="Người nhận tiền">{selectedRecord.volunteer?.fullName}</Descriptions.Item>
                            </Descriptions>
                        </div>

                        <h4 className="font-bold text-lg text-slate-700 mb-3 border-b pb-2"><SafetyCertificateOutlined /> DANH SÁCH CHỨNG TỪ</h4>

                        {(selectedRecord.proofs || []).length === 0 ? <Alert message="Tình nguyện viên chưa tải lên hóa đơn minh chứng." type="warning" showIcon /> : (
                            <div className="grid grid-cols-1 gap-4">
                                {selectedRecord.proofs.map((proof) => (
                                    <Card key={proof.id} size="small" className="shadow-sm border-gray-300">
                                        <div className="flex gap-4">
                                            <div className="w-40 h-40 flex-shrink-0 overflow-hidden rounded border bg-gray-100">
                                                <Image src={proof.fileUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="mb-2">
                                                        {proof.verificationStatus === 'PENDING_AUDIT' && <Tag color="orange">Đang đợi Kiểm toán</Tag>}
                                                        {proof.verificationStatus === 'VERIFIED' && <Tag color="green"><SafetyCertificateOutlined /> Hợp lệ</Tag>}
                                                        {proof.verificationStatus === 'REJECTED' && <Tag color="red">Đã bị Admin Hủy</Tag>}
                                                        {proof.verificationStatus === 'FLAGGED' && <Tag color="red" className="animate-pulse"><WarningOutlined /> Đã cắm cờ</Tag>}
                                                    </div>

                                                    {proof.flaggedReason && <div className="text-xs text-red-500 mb-1"><strong>Lý do của bạn:</strong> {proof.flaggedReason}</div>}
                                                    {proof.resolutionNote && <div className="text-xs text-blue-600 mb-1"><strong>Admin xử lý:</strong> {proof.resolutionNote}</div>}

                                                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <strong className="text-[11px] text-slate-500 uppercase tracking-wider">Chữ ký số điện tử</strong>
                                                            <Button
                                                                type="dashed"
                                                                size="small"
                                                                icon={<SecurityScanOutlined />}
                                                                onClick={() => handleVerifySignature(proof.id)}
                                                                loading={verifyingId === proof.id}
                                                                className="text-[11px] border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400"
                                                            >
                                                                Kiểm chứng toàn vẹn
                                                            </Button>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono break-all leading-tight">
                                                            {proof.digitalSignature}
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* CHỈ CÒN ĐÚNG 2 NÚT NÀY CHO AUDITOR */}
                                                {proof.verificationStatus === 'PENDING_AUDIT' && (
                                                    <Space className="w-full mt-3 justify-end">
                                                        <Button size="middle" className="text-green-600 border-green-600 font-bold" onClick={() => handleAudit(proof.id, 'VERIFIED')}>Xác nhận Hợp lệ</Button>
                                                        <Button size="middle" danger onClick={() => {
                                                            const reason = window.prompt('Nhập bằng chứng/lý do phát hiện gian lận (Bắt buộc):');
                                                            if (reason) handleAudit(proof.id, 'FLAGGED', reason);
                                                        }}>Cắm cờ Cảnh báo</Button>
                                                    </Space>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AuditorProofsPage;