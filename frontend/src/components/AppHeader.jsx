// src/components/AppHeader.jsx
import React from 'react';
import { Layout, Input, Button, Badge, Space } from 'antd';
import { SearchOutlined, BellOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Header } = Layout;

const AppHeader = () => {
    return (
        <Header className="bg-primary px-0 h-20 sticky top-0 z-50 shadow-md flex items-center">
            <div className="max-w-300 w-full mx-auto px-4 flex items-center justify-between">

                {/* PHẦN TRÁI: LOGO + SEARCH */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="text-white text-2xl font-black tracking-tighter hover:text-brand transition-all">
                        CHARITY<span className="text-cta">FUND</span>
                    </Link>

                    <div className="hidden md:block w-75">
                        <Input
                            placeholder="Tìm chiến dịch cứu trợ..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            className="rounded-full bg-slate-800 border-none text-white hover:bg-slate-700 focus:bg-slate-700 h-11 transition-all"
                            variant="filled"
                        />
                    </div>
                </div>

                {/* PHẦN PHẢI: NAV + ACTIONS */}
                <div className="flex items-center gap-8">
                    <nav className="hidden lg:flex items-center gap-6 text-white/80 font-semibold">
                        <Link to="/campaigns" className="hover:text-brand transition-colors">Chiến dịch</Link>
                        <Link to="/about" className="hover:text-brand transition-colors">Về chúng tôi</Link>
                        <Link to="/transparency" className="hover:text-brand transition-colors">Minh bạch</Link>
                    </nav>

                    <Space size="large" className="text-white">
                        <Badge count={3} size="small" offset={[0, 5]}>
                            <BellOutlined className="text-xl cursor-pointer hover:text-brand transition-colors text-white!" />
                        </Badge>

                        <div className="h-6 w-0.5 bg-white/20"></div>

                        <Link to="/login">
                            <Button
                                type="primary"
                                className="bg-cta hover:scale-105 border-none font-bold px-8 rounded-full h-11 flex items-center shadow-lg transition-transform"
                            >
                                ĐĂNG NHẬP
                            </Button>
                        </Link>
                    </Space>
                </div>
            </div>
        </Header>
    );
};

export default AppHeader;