import React from 'react';
import { Button, Progress, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { HeartFilled, RightOutlined } from '@ant-design/icons';

// Dữ liệu mẫu (Mock data) - Sau này sẽ fetch từ API Backend của bạn
const mockCampaigns = [
    {
        id: '1',
        title: 'Xây trường mầm non bản vùng cao',
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
        target: 500000000,
        current: 350000000,
        daysLeft: 15,
        category: 'Giáo dục'
    },
    {
        id: '2',
        title: 'Cứu trợ khẩn cấp lũ lụt miền Trung',
        image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop',
        target: 1000000000,
        current: 850000000,
        daysLeft: 3,
        category: 'Khẩn cấp'
    },
    {
        id: '3',
        title: 'Phẫu thuật tim bẩm sinh cho bé An',
        image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop',
        target: 80000000,
        current: 20000000,
        daysLeft: 45,
        category: 'Y tế'
    }
];

const HomePage = () => {
    // Hàm format tiền tệ VNĐ
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

            {/* 2. SỐ LIỆU MINH BẠCH - Củng cố niềm tin */}
            <section className="max-w-300 mx-auto mb-20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Tổng quyên góp', value: '15.2 Tỷ' },
                        { label: 'Chiến dịch thành công', value: '142' },
                        { label: 'Nhà hảo tâm', value: '8,430' },
                        { label: 'Người được giúp đỡ', value: '50,000+' }
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

                {/* Grid 3 cột cho thẻ chiến dịch */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {mockCampaigns.map((camp) => {
                        const percent = Math.round((camp.current / camp.target) * 100);

                        return (
                            <div key={camp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
                                {/* Ảnh Thumbnails */}
                                <div className="relative h-56 overflow-hidden">
                                    <img
                                        src={camp.image}
                                        alt={camp.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <Tag className="absolute top-4 left-4 bg-white/90! border-none! text-primary! font-bold px-3 py-1 rounded-md">
                                        {camp.category}
                                    </Tag>
                                </div>

                                {/* Nội dung thẻ */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-xl font-bold text-primary! line-clamp-2 mb-4 group-hover:text-brand! transition-colors">
                                        {camp.title}
                                    </h3>

                                    <div className="mt-auto">
                                        {/* Thanh tiến độ */}
                                        <div className="mb-2">
                                            <div className="flex justify-between text-sm font-semibold mb-1">
                                                <span className="text-brand!">{formatMoney(camp.current)}</span>
                                                <span className="text-gray-500">{percent}%</span>
                                            </div>
                                            <Progress
                                                percent={percent}
                                                showInfo={false}
                                                strokeColor="#2563EB"
                                                trailColor="#E2E8F0"
                                                className="m-0!" // Xóa margin mặc định của Antd
                                            />
                                        </div>

                                        <div className="flex justify-between text-sm text-gray-500 mb-6">
                                            <span>Mục tiêu: {formatMoney(camp.target)}</span>
                                            <span className="font-medium text-cta!">{camp.daysLeft} ngày còn lại</span>
                                        </div>

                                        {/* Nút hành động */}
                                        <Button type="primary" className="w-full bg-primary! hover:bg-brand! text-white! font-bold h-12 rounded-xl transition-colors">
                                            QUYÊN GÓP
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

        </div>
    );
};

export default HomePage;