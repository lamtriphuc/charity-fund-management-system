import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Progress, Button, Tag, Tabs, Table, Avatar, Card, Timeline, Image, Empty } from 'antd';
import {
    SafetyOutlined,
    FileProtectOutlined,
    SafetyCertificateOutlined,
    SettingOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';
import { campaignService } from '../services/campaignService';
import { disbursementService } from '../services/disbursementService';
import { formatMoney } from '../utils/helper';

const CampaignDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore(); // Lấy thông tin user đăng nhập để check quyền

    const [campaign, setCampaign] = useState(null);
    const [donations, setDonations] = useState([]);
    const [publicDisbursements, setPublicDisbursements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCampaignDetail = async () => {
            setLoading(true);
            try {
                // Chạy song song 3 API để tối ưu tốc độ load trang
                const [campaignRes, donationRes, disbRes] = await Promise.all([
                    campaignService.getById(id),
                    campaignService.getDonations(id).catch(() => []), // Giả sử có API này
                    disbursementService.getPublicTransparency(id).catch(() => ({ data: [] }))
                ]);

                setCampaign(campaignRes.data || campaignRes);
                setDonations(donationRes.data || donationRes || []);
                setPublicDisbursements(disbRes.data || disbRes || []);
            } catch (error) {
                console.error("Lỗi tải chi tiết chiến dịch", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaignDetail();
    }, [id]);

    if (loading || !campaign) return <div className="text-center py-20 text-xl font-bold">Đang tải dữ liệu...</div>;

    // Kiểm tra xem User hiện tại có phải là chủ chiến dịch không
    const isOwner = user && campaign.createdBy && user.id === campaign.createdBy.id;

    const current = Number(campaign.currentAmount) || 0;
    const target = Number(campaign.targetAmount) || 0;
    const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    let daysLeft = 0;
    if (campaign.endDate) {
        const endDate = new Date(campaign.endDate);
        const today = new Date();
        const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        daysLeft = diffDays > 0 ? diffDays : 0;
    }

    const imageUrlsArray = campaign.imageUrls ? campaign.imageUrls.split(',') : [];
    const coverImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : 'https://placehold.co/800x400/e2e8f0/475569?text=No+Image';

    const handleImageError = (e) => {
        e.target.src = 'https://placehold.co/800x400/e2e8f0/475569?text=Image+Not+Found';
    };

    // UI render phần Timeline giải ngân
    const renderTransparencyTab = () => {
        if (publicDisbursements.length === 0) {
            return (
                <Empty
                    description="Chiến dịch này chưa có đợt giải ngân nào được thực hiện."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="my-10"
                />
            );
        }

        return (
            <div className="py-6">
                <h3 className="text-2xl font-black text-primary! mb-8 flex items-center gap-2">
                    <FileProtectOutlined /> Nhật ký Sử dụng Vốn
                </h3>

                <div className="flex flex-col gap-6">
                    {publicDisbursements.map((item) => (
                        <Card key={item.id} className="w-full rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                            {/* Dòng Header: Ngày tháng và Tiêu đề */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-100">
                                <div>
                                    <h4 className="text-lg font-bold text-brand! m-0">{item.title}</h4>
                                    <div className="text-sm text-gray-500 font-medium mt-1">
                                        Thực hiện ngày: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <div className="text-right mt-3 sm:mt-0">
                                    <span className="text-xl font-black text-red-500 bg-red-50 px-3 py-1 rounded-lg">
                                        - {formatMoney(Number(item.amount))}
                                    </span>
                                    <div className="text-xs text-gray-400 mt-2 font-mono">Mã ĐS: {item.txReference}</div>
                                </div>
                            </div>

                            {/* Dòng Nội dung: Mục đích */}
                            <div className="mb-4">
                                <span className="text-gray-500 font-semibold mr-2">Mục đích giải ngân:</span>
                                <span className="text-gray-800">{item.purpose}</span>
                            </div>

                            {/* Dòng Chứng từ */}
                            <div className="pt-4 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl border-t border-gray-100">
                                <h5 className="font-semibold text-sm mb-3 flex items-center gap-1 text-green-600">
                                    <SafetyCertificateOutlined /> Bằng chứng Kế toán (Đã kiểm toán)
                                </h5>

                                {item.proofs && item.proofs.length > 0 ? (
                                    <Image.PreviewGroup>
                                        <div className="flex flex-wrap gap-3">
                                            {item.proofs.map((proof) => (
                                                <div key={proof.id} className="relative group cursor-pointer bg-white p-1 border border-gray-200 rounded-lg">
                                                    <Image
                                                        width={120}
                                                        height={120}
                                                        src={proof.fileUrl}
                                                        className="rounded object-cover"
                                                    />
                                                    <div className="absolute bottom-1 left-1 right-1 bg-black/80 text-white text-[10px] p-1.5 truncate rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Hash: {proof.digitalSignature}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Image.PreviewGroup>
                                ) : (
                                    <span className="text-gray-400 italic text-sm">Chưa cập nhật hóa đơn.</span>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-300 mx-auto py-10 px-4">
            {/* Header: Title & Category & Admin/Owner Button */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Tag className="bg-brand! border-none! text-white! px-4 py-1 rounded-full text-sm font-bold">{campaign.category}</Tag>
                        {/* {campaign.status === 'ACTIVE' && (
                            <span className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full text-sm">
                                <SafetyOutlined /> Đã xác thực minh bạch
                            </span>
                        )} */}
                    </div>
                    <h1 className="text-4xl font-black text-primary! leading-tight m-0">{campaign.title}</h1>
                </div>

                {/* NÚT QUẢN LÝ CHO CHỦ CHIẾN DỊCH */}
                {isOwner && (
                    <Button
                        type="primary"
                        icon={<SettingOutlined />}
                        className="bg-gray-800 hover:bg-black! border-none h-12 px-6 rounded-xl font-bold shadow-md"
                        onClick={() => navigate(`/campaigns/${campaign.id}/manage`)}
                    >
                        Quản lý & Rút tiền
                    </Button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* CỘT TRÁI (70%) - NỘI DUNG */}
                <div className="lg:w-2/3">
                    <div className="rounded-3xl overflow-hidden mb-8 shadow-sm border border-gray-100">
                        <img
                            src={coverImage}
                            onError={handleImageError}
                            alt="Banner"
                            className="w-full h-100 object-cover"
                        />
                    </div>

                    <Tabs
                        defaultActiveKey="1"
                        size="large"
                        className="custom-tabs"
                        items={[
                            {
                                key: '1',
                                label: <span className="font-bold px-4">Câu chuyện</span>,
                                children: (
                                    <div className="py-6 text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                                        {campaign.description}
                                        <div className="mt-10 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                            <h4 className="font-bold text-primary! mb-2">Cam kết minh bạch</h4>
                                            <p className="text-base m-0 text-blue-800">
                                                Toàn bộ dòng tiền của chiến dịch này được quản lý bằng Sổ cái (Ledger) và xác thực bằng chữ ký số. Bạn có thể kiểm tra ở tab "Sao kê & Minh chứng".
                                            </p>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: '2',
                                label: <span className="font-bold px-4">Người ủng hộ</span>,
                                children: (
                                    <div className="py-6">
                                        <Table
                                            dataSource={donations}
                                            columns={[
                                                { title: 'Nhà hảo tâm', dataIndex: 'donorName', key: 'name', render: (text) => <span className="font-bold">{text || 'Nhà hảo tâm ẩn danh'}</span> },
                                                { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: (val) => <span className="text-brand! font-bold">+{formatMoney(val)}</span> },
                                                { title: 'Thời gian', dataIndex: 'createdAt', key: 'time', render: (val) => new Date(val).toLocaleString('vi-VN') },
                                                { title: 'Lời nhắn', dataIndex: 'message', key: 'message', className: 'text-gray-500 italic' }
                                            ]}
                                            pagination={{ pageSize: 10 }}
                                            className="border border-gray-100 rounded-xl overflow-hidden"
                                        />
                                    </div>
                                )
                            },
                            {
                                // 👉 TAB 3: SAO KÊ CHI PHÍ VÀ CHỨNG TỪ
                                key: '3',
                                label: <span className="font-bold px-4">Minh chứng</span>,
                                children: renderTransparencyTab()
                            }
                        ]}
                    />
                </div>

                {/* CỘT PHẢI (30%) - WIDGET QUYÊN GÓP (STICKY) */}
                <div className="lg:w-1/3">
                    <div className="sticky top-28 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl font-black text-brand!">{formatMoney(current)}</span>
                                <span className="text-gray-500 font-bold">{percent}%</span>
                            </div>
                            <Progress percent={percent} showInfo={false} strokeColor="#2563EB" strokeWidth={12} className="m-0!" />
                            <p className="mt-4 text-gray-500 text-base font-medium">
                                Mục tiêu: <span className="text-primary! font-bold">{formatMoney(target)}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl text-center">
                                <p className="text-xs text-gray-400 uppercase font-bold m-0">Người đóng góp</p>
                                <p className="text-xl font-bold text-primary! m-0">{donations.length}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl text-center">
                                <p className="text-xs text-gray-400 uppercase font-bold m-0">Ngày còn lại</p>
                                <p className="text-xl font-bold text-cta! m-0">{daysLeft}</p>
                            </div>
                        </div>

                        {campaign.status === 'ACTIVE' ? (
                            <Link to={`/campaigns/${campaign.id}/donate`}>
                                <Button type="primary" className="w-full bg-cta! h-16 rounded-2xl text-xl font-black text-white! border-none! shadow-lg shadow-orange-200! hover:scale-105 transition-transform">
                                    ỦNG HỘ NGAY
                                </Button>
                            </Link>
                        ) : (
                            <Button disabled className="w-full h-16 rounded-2xl text-xl font-black bg-gray-200 text-gray-500 border-none">
                                CHIẾN DỊCH ĐÃ ĐÓNG
                            </Button>
                        )}

                        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-4">
                            <Avatar size={48} src={campaign.createdBy?.avatar} className="bg-brand!">
                                {campaign.createdBy?.fullName?.charAt(0) || 'QT'}
                            </Avatar>
                            <div>
                                <p className="text-xs text-gray-400 font-bold m-0 uppercase">Tổ chức thực hiện</p>
                                <p className="text-base font-bold text-primary! m-0">
                                    {campaign.createdBy?.fullName || campaign.organizer || 'Tình nguyện viên'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailPage;