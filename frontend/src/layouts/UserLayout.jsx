import React from 'react';
import { Layout, Input, Button, Badge, Space } from 'antd';
import {
    SearchOutlined,
    BellOutlined,
    UserOutlined,
    MenuOutlined
} from '@ant-design/icons';
import { Link, Outlet } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const { Header, Content, Footer } = Layout;

const UserLayout = () => {
    return (
        <Layout className="min-h-screen bg-page-bg">

            <AppHeader />

            <Content className="py-10">
                <div className="max-w-300 mx-auto px-4">
                    <Outlet />
                </div>
            </Content>

            <AppFooter />

        </Layout>
    );
};

export default UserLayout;