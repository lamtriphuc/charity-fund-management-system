// src/components/AppHeader.jsx
import React from 'react';
import { Layout, Input, Button, Badge, Space, Dropdown, Avatar } from 'antd';
import { SearchOutlined, BellOutlined, UserOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const { Header } = Layout;

const AppHeader = () => {
    const navigate = useNavigate();

    const { isAuthenticated, user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: <Link to="/profile">Hồ sơ cá nhân</Link>,
        },
        ...(user?.role === 'ADMIN' ? [{
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: <Link to="/admin/dashboard">Bảng quản trị</Link>,
        }] : []),
        {
            type: 'divider',
        },
        {
            key: 'logout',
            danger: true,
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            onClick: handleLogout,
        },
    ];

    return (
        <Header className="bg-primary px-0 h-20 sticky top-0 z-50 shadow-md flex items-center">
            <div className="max-w-300 w-full mx-auto px-4 flex items-center justify-between">

                {/* PHẦN TRÁI: LOGO + SEARCH */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="text-white text-2xl font-black tracking-tighter hover:text-brand transition-all">
                        CHARITY<span className="text-cta">FUND</span>
                    </Link>

                    <div className="md:block w-80">
                        <Input
                            placeholder="Tìm chiến dịch cứu trợ..."
                            className="flex! items-center! rounded-full! pl-6! bg-white! border-none h-11 transition-all"
                            variant="borderless"
                            suffix={
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SearchOutlined className='' />}
                                    className="bg-none! border-none! w-8! h-8! flex items-center justify-center shadow-sm! m-0!"
                                />
                            }
                        />
                    </div>
                </div>

                {/* PHẦN PHẢI: NAV + ACTIONS */}
                <div className="flex items-center gap-8">
                    <nav className="hidden lg:flex items-center gap-6 text-white/80 font-semibold">
                        <Link to="/campaigns" className="hover:text-brand transition-colors">Chiến dịch</Link>
                        <Link to="/about" className="hover:text-brand transition-colors">Về chúng tôi</Link>
                        <Link to="/statements" className="hover:text-brand transition-colors">Minh bạch</Link>
                    </nav>

                    <Space size="large" className="text-white">
                        {isAuthenticated && (
                            <Badge count={3} size="small" offset={[0, 5]}>
                                <BellOutlined className="text-xl cursor-pointer hover:text-brand! transition-colors text-white!" />
                            </Badge>
                        )}

                        <div className="h-6 w-0.5 bg-white/20"></div>

                        {isAuthenticated ? (
                            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                                <Avatar
                                    size="large"
                                    src={user?.avatar}
                                    icon={<UserOutlined />}
                                    className="flex! items-center! cursor-pointer border-0! border-brand! hover:scale-110 transition-transform bg-slate-700!"
                                />
                            </Dropdown>
                        ) : (
                            <Link to="/login">
                                <Button
                                    type="primary"
                                    className="bg-cta! hover:bg-orange-600! border-none! font-bold px-8 rounded-full! h-11 flex items-center shadow-lg transition-transform m-0!"
                                >
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