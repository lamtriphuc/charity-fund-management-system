// src/components/AppFooter.jsx
import React from 'react';
import { Layout, Input } from 'antd';
import { Link } from 'react-router-dom';

const { Footer } = Layout;

const AppFooter = () => {
    return (
        <Footer className="bg-white border-t border-gray-200 pt-16 pb-8">
            <div className="max-w-300 mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <h3 className="text-2xl font-black text-primary mb-6">CHARITY<span className="text-brand">FUND</span></h3>
                        <p className="text-gray-500 leading-relaxed text-base">
                            Nền tảng kết nối những tấm lòng vàng, mang lại sự giúp đỡ kịp thời cho những hoàn cảnh khó khăn nhất.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary mb-6 uppercase text-sm tracking-[2px]">Khám phá</h4>
                        <ul className="space-y-3 text-gray-500 text-base">
                            <li><Link to="/campaigns" className="hover:text-brand">Tất cả chiến dịch</Link></li>
                            <li><Link to="/how-it-works" className="hover:text-brand">Cách thức hoạt động</Link></li>
                            <li><Link to="/emergency" className="hover:text-brand">Cứu trợ khẩn cấp</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary mb-6 uppercase text-sm tracking-[2px]">Cộng đồng</h4>
                        <ul className="space-y-3 text-gray-500 text-base">
                            <li><Link to="/volunteer" className="hover:text-brand">Tình nguyện viên</Link></li>
                            <li><Link to="/partner" className="hover:text-brand">Đối tác tin cậy</Link></li>
                            <li><Link to="/contact" className="hover:text-brand">Liên hệ hỗ trợ</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary mb-6 uppercase text-sm tracking-[2px]">Tin tức</h4>
                        <p className="text-gray-500 text-sm mb-4">Đăng ký để nhận báo cáo minh bạch hàng tháng.</p>
                        <Input.Search
                            placeholder="Email của bạn"
                            enterButton="Gửi"
                            className="rounded-lg"
                            size="large"
                        />
                    </div>
                </div>
                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
                    <p>© 2024 CharityFund System. Blockchain Verified Transparency.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-gray-600">Quyền riêng tư</Link>
                        <Link to="/terms" className="hover:text-gray-600">Điều khoản</Link>
                    </div>
                </div>
            </div>
        </Footer>
    );
};

export default AppFooter;