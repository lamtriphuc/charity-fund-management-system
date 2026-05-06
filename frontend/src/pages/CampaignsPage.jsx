import React, { useState, useEffect } from 'react';
import { Input, Progress, Tag, Button, Empty, Spin, Pagination } from 'antd';
import { SearchOutlined, FilterOutlined, LoadingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { calculateDaysLeft, formatMoney } from '../utils/helper';

const { Search } = Input;

const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true);
            try {
                const res = await campaignService.search(keyword, selectedCategory, currentPage, 9);

                const responseData = res?.data?.data || res?.data || [];
                const responseMeta = res?.data?.meta || res?.meta || {};

                setCampaigns(Array.isArray(responseData) ? responseData : []);
                setTotalItems(responseMeta.totalItems || 0);
            } catch (error) {
                console.error('Lỗi khi tải chiến dịch:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCampaigns();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [keyword, selectedCategory, currentPage]);

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
                <Search
                    placeholder="Tìm tên chiến dịch..."
                    allowClear
                    onSearch={(value) => setKeyword(value)}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full md:w-80!"
                />

                <div className="flex gap-2 w-full md:w-auto pb-2 md:pb-0 overflow-x-auto">
                    {['Tất cả', 'Khẩn cấp', 'Giáo dục', 'Y tế'].map(cat => (
                        <Button
                            key={cat}
                            type={selectedCategory === cat ? "primary" : "default"}
                            className={`${selectedCategory === cat ? 'bg-primary! border-none!' : ''} rounded-full! px-6!`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* 3. DANH SÁCH CHIẾN DỊCH (Trạng thái Loading / Trống / Hiển thị) */}
            <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}>
                {campaigns.length === 0 && !loading ? (
                    <div className="bg-white py-20 rounded-2xl border border-gray-100 shadow-sm">
                        <Empty description={<span className="text-gray-500 text-lg">Không tìm thấy chiến dịch nào phù hợp</span>} />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {campaigns.map((camp) => {
                                const percent = Math.min(Math.round((camp.currentAmount / camp.targetAmount) * 100), 100);
                                const isCompleted = camp.status === 'COMPLETED' || percent >= 100;

                                const daysLeft = calculateDaysLeft(camp.endDate);

                                return (
                                    <Link to={`/campaigns/${camp.id}`} key={camp.id} className="block">
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col h-full">

                                            {/* Ảnh Thumbnails */}
                                            <div className="relative h-56 overflow-hidden bg-gray-200">
                                                <img
                                                    src={camp.imageUrl || 'https://via.placeholder.com/800x400'}
                                                    alt={camp.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                {/* Tag thể loại */}
                                                <Tag className="absolute top-4 left-4 bg-white/90! border-none! text-primary! font-bold px-3 py-1 rounded-md">
                                                    {camp.category}
                                                </Tag>

                                                {/* Overlay nếu đã hoàn thành */}
                                                <span className={`font-medium ${daysLeft <= 5 && !isCompleted ? 'text-red-500!' : 'text-cta!'}`}>
                                                    {isCompleted ? 'Đã đóng' : `${daysLeft} ngày còn lại`}
                                                </span>
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
                                                            status="#E2E8F0"
                                                            className="m-0!"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between text-sm text-gray-500 mb-6">
                                                        <span>Mục tiêu: {formatMoney(camp.targetAmount)}</span>
                                                        <span className={`font-medium ${camp.daysLeft <= 5 && !isCompleted ? 'text-red-500!' : 'text-cta!'}`}>
                                                            {isCompleted ? 'Đã đóng' : `${camp.daysLeft} ngày còn lại`}
                                                        </span>
                                                    </div>

                                                    <Link to={`/campaigns/${camp.id}/donate`}>
                                                        <Button
                                                            type="primary"
                                                            disabled={isCompleted}
                                                            className={`w-full font-bold h-12 rounded-xl transition-colors ${isCompleted ? 'bg-gray-300! text-gray-500! border-none!' : 'bg-primary! hover:bg-brand! text-white!'
                                                                }`}
                                                        >
                                                            {isCompleted ? 'XEM BÁO CÁO' : 'QUYÊN GÓP'}
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {totalItems > 0 && (
                            <div className="flex justify-center mt-12 mb-8">
                                <Pagination
                                    current={currentPage}
                                    total={totalItems}
                                    pageSize={9} // Khớp với limit gọi API
                                    onChange={(page) => {
                                        setCurrentPage(page);
                                        // Cuộn lên đầu lưới sau khi chuyển trang cho đẹp
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    showSizeChanger={false}
                                    className="font-medium!"
                                />
                            </div>
                        )}
                    </>
                )}
            </Spin>
        </div>
    );
};

export default CampaignsPage;