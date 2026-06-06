import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Table, Tag, Modal, Form, Input, InputNumber, Upload, message, Typography, Divider, Alert } from 'antd';
import { PlusOutlined, UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { campaignService } from '../../services/campaignService';
import { disbursementService } from '../../services/disbursementService';
import { formatMoney } from '../../utils/helper';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ManageCampaignPage = () => {
    const { id: campaignId } = useParams();

    const [campaign, setCampaign] = useState(null);
    const [disbursements, setDisbursements] = useState([]);
    const [loading, setLoading] = useState(true);

    // States cho Xin giải ngân
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestForm] = Form.useForm();

    // States cho Up hóa đơn
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedDisbursementId, setSelectedDisbursementId] = useState(null);
    const [fileList, setFileList] = useState([]);

    // States cho Xem hóa đơn đã up
    const [isViewProofsModalOpen, setIsViewProofsModalOpen] = useState(false);
    const [viewingProofs, setViewingProofs] = useState([]);

    const [isUploading, setIsUploading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const campData = await campaignService.getById(campaignId);
            const disbData = await disbursementService.getByCampaign(campaignId);
            setCampaign(campData);
            setDisbursements(disbData.data || disbData); // Tùy interceptor
        } catch (error) {
            message.error("Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [campaignId]);

    // --- LOGIC XIN GIẢI NGÂN ---
    const handleRequestDisbursement = async (values) => {
        try {
            await disbursementService.requestDisbursement(campaignId, {
                title: values.title,
                amount: values.amount,
                purpose: values.purpose
            });
            message.success('Đã gửi yêu cầu giải ngân thành công!');
            setIsRequestModalOpen(false);
            requestForm.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại thông tin ngân hàng trong Profile');
        }
    };

    // --- LOGIC UP HÓA ĐƠN ---
    const handleUploadProofs = async () => {
        if (fileList.length === 0) return message.error('Vui lòng chọn ít nhất 1 ảnh');

        try {
            const formData = new FormData();
            fileList.forEach(file => {
                formData.append('receipts', file.originFileObj); // Trùng key với FilesInterceptor backend
            });

            await disbursementService.uploadProofs(selectedDisbursementId, formData);
            message.success('Đã tải chứng từ lên thành công! Vui lòng chờ kiểm toán.');
            setIsUploadModalOpen(false);
            setFileList([]);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi upload');
        }
    };

    if (loading || !campaign) return <div className="text-center p-20">Đang tải...</div>;

    // Tính toán số dư khả dụng
    const usedAndLockedAmount = disbursements
        .filter(d => ['PENDING_APPROVAL', 'PENDING_TRANSFER', 'TRANSFERRED'].includes(d.status))
        .reduce((sum, d) => sum + Number(d.amount), 0);

    const availableAmount = Number(campaign.currentAmount) - usedAndLockedAmount;

    // Bảng dữ liệu giải ngân
    // Bảng dữ liệu giải ngân
    const columns = [
        { title: 'Ngày tạo', dataIndex: 'createdAt', render: (val) => new Date(val).toLocaleDateString('vi-VN') },
        { title: 'Lý do', dataIndex: 'purpose', width: '30%' },
        { title: 'Số tiền', dataIndex: 'amount', render: (val) => <span className="text-brand! font-bold">{formatMoney(val)}</span> },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status) => {
                const map = {
                    PENDING_APPROVAL: { color: 'orange', text: 'Chờ duyệt' },
                    PENDING_TRANSFER: { color: 'cyan', text: 'Chờ kế toán CK' },
                    TRANSFERRED: { color: 'green', text: 'Đã nhận tiền' },
                    REJECTED: { color: 'red', text: 'Từ chối' }
                };
                return <Tag color={map[status]?.color || 'default'}>{map[status]?.text || status}</Tag>;
            }
        },
        {
            title: 'Hóa đơn / Chứng từ',
            align: 'center',
            render: (_, record) => {
                if (record.status !== 'TRANSFERRED') return <Text type="secondary">Chưa khả dụng</Text>;

                const hasProofs = record.proofs && record.proofs.length > 0;

                return (
                    <div className="flex flex-col gap-2 items-center">
                        {hasProofs ? (
                            <Button
                                type="primary"
                                size="small"
                                className="bg-brand! border-none w-full"
                                onClick={() => {
                                    setViewingProofs(record.proofs);
                                    setIsViewProofsModalOpen(true);
                                }}
                            >
                                Xem {record.proofs.length} chứng từ
                            </Button>
                        ) : (
                            <Tag color="warning" className="m-0 text-xs">Chưa có chứng từ</Tag>
                        )}

                        <Button
                            type="dashed"
                            size="small"
                            icon={<UploadOutlined />}
                            className="w-full text-xs"
                            onClick={() => {
                                setSelectedDisbursementId(record.id);
                                setIsUploadModalOpen(true);
                            }}
                        >
                            Nộp thêm
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <Title level={2} className="text-primary!">Quản lý giải ngân</Title>
            <Text className="text-gray-500">Chiến dịch: <strong>{campaign.title}</strong></Text>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
                <Card className="rounded-2xl bg-blue-50 border-blue-100">
                    <Text className="text-gray-500 font-bold uppercase text-xs">Tổng quỹ đang có</Text>
                    <Title level={3} className="text-primary! m-0">{formatMoney(campaign.currentAmount)}</Title>
                </Card>
                <Card className="rounded-2xl bg-orange-50 border-orange-100">
                    <Text className="text-gray-500 font-bold uppercase text-xs">Đang treo (Chờ duyệt/CK)</Text>
                    <Title level={3} className="text-orange-500 m-0">{formatMoney(usedAndLockedAmount)}</Title>
                </Card>
                <Card className="rounded-2xl bg-green-50 border-green-100">
                    <Text className="text-gray-500 font-bold uppercase text-xs">Số dư CÓ THỂ RÚT</Text>
                    <Title level={3} className="text-green-600 m-0">{formatMoney(availableAmount)}</Title>
                </Card>
            </div>

            <Card
                title={<span className="font-bold text-lg">Lịch sử xin giải ngân</span>}
                extra={
                    <Button type="primary" className="bg-brand!" icon={<PlusOutlined />} onClick={() => setIsRequestModalOpen(true)}>
                        Tạo Yêu cầu mới
                    </Button>
                }
                className="rounded-2xl shadow-sm"
            >
                <Table
                    dataSource={disbursements}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            {/* MODAL 1: XIN TẠM ỨNG GIẢI NGÂN */}
            <Modal
                title={<span className="text-xl font-bold text-primary!">Tạo Yêu cầu Giải ngân</span>}
                open={isRequestModalOpen}
                onCancel={() => { setIsRequestModalOpen(false); requestForm.resetFields(); }}
                footer={null}
                centered
            >
                <Alert
                    message={`Số dư khả dụng: ${formatMoney(availableAmount)}`}
                    description="Tiền sẽ được chuyển về tài khoản ngân hàng bạn đã cài đặt trong Profile."
                    type="info"
                    showIcon
                    className="mb-6 rounded-lg"
                />
                <Form form={requestForm} layout="vertical" onFinish={handleRequestDisbursement}>
                    <Form.Item
                        name="title"
                        label={<span className="font-bold">Tên đợt giải ngân</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập tên đợt rút tiền' }]}
                    >
                        <Input className="h-12 rounded-lg" placeholder="VD: Tạm ứng Đợt 1..." />
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label={<span className="font-bold">Số tiền cần rút (VNĐ)</span>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập số tiền' },
                            { type: 'number', max: availableAmount, message: 'Vượt quá số dư khả dụng!' },
                            { type: 'number', min: 100000, message: 'Rút tối thiểu 100.000đ' }
                        ]}
                    >
                        <InputNumber
                            controls={false}
                            className="w-full! h-14 text-2xl font-black rounded-lg flex items-center border-blue-200 focus-within:border-brand! shadow-sm [&_input]:text-brand!"
                            formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={val => val.replace(/\$\s?|(,*)/g, '')}
                            placeholder="Nhập số tiền..."
                        />
                    </Form.Item>

                    <Form.Item
                        name="purpose"
                        label={<span className="font-bold">Lý do & Kế hoạch sử dụng vốn</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập mục đích sử dụng tiền' }]}
                    >
                        <TextArea rows={4} className="rounded-lg" placeholder="Ví dụ: Tạm ứng đợt 1 để mua 50 bao xi măng và 2 tấn sắt xây móng. Dự kiến giải ngân trong 3 ngày tới..." />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" className="w-full bg-brand! border-none h-12 text-base font-bold rounded-lg mt-2 shadow-md">
                        GỬI YÊU CẦU ĐẾN BAN QUẢN TRỊ
                    </Button>
                </Form>
            </Modal>

            {/* MODAL 2: UPLOAD HÓA ĐƠN MUA HÀNG */}
            <Modal
                title="Báo cáo Hóa đơn / Chứng từ"
                open={isUploadModalOpen}
                onCancel={() => {
                    if (!isUploading) { // Chặn đóng modal khi đang upload
                        setIsUploadModalOpen(false);
                        setFileList([]);
                    }
                }}
                footer={[
                    <Button key="back" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isUploading}
                        onClick={handleUploadProofs}
                        className="bg-primary!"
                    >
                        Gửi lên Hệ thống
                    </Button>,
                ]}
            >
                <Alert message="Vui lòng chụp rõ nét các hóa đơn VAT, biên lai chuyển tiền hoặc hình ảnh vật tư đã mua." type="warning" showIcon className="mb-6!" />
                <Upload
                    listType="picture-card"
                    fileList={fileList}
                    onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                    beforeUpload={() => false}
                    multiple
                    accept="image/*"
                    maxCount={10}
                    disabled={isUploading} // Khóa upload khi đang gửi
                >
                    {fileList.length >= 10 ? null : (
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                        </div>
                    )}
                </Upload>
            </Modal>

            {/* MODAL 3: XEM DANH SÁCH CHỨNG TỪ ĐÃ NỘP */}
            <Modal
                title={<span className="text-xl font-bold text-primary!">Chứng từ đã nộp</span>}
                open={isViewProofsModalOpen}
                onCancel={() => { setIsViewProofsModalOpen(false); setViewingProofs([]); }}
                footer={[
                    <Button key="close" onClick={() => setIsViewProofsModalOpen(false)}>Đóng</Button>
                ]}
                width={700}
                centered
            >
                {viewingProofs.length === 0 ? (
                    <Alert message="Chưa có chứng từ nào được tải lên." type="info" showIcon />
                ) : (
                    <div className="grid grid-cols-1 gap-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {viewingProofs.map((proof) => (
                            <Card key={proof.id} size="small" className="shadow-sm border-gray-200">
                                <div className="flex gap-4">
                                    <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded border bg-gray-100">
                                        <img src={proof.fileUrl} alt="Chứng từ" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="mb-2">
                                                {proof.verificationStatus === 'VERIFIED' && <Tag color="green">Hợp lệ</Tag>}
                                                {proof.verificationStatus === 'FLAGGED' && <Tag color="red">Bị cảnh báo</Tag>}
                                                {proof.verificationStatus === 'PENDING' && <Tag color="orange">Đang chờ kiểm toán</Tag>}
                                            </div>

                                            <Text type="secondary" className="text-xs block mb-1">
                                                Ngày nộp: {new Date(proof.createdAt).toLocaleString('vi-VN')}
                                            </Text>

                                            {proof.flaggedReason && (
                                                <div className="bg-red-50 p-2 text-xs border border-red-100 rounded text-red-600 mt-2">
                                                    <strong>Lý do từ chối:</strong> {proof.flaggedReason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ManageCampaignPage;