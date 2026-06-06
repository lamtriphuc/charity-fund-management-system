import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
    SafetyCertificateOutlined,
    FileSearchOutlined,
    UserOutlined,
    LogoutOutlined,
    BankOutlined
} from '@ant-design/icons';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const { Header, Sider, Content } = Layout;

const AuditorLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    // Sử dụng đúng chuẩn destructuring như bạn yêu cầu
    const { user: currentUser, logout } = useAuthStore();
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
        <Layout className="h-full! min-h-screen!">
            {/* THANH MENU BÊN TRÁI */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                className="shadow-xl z-20 bg-slate-900!" // Đổi màu xíu để phân biệt với Admin
                width={260}
            >
                <div className="h-20 flex items-center justify-center border-b border-white/10">
                    <h1 className={`text-white! font-black transition-all ${collapsed ? 'text-xl' : 'text-xl'}`}>
                        {collapsed ? 'CF' : <>AUDITOR<span className="text-cta!"> PORTAL</span></>}
                    </h1>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    className="bg-transparent! mt-4 font-medium"
                    items={[
                        {
                            key: '/auditor/audit-logs',
                            icon: <SafetyCertificateOutlined />,
                            label: <Link to="/auditor/audit-logs">Nhật ký Kiểm toán</Link>
                        },
                        {
                            key: '/auditor/proofs',
                            icon: <FileSearchOutlined />,
                            label: <Link to="/auditor/proofs">Kiểm toán Chứng từ</Link>
                        },
                        {
                            key: '/auditor/ledger',
                            icon: <BankOutlined />,
                            label: <Link to="/auditor/ledger">Sổ cái</Link>
                        }
                    ]}
                />
            </Sider>

            {/* PHẦN NỘI DUNG BÊN PHẢI */}
            <Layout className="bg-page-bg!">
                <Header className="bg-white! px-8 flex items-center justify-between shadow-sm z-10">
                    <h2 className="text-xl font-bold text-slate-800 m-0">Ban Kiểm Soát Hệ Thống</h2>
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-600 hidden sm:block">
                            Xin chào, {currentUser?.fullName || 'Kiểm toán viên'}
                        </span>
                        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                            <Avatar src={currentUser?.avatar} icon={<UserOutlined />} className="cursor-pointer bg-slate-700!" />
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-8 overflow-y-auto">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AuditorLayout;