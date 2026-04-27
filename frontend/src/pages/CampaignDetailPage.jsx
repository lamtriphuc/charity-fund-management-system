import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Progress, Button, Tag, Tabs, Table, Avatar, Card } from 'antd';
import { HeartFilled, ShareAltOutlined, HistoryOutlined, SafetyOutlined } from '@ant-design/icons';
import { campaignService } from '../services/campaignService';

const CampaignDetailPage = () => {
    const { id } = useParams();
    const [campaign, setCampaign] = useState(null);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Giả lập Fetch data (Thay bằng fetch thực tế từ campaignService)
        setTimeout(() => {
            setCampaign({
                id,
                title: 'Xây trường mầm non bản vùng cao',
                description: 'Hiện tại các em nhỏ tại bản... đang phải học trong ngôi trường tạm bợ bằng tranh tre nứa lá. Chúng tôi kêu gọi cộng đồng chung tay xây dựng 3 phòng học kiên cố...',
                image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
                targetAmount: 500000000,
                currentAmount: 350000000,
                daysLeft: 15,
                category: 'Giáo dục',
                organizer: 'Quỹ Hy Vọng',
                verified: true
            });
            setDonations([
                { id: '1', name: 'Nguyễn Văn A', amount: 500000, time: '2 giờ trước', message: 'Chúc các con sớm có trường mới' },
                { id: '2', name: 'Mạnh thường quân', amount: 10000000, time: '5 giờ trước', message: 'Chung tay vì cộng đồng' },
                { id: '3', name: 'Ẩn danh', amount: 200000, time: '1 ngày trước', message: '' },
            ]);
            setLoading(false);
        }, 500);
    }, [id]);

    if (loading) return <div className="text-center py-20 text-xl font-bold">Đang tải dữ liệu...</div>;

    const percent = Math.round((campaign.currentAmount / campaign.targetAmount) * 100);
    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="max-w-300 mx-auto py-10 px-4">
            {/* Header: Title & Category */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Tag className="bg-brand! border-none! text-white! px-4 py-1 rounded-full text-sm font-bold">{campaign.category}</Tag>
                    {campaign.verified && <span className="flex items-center gap-1 text-green-600 font-semibold"><SafetyOutlined /> Đã xác thực minh bạch</span>}
                </div>
                <h1 className="text-4xl font-black text-primary! leading-tight">{campaign.title}</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* CỘT TRÁI (70%) - NỘI DUNG */}
                <div className="lg:w-2/3">
                    <div className="rounded-3xl overflow-hidden mb-10 shadow-lg">
                        <img src={campaign.image} alt="Banner" className="w-full h-100 object-cover" />
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
                                                Toàn bộ dòng tiền của chiến dịch này được quản lý bằng Sổ cái (Ledger) và xác thực bằng chữ ký số. Bạn có thể kiểm tra mã băm Blockchain của từng giao dịch ở tab "Minh bạch".
                                            </p>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: '2',
                                label: <span className="font-bold px-4">Minh bạch (Audit Trail)</span>,
                                children: (
                                    <div className="py-6">
                                        <Table
                                            dataSource={donations}
                                            columns={[
                                                { title: 'Người ủng hộ', dataIndex: 'name', key: 'name', render: (text) => <span className="font-bold">{text}</span> },
                                                { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: (val) => <span className="text-brand! font-bold">{formatMoney(val)}</span> },
                                                { title: 'Thời gian', dataIndex: 'time', key: 'time' },
                                                { title: 'Lời chúc', dataIndex: 'message', key: 'message', className: 'text-gray-500 italic' }
                                            ]}
                                            pagination={false}
                                            className="border border-gray-100 rounded-xl overflow-hidden"
                                        />
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>

                {/* CỘT PHẢI (30%) - WIDGET QUYÊN GÓP (STICKY) */}
                <div className="lg:w-1/3">
                    <div className="sticky top-28 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl font-black text-brand!">{formatMoney(campaign.currentAmount)}</span>
                                <span className="text-gray-500 font-bold">{percent}%</span>
                            </div>
                            <Progress percent={percent} showInfo={false} strokeColor="#2563EB" strokeWidth={12} className="m-0!" />
                            <p className="mt-4 text-gray-500 text-base font-medium">
                                Mục tiêu: <span className="text-primary! font-bold">{formatMoney(campaign.targetAmount)}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl text-center">
                                <p className="text-xs text-gray-400 uppercase font-bold m-0">Người đóng góp</p>
                                <p className="text-xl font-bold text-primary! m-0">{donations.length}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl text-center">
                                <p className="text-xs text-gray-400 uppercase font-bold m-0">Ngày còn lại</p>
                                <p className="text-xl font-bold text-cta! m-0">{campaign.daysLeft}</p>
                            </div>
                        </div>

                        <Button
                            type="primary"
                            className="w-full bg-cta! h-16 rounded-2xl text-xl font-black text-white! border-none! shadow-lg shadow-orange-200! hover:scale-105 transition-transform"
                        >
                            QUYÊN GÓP NGAY
                        </Button>

                        <div className="mt-6 flex gap-4">
                            <Button className="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 border-gray-200!">
                                <ShareAltOutlined /> Chia sẻ
                            </Button>
                            <Button className="h-12 w-12 rounded-xl flex items-center justify-center border-gray-200!">
                                <HeartFilled className="text-red-500" />
                            </Button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-4">
                            <Avatar size={48} className="bg-brand!">QT</Avatar>
                            <div>
                                <p className="text-xs text-gray-400 font-bold m-0 uppercase">Tổ chức thực hiện</p>
                                <p className="text-base font-bold text-primary! m-0">{campaign.organizer}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailPage;