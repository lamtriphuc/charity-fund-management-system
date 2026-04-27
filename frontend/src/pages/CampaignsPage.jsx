import React, { useState, useEffect } from 'react';
import { Input, Progress, Tag, Button, Empty, Spin } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { campaignService } from '../services/campaignService';

const { Search } = Input;

const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');

    // Hàm gọi API lấy dữ liệu
    const fetchCampaigns = async (searchQuery = '') => {
        setLoading(true);
        try {
            let res;
            if (searchQuery) {
                // Gọi vào Elasticsearch nếu có từ khóa
                res = await campaignService.search(searchQuery);
                // Cấu trúc BE trả về: { message, total, data: [...] }
                setCampaigns(res.data || []);
            } else {
                // Gọi API lấy tất cả nếu không có từ khóa
                res = await campaignService.getAll();
                setCampaigns(res.data || res || []); // Tùy cấu trúc BE của bạn
            }
        } catch (error) {
            console.error('Lỗi khi tải chiến dịch:', error);
        } finally {
            setLoading(false);
        }
    };

    // Chạy lần đầu khi mở trang
    useEffect(() => {
        // Tạm thời dùng mock data nếu BE chưa mở API GET /campaigns
        // Khi nào BE sẵn sàng, bạn bỏ comment hàm fetchCampaigns() nhé!

        // fetchCampaigns(); 

        // --- Bắt đầu Mock Data tạm thời ---
        setTimeout(() => {
            setCampaigns([
                { id: '1', title: 'Xây trường mầm non bản vùng cao', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop', targetAmount: 500000000, currentAmount: 350000000, daysLeft: 15, category: 'Giáo dục', status: 'Active' },
                { id: '2', title: 'Cứu trợ khẩn cấp lũ lụt miền Trung', image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop', targetAmount: 1000000000, currentAmount: 850000000, daysLeft: 3, category: 'Khẩn cấp', status: 'Active' },
                { id: '3', title: 'Phẫu thuật tim bẩm sinh cho bé An', image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop', targetAmount: 80000000, currentAmount: 20000000, daysLeft: 45, category: 'Y tế', status: 'Active' },
                { id: '4', title: 'Thư viện ước mơ cho trẻ em nghèo', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop', targetAmount: 120000000, currentAmount: 120000000, daysLeft: 0, category: 'Giáo dục', status: 'Completed' },
            ]);
            setLoading(false);
        }, 800);
        // --- Kết thúc Mock Data ---
    }, []);

    // Xử lý khi người dùng ấn Enter ở ô tìm kiếm
    const handleSearch = (value) => {
        setKeyword(value);
        fetchCampaigns(value);
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="w-full">

            {/* 1. HEADER TRANG */}
            <div className="bg-primary! rounded-2xl p-10 mb-10 text-center relative overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-brand! opacity-10 blur-3xl"></div>
                <h1 className="text-4xl font-black text-white! mb-4 relative z-10">
                    Khám Phá Chiến Dịch
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto relative z-10">
                    Tìm kiếm và chung tay góp sức vào những dự án từ thiện minh bạch. Mọi khoản đóng góp của bạn đều được ghi nhận trên Blockchain.
                </p>
            </div>

            {/* 2. BỘ LỌC & TÌM KIẾM */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-2 w-full md:w-auto pb-2 md:pb-0">
                    <Button type="primary" className="bg-primary! border-none! rounded-full! px-6!">Tất cả</Button>
                    <Button className="rounded-full! px-6!">Khẩn cấp</Button>
                    <Button className="rounded-full! px-6!">Giáo dục</Button>
                    <Button className="rounded-full! px-6!">Y tế</Button>
                    <Button icon={<FilterOutlined />} className="rounded-full! ml-auto">Lọc thêm</Button>
                </div>
            </div>

            {/* 3. DANH SÁCH CHIẾN DỊCH (Trạng thái Loading / Trống / Hiển thị) */}
            <Spin spinning={loading} size="large">
                {campaigns.length === 0 && !loading ? (
                    <div className="bg-white py-20 rounded-2xl border border-gray-100 shadow-sm">
                        <Empty description={<span className="text-gray-500 text-lg">Không tìm thấy chiến dịch nào phù hợp</span>} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {campaigns.map((camp) => {
                            const percent = Math.min(Math.round((camp.currentAmount / camp.targetAmount) * 100), 100);
                            const isCompleted = camp.status === 'Completed' || percent >= 100;

                            return (
                                <Link to={`/campaigns/${camp.id}`} key={camp.id} className="block">
                                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col h-full">

                                        {/* Ảnh Thumbnails */}
                                        <div className="relative h-56 overflow-hidden bg-gray-200">
                                            <img
                                                src={camp.image || 'https://via.placeholder.com/800x400'}
                                                alt={camp.title}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${isCompleted ? 'grayscale' : 'group-hover:scale-110'}`}
                                            />
                                            {/* Tag thể loại */}
                                            <Tag className="absolute top-4 left-4 bg-white/90! border-none! text-primary! font-bold px-3 py-1 rounded-md">
                                                {camp.category}
                                            </Tag>

                                            {/* Overlay nếu đã hoàn thành */}
                                            {isCompleted && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="bg-green-500! text-white! font-bold px-6 py-2 rounded-full border-2 border-white transform -rotate-12 text-lg">
                                                        ĐÃ ĐẠT MỤC TIÊU
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Nội dung thẻ */}
                                        <div className="p-6 flex flex-col flex-1">
                                            <h3 className="text-xl font-bold text-primary! line-clamp-2 mb-4 group-hover:text-brand! transition-colors">
                                                {camp.title}
                                            </h3>

                                            <div className="mt-auto">
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-sm font-semibold mb-1">
                                                        <span className="text-brand!">{formatMoney(camp.currentAmount)}</span>
                                                        <span className="text-gray-500">{percent}%</span>
                                                    </div>
                                                    <Progress
                                                        percent={percent}
                                                        showInfo={false}
                                                        strokeColor={isCompleted ? "#10B981" : "#2563EB"} // Xanh lá nếu xong, Xanh dương nếu đang chạy
                                                        trailColor="#E2E8F0"
                                                        className="m-0!"
                                                    />
                                                </div>

                                                <div className="flex justify-between text-sm text-gray-500 mb-6">
                                                    <span>Mục tiêu: {formatMoney(camp.targetAmount)}</span>
                                                    <span className={`font-medium ${camp.daysLeft <= 5 && !isCompleted ? 'text-red-500!' : 'text-cta!'}`}>
                                                        {isCompleted ? 'Đã đóng' : `${camp.daysLeft} ngày còn lại`}
                                                    </span>
                                                </div>

                                                <Button
                                                    type="primary"
                                                    disabled={isCompleted}
                                                    className={`w-full font-bold h-12 rounded-xl transition-colors ${isCompleted ? 'bg-gray-300! text-gray-500! border-none!' : 'bg-primary! hover:bg-brand! text-white!'
                                                        }`}
                                                >
                                                    {isCompleted ? 'XEM BÁO CÁO' : 'QUYÊN GÓP'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Spin>
        </div>
    );
};

export default CampaignsPage;