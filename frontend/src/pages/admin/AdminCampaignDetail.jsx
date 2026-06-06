import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Progress, Button, Tag, Card, Modal, Form, Input, Image, Row, Col, message, Spin, Divider } from 'antd';
import {
    CheckCircleOutlined,
    StopOutlined,
    ArrowLeftOutlined,
    PictureOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import { campaignService } from '../../services/campaignService';
import { formatMoney } from '../../utils/helper';

const { TextArea } = Input;
const { confirm } = Modal;

const AdminCampaignDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);

    // States cho Modal Từ chối
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [rejectForm] = Form.useForm();

    useEffect(() => {
        const fetchCampaignDetail = async () => {
            setLoading(true);
            try {
                // Tái sử dụng API getById hiện có
                const data = await campaignService.getById(id);
                setCampaign(data);
            } catch (error) {
                console.error("Lỗi tải chi tiết", error);
                message.error("Không thể tải thông tin chiến dịch!");
            } finally {
                setLoading(false);
            }
        };
        fetchCampaignDetail();
    }, [id]);


    const imageUrlsArray = campaign?.imageUrls ? campaign.imageUrls.split(',') : [];
    const coverImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : 'https://placehold.co/800x400?text=No+Cover';
    const proofImages = imageUrlsArray.length > 1 ? imageUrlsArray.slice(1) : [];

    const handleImageError = (e) => {
        e.target.src = 'https://placehold.co/800x400/e2e8f0/475569?text=Image+Error';
    };


    const handleApprove = () => {
        confirm({
            title: 'Xác nhận duyệt chiến dịch?',
            icon: <ExclamationCircleOutlined />,
            content: 'Chiến dịch sẽ được chuyển sang trạng thái ACTIVE, hệ thống tự động tạo Quỹ và xuất hiện trên trang chủ.',
            okText: 'Đồng ý Duyệt',
            okButtonProps: { className: 'bg-green-500 hover:bg-green-600 border-none' },
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await campaignService.approveCampaign(id);
                    message.success('Đã duyệt chiến dịch thành công!');
                    navigate('/admin/campaigns'); // Trở về danh sách
                } catch (error) {
                    message.error(error.response?.data?.message || 'Lỗi khi duyệt chiến dịch');
                }
            },
        });
    };

    const submitReject = async (values) => {
        try {
            await campaignService.rejectCampaign(id, values.reason);
            message.success('Đã từ chối chiến dịch!');
            setIsRejectModalVisible(false);
            navigate('/admin/campaigns'); // Trở về danh sách
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi từ chối chiến dịch');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large" /></div>;
    if (!campaign) return <div className="text-center py-20 text-xl font-bold text-red-500">Không tìm thấy chiến dịch</div>;

    // Tính % (Mặc dù PENDING thường là 0%)
    const current = Number(campaign.currentAmount) || 0;
    const target = Number(campaign.targetAmount) || 0;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    const renderStatusTag = (status) => {
        const statusConfig = {
            PENDING: { color: 'orange', label: 'CHỜ DUYỆT' },
            ACTIVE: { color: 'blue', label: 'ĐANG CHẠY' },
            REJECTED: { color: 'red', label: 'ĐÃ TỪ CHỐI' },
            COMPLETED: { color: 'green', label: 'HOÀN THÀNH' },
            CLOSED: { color: 'default', label: 'ĐÃ ĐÓNG' },
        };
        const config = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={config.color} className="font-bold border-none px-3 py-1 rounded-full">{config.label}</Tag>;
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            {/* Thanh điều hướng */}
            <div className="mb-6 flex items-center justify-between">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/admin/campaigns')}
                    className="text-gray-500 hover:text-primary! font-semibold"
                >
                    Quay lại danh sách
                </Button>
                {renderStatusTag(campaign.status)}
            </div>

            <Row gutter={24}>
                {/* CỘT TRÁI (70%) - HỒ SƠ & MINH CHỨNG */}
                <Col xs={24} lg={16}>
                    <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <h1 className="text-3xl font-black text-primary! mb-4">{campaign.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                            <span>Danh mục: <strong className="text-primary!">{campaign.category}</strong></span>
                            <Divider type="vertical" />
                            <span>Loại: <strong className="text-primary!">{campaign.campaignType}</strong></span>
                            <Divider type="vertical" />
                            <span>Ngày tạo: <strong className="text-primary!">{new Date(campaign.startDate).toLocaleDateString('vi-VN')}</strong></span>
                            <Divider type="vertical" />
                            <span>Ngày kết thúc: <strong className="text-primary!">{new Date(campaign.endDate).toLocaleDateString('vi-VN')}</strong></span>
                        </div>

                        {/* Ảnh Cover */}
                        <div className="rounded-xl overflow-hidden mb-8 border border-gray-100 h-80">
                            <img
                                src={coverImage}
                                onError={handleImageError}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Câu chuyện */}
                        <div className="mb-10">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-brand! pl-3">Câu chuyện / Hoàn cảnh</h3>
                            <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-6 rounded-xl border border-gray-100">
                                {campaign.description}
                            </div>
                        </div>

                        {/* 👉 KHU VỰC ẢNH MINH CHỨNG (DÀNH RIÊNG CHO ADMIN SO SOI) */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-orange-500 pl-3 flex items-center gap-2">
                                <PictureOutlined /> Hình ảnh & Giấy tờ kiểm duyệt
                            </h3>
                            {proofImages.length === 0 ? (
                                <div className="text-red-500 italic p-4 bg-red-50 rounded-xl border border-red-100">
                                    Cảnh báo: Chiến dịch này không có ảnh minh chứng nào!
                                </div>
                            ) : (
                                <Image.PreviewGroup>
                                    <Row gutter={[16, 16]}>
                                        {proofImages.map((img, index) => (
                                            <Col xs={12} sm={8} key={index}>
                                                <div className="h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                                                    <Image
                                                        src={img}
                                                        fallback="https://placehold.co/400x400?text=Error"
                                                        alt={`Proof ${index}`}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                </Image.PreviewGroup>
                            )}
                        </div>
                    </Card>
                </Col>

                {/* CỘT PHẢI (30%) - TIẾN ĐỘ & BẢNG ĐIỀU KHIỂN DUYỆT */}
                <Col xs={24} lg={8}>
                    {/* Bảng thông tin tài chính */}
                    <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6 bg-blue-50/50">
                        <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-4">Thông số chiến dịch</h3>
                        <div className="mb-6">
                            <p className="text-gray-500 mb-1">Mục tiêu gọi vốn</p>
                            <p className="text-3xl font-black text-brand! m-0">{formatMoney(campaign.targetAmount)}</p>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                                <span>Đã huy động</span>
                                <span>{percent}%</span>
                            </div>
                            <Progress percent={percent} showInfo={false} strokeColor="#2563EB" />
                            <p className="text-right text-xs text-gray-500 mt-1">{formatMoney(campaign.currentAmount)}</p>
                        </div>

                        <Divider className="my-4" />

                        <div className="flex items-center gap-3">
                            <div className="bg-white p-3 rounded-full shadow-sm border border-gray-100">
                                <UserOutlined className="text-xl text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase m-0">Người đề xuất</p>
                                <p className="text-base font-bold text-gray-800 m-0">{campaign.createdBy?.fullName || 'N/A'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* BẢNG ĐIỀU KHIỂN ACTION (Chỉ hiện khi PENDING) */}
                    {campaign.status === 'PENDING' && (
                        <Card className="mt-4! rounded-2xl shadow-lg border-2 border-orange-200 bg-white">
                            <h3 className="font-bold text-center text-orange-600 mb-6 text-lg">Quyết định kiểm duyệt</h3>
                            <div className="flex flex-col gap-4">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                    className="bg-green-500 hover:bg-green-600 border-none h-14 text-lg font-bold rounded-xl shadow-md"
                                    onClick={handleApprove}
                                >
                                    PHÊ DUYỆT
                                </Button>
                                <Button
                                    danger
                                    size="large"
                                    icon={<StopOutlined />}
                                    className="h-14 text-lg font-bold rounded-xl"
                                    onClick={() => setIsRejectModalVisible(true)}
                                >
                                    TỪ CHỐI CHIẾN DỊCH
                                </Button>
                            </div>
                            <p className="text-xs text-gray-400 text-center mt-4 italic">
                                *Hành động này sẽ được ghi log hệ thống vĩnh viễn để phục vụ Audit.
                            </p>
                        </Card>
                    )}

                    {/* Hiển thị lý do từ chối nếu có */}
                    {campaign.status === 'REJECTED' && campaign.rejectionReason && (
                        <Card className="rounded-2xl shadow-sm border border-red-200 bg-red-50 mt-6">
                            <h4 className="font-bold text-red-600 mb-2">Lý do từ chối:</h4>
                            <p className="text-red-800 m-0">{campaign.rejectionReason}</p>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Modal Nhập lý do từ chối */}
            <Modal
                title={<span className="text-red-500 font-bold text-lg"><StopOutlined /> Từ chối Chiến dịch</span>}
                open={isRejectModalVisible}
                onCancel={() => {
                    setIsRejectModalVisible(false);
                    rejectForm.resetFields();
                }}
                footer={null}
                centered
            >
                <Form form={rejectForm} layout="vertical" onFinish={submitReject} className="mt-4">
                    <Form.Item
                        name="reason"
                        label={<span className="font-semibold">Vui lòng nhập lý do từ chối (bắt buộc):</span>}
                        rules={[{ required: true, message: 'Lý do từ chối không được để trống!' }]}
                        extra="Lý do này sẽ được gửi cho tình nguyện viên để họ cập nhật lại hồ sơ."
                    >
                        <TextArea rows={5} placeholder="Ví dụ: Hình ảnh chứng từ bệnh án không rõ nét, thiếu mộc đỏ của bệnh viện..." className="rounded-xl" />
                    </Form.Item>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button size="large" className="rounded-xl" onClick={() => setIsRejectModalVisible(false)}>Hủy bỏ</Button>
                        <Button size="large" type="primary" danger htmlType="submit" className="rounded-xl font-bold">
                            Xác nhận Từ chối
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminCampaignDetail;