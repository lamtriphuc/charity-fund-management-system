import React from 'react';

import defaultBg from '../assets/charity-logo-full.png';

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

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 bg-page-bg lg:bg-surface">
                <div className="w-full max-w-md">

                    {/* Header dùng chung */}
                    <div className="mb-10 text-left">
                        <h2 className="text-4xl font-bold text-primary mb-2">{title}</h2>
                        {subtitle && <p className="text-gray-500 text-base m-0">{subtitle}</p>}
                    </div>

                    {children}

                </div>
            </div>

        </div>
    );
};

export default AuthLayout;