import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
    DashboardOutlined,
    ProjectOutlined,
    BankOutlined,
    UserOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenu = [
        { key: 'home', label: <Link to="/">Về trang chủ (User)</Link> },
        { type: 'divider' },
        { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ];

    return (
        <Layout className="h-full">
            {/* THANH MENU BÊN TRÁI */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                className="shadow-xl z-20 min-h-screen"
                width={260}
            >
                <div className="h-20 flex items-center justify-center border-b border-white/10">
                    <h1 className={`text-white! font-black transition-all ${collapsed ? 'text-xl' : 'text-2xl'}`}>
                        {collapsed ? 'CF' : <>CHARITY<span className="text-cta!">FUND</span></>}
                    </h1>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    className="bg-transparent! mt-4 font-medium"
                    items={[
                        { key: '/admin/dashboard', icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Tổng quan</Link> },
                        { key: '/admin/campaigns', icon: <ProjectOutlined />, label: <Link to="/admin/campaigns">Quản lý Chiến dịch</Link> },
                        { key: '/admin/ledger', icon: <BankOutlined />, label: <Link to="/admin/ledger">Sổ cái (Ledger)</Link> },
                        { key: '/admin/users', icon: <UserOutlined />, label: <Link to="/admin/users">Người dùng</Link> },
                    ]}
                />
            </Sider>

            {/* PHẦN NỘI DUNG BÊN PHẢI */}
            <Layout className="bg-page-bg!">
                {/* HEADER TRẮNG CỦA ADMIN */}
                <Header className="bg-white! px-8 flex items-center justify-between shadow-sm z-10">
                    <h2 className="text-xl font-bold text-primary! m-0">Hệ thống Quản trị</h2>
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-600 hidden sm:block">Xin chào, {user?.fullName || 'Admin'}</span>
                        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                            <Avatar src={user?.avatar} icon={<UserOutlined />} className="cursor-pointer bg-brand!" />
                        </Dropdown>
                    </div>
                </Header>

                {/* VÙNG CHỨA NỘI DUNG CÁC TRANG ADMIN */}
                <Content className="p-8 overflow-y-auto">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;