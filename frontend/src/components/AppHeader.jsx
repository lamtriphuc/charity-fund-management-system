import React, { useState, useEffect } from 'react';
import { Layout, Input, Button, Badge, Space, Dropdown, Avatar, Popover, List, Typography } from 'antd';
import { SearchOutlined, BellOutlined, UserOutlined, DashboardOutlined, LogoutOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { userService } from '../services/userService';

// Cấu hình thư viện thời gian
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header } = Layout;

const AppHeader = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuthStore();

    // States cho Thông báo
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // State cho Thanh Tìm kiếm
    const [searchValue, setSearchValue] = useState('');

    const fetchNotifications = async () => {
        try {
            const res = await userService.getMyNotifications();

            let notifs = res;

            if (!Array.isArray(notifs)) {
                notifs = [];
            }

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Lỗi lấy thông báo:", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();

            // Tùy chọn: Auto refresh thông báo mỗi 1 phút (Polling)
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleMarkAllAsRead = async () => {
        try {
            await userService.markAllAsRead();
            const updated = notifications.map(n => ({ ...n, isRead: true }));
            setNotifications(updated);
            setUnreadCount(0);
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc", error);
        }
    };

    // Thêm hàm click vào từng thông báo
    const handleNotificationClick = async (item) => {
        // 1. Đánh dấu đã đọc nếu chưa đọc
        if (!item.isRead) {
            try {
                await userService.markAsRead(item.id);
                setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Lỗi update trạng thái đọc", error);
            }
        }

        // 2. Đóng popover và chuyển hướng (nếu có actionLink)
        setIsNotifOpen(false);
        if (item.actionLink) {
            navigate(item.actionLink);
        }
    };

    // Hàm xử lý tìm kiếm
    const handleSearch = () => {
        if (searchValue.trim()) {
            // Đẩy từ khóa lên URL và chuyển sang trang danh sách chiến dịch
            navigate(`/campaigns?search=${encodeURIComponent(searchValue.trim())}`);
        } else {
            // Nếu người dùng ấn tìm kiếm mà không nhập gì, đưa về danh sách gốc
            navigate('/campaigns');
        }
    };

    const userMenuItems = [
        { key: 'profile', icon: <UserOutlined />, label: <Link to="/profile">Hồ sơ cá nhân</Link> },
        ...(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? [{
            key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Bảng quản trị</Link>,
        }] : []),
        ...(user?.role === 'AUDITOR' ? [{
            key: 'auditor', icon: <DashboardOutlined />, label: <Link to="/auditor/audit-logs">Trang Kiểm toán</Link>,
        }] : []),
        { type: 'divider' },
        { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ];

    const notificationContent = (
        <div className="w-100! max-h-96 flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-100">
                <strong className="text-gray-800 text-base">Thông báo</strong>
                {unreadCount > 0 && (
                    <Button type="link" size="small" className="text-xs p-0 text-brand" onClick={handleMarkAllAsRead}>
                        Đánh dấu đã đọc
                    </Button>
                )}
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <List
                    dataSource={notifications}
                    renderItem={(item) => {
                        const Icon = item.type === 'SUCCESS' ? CheckCircleOutlined
                            : item.type === 'URGENT' ? WarningOutlined
                                : InfoCircleOutlined;

                        const iconColor = item.type === 'SUCCESS' ? 'text-green-500'
                            : item.type === 'URGENT' ? 'text-red-500'
                                : 'text-blue-500';

                        return (
                            <List.Item
                                onClick={() => handleNotificationClick(item)}
                                className={`px-4! py-3! cursor-pointer hover:bg-gray-50 transition-colors ${!item.isRead ? 'bg-orange-50/30' : ''}`}>
                                <List.Item.Meta
                                    title={
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm ${!item.isRead ? 'font-bold text-gray-800' : 'font-medium text-gray-600'}`}>
                                                {item.title}
                                            </span>
                                        </div>
                                    }
                                    description={
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs ${!item.isRead ? 'text-gray-600' : 'text-gray-500'} line-clamp-2 leading-relaxed`}>
                                                {item.content}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1">{dayjs(item.createdAt).fromNow()}</span>
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                    locale={{ emptyText: <div className="p-4 text-gray-400">Không có thông báo nào</div> }}
                />
            </div>
        </div>
    );

    return (
        <Header className="bg-primary px-0 h-20 sticky top-0 z-50 shadow-md flex items-center">
            <div className="max-w-7xl w-full mx-auto px-4 flex items-center justify-between">

                {/* PHẦN TRÁI: LOGO + SEARCH */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="text-white text-2xl font-black tracking-tighter hover:text-brand transition-all">
                        CHARITY<span className="text-cta">FUND</span>
                    </Link>
                    <div className="hidden md:block w-80">
                        <Input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onPressEnter={handleSearch} // Cho phép Enter để tìm kiếm
                            placeholder="Tìm chiến dịch cứu trợ..."
                            className="flex! items-center! rounded-full! pl-6! bg-white! border-none h-11 transition-all"
                            variant="borderless"
                            suffix={
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SearchOutlined />}
                                    onClick={handleSearch} // Click icon cũng tìm kiếm
                                    className="bg-brand! border-none! w-8! h-8! flex items-center justify-center shadow-sm! m-0!"
                                />
                            }
                        />
                    </div>
                </div>

                {/* PHẦN PHẢI: NAV + ACTIONS */}
                <div className="flex items-center gap-8">
                    <nav className="hidden lg:flex items-center gap-6 text-white/80 font-semibold">
                        <Link to="/campaigns" className="hover:text-brand transition-colors">Chiến dịch</Link>
                        <Link to="/statements" className="hover:text-brand transition-colors">Sao kê</Link>
                        <Link to="/campaigns/propose">
                            <Button type="primary" className="bg-cta! hover:bg-orange-600! border-none! font-bold px-8 rounded-full! h-11 flex items-center shadow-lg transition-transform m-0!">
                                Tạo chiến dịch
                            </Button>
                        </Link>
                    </nav>

                    <Space size="large" className="text-white">
                        {isAuthenticated && (
                            <Popover
                                content={notificationContent}
                                trigger="click"
                                placement="bottomRight"
                                open={isNotifOpen}
                                onOpenChange={setIsNotifOpen}
                                overlayInnerStyle={{ padding: 0, borderRadius: '8px', overflow: 'hidden' }}
                            >
                                <Badge count={unreadCount} size="small" offset={[-2, 6]}>
                                    <BellOutlined className="text-[22px] cursor-pointer hover:text-brand! transition-colors text-white! mt-1" />
                                </Badge>
                            </Popover>
                        )}

                        <div className="h-6 w-0.5 bg-white/20"></div>

                        {isAuthenticated ? (
                            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                                <Avatar size="large" src={user?.avatar} icon={<UserOutlined />} className="flex! items-center! cursor-pointer border border-white/20 hover:border-brand! transition-colors bg-slate-700!" />
                            </Dropdown>
                        ) : (
                            <Link to="/login">
                                <Button type="primary" className="bg-cta! hover:bg-orange-600! border-none! font-bold px-8 rounded-full! h-11 flex items-center shadow-lg transition-transform m-0!">
                                    ĐĂNG NHẬP
                                </Button>
                            </Link>
                        )}
                    </Space>
                </div>
            </div>
        </Header>
    );
};

export default AppHeader;