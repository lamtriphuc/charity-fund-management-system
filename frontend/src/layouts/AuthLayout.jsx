import React from 'react';

import defaultBg from '../assets/charity-logo-full.png';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const AuthLayout = ({ title, subtitle, children }) => {
    return (
        <div className="h-screen flex bg-surface">

            {/* NỬA TRÁI: ẢNH BÌA */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <img
                    src={defaultBg}
                    alt="Charity Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 bg-page-bg lg:bg-surface relative">

                {/* 2. NÚT QUAY LẠI TRANG CHỦ (Ghim ở góc trên - phải) */}
                <Link
                    to="/"
                    className="absolute top-6 right-6 sm:top-10 sm:right-10 flex items-center gap-2 text-gray-500 font-medium hover:text-cta! transition-colors bg-gray-100 hover:bg-amber-50! px-4 py-2 rounded-full"
                >
                    <HomeOutlined className="text-lg" />
                    <span className="hidden sm:inline">Trang chủ</span>
                </Link>

                <div className="w-full max-w-md">

                    {/* Header dùng chung */}
                    <div className="mb-10 text-left">
                        <h2 className="text-4xl font-bold text-primary mb-2">{title}</h2>
                        {subtitle && <p className="text-gray-500 text-base m-0">{subtitle}</p>}
                    </div>

                    {/* LÕI FORM ĐƯỢC BƠM VÀO TỪ CÁC TRANG */}
                    {children}

                </div>
            </div>

        </div>
    );
};

export default AuthLayout;