import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Statistic, Spin, message } from 'antd';
import { BankOutlined, CheckCircleOutlined, SyncOutlined, DollarOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { analyticService } from '../../services/analyticService'; // Điều chỉnh đường dẫn cho phù hợp

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // State chứa dữ liệu trả về từ API
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalFund: 0,
            pendingDisbursementsCount: 0,
            activeCampaignsCount: 0,
            totalDonationsCount: 0
        },
        recentDisbursements: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Gọi API backend lấy dữ liệu thật
                const res = await analyticService.getDashboardStats();

                const data = res.data || res;
                setDashboardData(data);
            } catch (error) {
                message.error("Lỗi tải dữ liệu Tổng quan Hệ thống!");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Xử lý tải báo cáo Excel
    const handleDownloadReport = async () => {
        setDownloading(true);
        try {
            const response = await analyticService.exportDisbursementReport();

            // Xử lý tạo file để trình duyệt tự động tải xuống
            const url = window.URL.createObjectURL(new Blob([response.data || response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'bao-cao-giai-ngan.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();

            message.success('Đã tải xuống báo cáo thành công!');
        } catch (error) {
            message.error('Lỗi khi tải báo cáo Excel!');
        } finally {
            setDownloading(false);
        }
    };

    // Cấu trúc lại mảng stats để render bằng hàm .map cho gọn
    const statCards = [
        { title: 'Tổng Quỹ Hệ Thống', value: dashboardData.stats.totalFund, prefix: '₫', icon: <BankOutlined className="text-brand!" /> },
        { title: 'Chờ Giải Ngân', value: dashboardData.stats.pendingDisbursementsCount, suffix: 'yêu cầu', icon: <SyncOutlined spin className="text-cta!" /> },
        { title: 'Chiến dịch Active', value: dashboardData.stats.activeCampaignsCount, icon: <CheckCircleOutlined className="text-green-500!" /> },
        { title: 'Lượt Quyên góp', value: dashboardData.stats.totalDonationsCount, icon: <DollarOutlined className="text-purple-500!" /> },
    ];

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-black text-primary! m-0">Tổng Quan Hệ Thống</h1>
                {/* <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    className="bg-green-600! hover:bg-green-700! border-none! font-bold"
                    loading={downloading}
                    onClick={handleDownloadReport}
                >
                    Xuất Báo cáo Giải ngân
                </Button> */}
            </div>

            {/* 4 THẺ THỐNG KÊ (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, idx) => (
                    <Card key={idx} className="rounded-2xl! shadow-sm border-gray-100! hover:shadow-md transition-shadow">
                        <Statistic
                            title={<span className="text-gray-500 font-bold">{stat.title}</span>}
                            value={stat.value}
                            prefix={stat.icon}
                            suffix={stat.suffix}
                            style={{ content: { fontWeight: 900, color: '#0F172A', marginTop: '8px' } }}
                            formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                        />
                    </Card>
                ))}
            </div>

            {/* BẢNG DUYỆT GIẢI NGÂN MỚI NHẤT */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-primary! m-0">Yêu cầu Giải ngân mới nhất</h2>
                    <Button
                        type="primary"
                        className="bg-primary! border-none! font-bold"
                        onClick={() => navigate('/admin/disbursements')} // Chuyển hướng sang trang Quản lý giải ngân
                    >
                        Xem tất cả
                    </Button>
                </div>

                <Table
                    dataSource={dashboardData.recentDisbursements}
                    rowKey="id"
                    pagination={false}
                    columns={[
                        {
                            title: 'Mã GD',
                            dataIndex: 'id',
                            render: (text) => <span className="font-mono text-xs text-gray-500">{text?.substring(0, 8).toUpperCase()}</span>
                        },
                        {
                            title: 'Chiến dịch',
                            dataIndex: 'campaignTitle',
                            render: (text) => <span className="font-bold text-primary!">{text}</span>
                        },
                        {
                            title: 'Số tiền rút',
                            dataIndex: 'amount',
                            render: (val) => <span className="text-cta! font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}</span>
                        },
                        {
                            title: 'Ngày yêu cầu',
                            dataIndex: 'requestDate',
                            render: (val) => new Date(val).toLocaleDateString('vi-VN')
                        },
                        {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            render: (status) => (
                                <Tag className={`border-none! font-bold px-3 py-1 rounded-full ${status.includes('PENDING') ? 'bg-orange-100! text-orange-600!' : 'bg-green-100! text-green-600!'}`}>
                                    {status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : status}
                                </Tag>
                            )
                        },
                        {
                            title: 'Thao tác',
                            align: 'right',
                            render: () => (
                                <Button
                                    type="primary"
                                    size="small"
                                    className="bg-brand! border-none! font-bold"
                                    onClick={() => navigate('/admin/disbursements')}
                                >
                                    Xử lý
                                </Button>
                            )
                        },
                    ]}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;