import React, { useEffect, useState } from 'react';
import { Button, Progress, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { HeartFilled, RightOutlined } from '@ant-design/icons';
import { campaignService } from '../services/campaignService';
// IMPORT THÊM SERVICE LẤY THỐNG KÊ (Đổi lại đường dẫn cho đúng với project của bạn)
import { analyticService } from '../services/analyticService';
import { formatMoney } from '../utils/helper';

// Hàm hỗ trợ rút gọn số tiền lớn (Ví dụ: 15.200.000.000 -> 15.2 Tỷ)
const formatCompactNumber = (number) => {
    if (!number) return '0';
    if (number >= 1000000000) return (number / 1000000000).toFixed(1) + ' Tỷ';
    if (number >= 1000000) return (number / 1000000).toFixed(1) + ' Triệu';
    return new Intl.NumberFormat('vi-VN').format(number);
};

const HomePage = () => {
    const [urgentCampaigns, setUrgentCampaigns] = useState([]);
    // Thêm State để lưu dữ liệu thống kê
    const [stats, setStats] = useState({
        totalFund: 0,
        activeCampaignsCount: 0,
        totalDonationsCount: 0
    });

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Chạy song song 2 API để tăng tốc độ load trang
                const [urgentRes, statsRes] = await Promise.all([
                    campaignService.getUrgent(),
                    analyticService.getDashboardStats()
                ]);

                // Set data chiến dịch
                setUrgentCampaigns(urgentRes.data || urgentRes);

                // Set data thống kê (Tùy thuộc backend trả về bọc trong data.stats hay trực tiếp)
                const statsData = statsRes.data?.stats || statsRes.stats || {};
                setStats({
                    totalFund: statsData.totalFund || 0,
                    activeCampaignsCount: statsData.activeCampaignsCount || 0,
                    totalDonationsCount: statsData.totalDonationsCount || 0
                });

            } catch (error) {
                console.error("Lỗi tải dữ liệu trang chủ", error);
            }
        };
        fetchHomeData();
    }, []);

    const handleImageError = (e) => {
        e.target.src = 'https://placehold.co/800x400/e2e8f0/475569?text=Image+Not+Found';
    };

    return (
        <div className="w-full">

            {/* 1. HERO BANNER - Cảm xúc & Kêu gọi hành động */}
            <section className="relative w-full h-120 bg-primary flex items-center justify-center overflow-hidden rounded-2xl mb-16 shadow-lg">
                <img
                    src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop"
                    alt="Hero"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                />
                <div className="relative z-10 text-center max-w-2xl px-4">
                    <h1 className="text-5xl font-black text-white! mb-6 leading-tight">
                        Một hành động nhỏ, <br /> triệu niềm hy vọng mới
                    </h1>
                    <p className="text-lg text-gray-300 mb-10">
                        Nền tảng quyên góp minh bạch 100% ứng dụng công nghệ Blockchain. Mọi khoản tiền đều được theo dõi và báo cáo công khai.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/campaigns">
                            <Button type="primary" className="bg-cta! border-none! text-white! h-14 px-8 text-lg font-bold rounded-full hover:scale-105 transition-transform shadow-lg">
                                QUYÊN GÓP NGAY <HeartFilled />
                            </Button>
                        </Link>
                        <Link to="/transparency">
                            <Button className="bg-white/10! border-white/30! text-white! h-14 px-8 text-lg font-bold rounded-full hover:bg-white/20! transition-colors">
                                XEM SAO KÊ
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* 2. SỐ LIỆU MINH BẠCH - Đã được đấu nối API */}
            <section className="max-w-300 mx-auto mb-20">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Tổng quyên góp', value: formatCompactNumber(stats.totalFund) },
                        { label: 'Chiến dịch hoạt động', value: new Intl.NumberFormat('vi-VN').format(stats.activeCampaignsCount) },
                        { label: 'Lượt quyên góp', value: new Intl.NumberFormat('vi-VN').format(stats.totalDonationsCount) },
                    ].map((stat, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
                            <h3 className="text-4xl font-black text-brand! mb-2">{stat.value}</h3>
                            <p className="text-gray-500 font-medium m-0">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. DANH SÁCH CHIẾN DỊCH NỔI BẬT */}
            <section className="max-w-300 mx-auto mb-16">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-primary! mb-2">Chiến dịch cấp bách</h2>
                        <p className="text-gray-500 text-base m-0">Những hoàn cảnh đang cần sự chung tay của cộng đồng ngay lúc này.</p>
                    </div>
                    <Link to="/campaigns" className="text-brand! font-semibold hover:text-blue-800! items-center gap-1 hidden sm:flex">
                        Xem tất cả <RightOutlined className="text-xs" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {urgentCampaigns.map((camp) => {
                        const current = Number(camp.currentAmount) || 0;
                        const target = Number(camp.targetAmount) || 0;

                        const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

                        let daysLeft = 0;
                        if (camp.endDate) {
                            const endDate = new Date(camp.endDate);
                            const today = new Date();
                            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                            daysLeft = diffDays > 0 ? diffDays : 0;
                        }

                        const imageUrlsArray = camp.imageUrls ? camp.imageUrls.split(',') : [];
                        const coverImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : 'https://placehold.co/800x400/e2e8f0/475569?text=No+Image';

                        return (
                            <div key={camp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
                                <Link to={`/campaigns/${camp.id}`} className='cursor-pointer'>
                                    <div className="relative h-56 overflow-hidden">
                                        <img
                                            src={coverImage}
                                            alt={camp.title}
                                            onError={handleImageError}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4 z-20 bg-blue-600 text-white font-bold px-3 py-1 rounded shadow-md text-xs uppercase tracking-wide">
                                            {camp.category || 'CHIẾN DỊCH'}
                                        </div>
                                    </div>

                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-xl font-bold text-primary! line-clamp-2 mb-4 group-hover:text-brand! transition-colors">
                                            {camp.title}
                                        </h3>

                                        <div className="mt-auto">
                                            <div className="mb-2">
                                                <div className="flex justify-between text-sm font-semibold mb-1">
                                                    <span className="text-brand!">{formatMoney(current)}</span>
                                                    <span className="text-gray-500">{percent}%</span>
                                                </div>
                                                <Progress
                                                    percent={percent}
                                                    showInfo={false}
                                                    strokeColor="#2563EB"
                                                    className="m-0!"
                                                />
                                            </div>

                                            <div className="flex justify-between text-sm text-gray-500 mb-6">
                                                <span>Mục tiêu: {formatMoney(target)}</span>
                                                <span className="font-medium text-cta!">{daysLeft} ngày còn lại</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default HomePage;