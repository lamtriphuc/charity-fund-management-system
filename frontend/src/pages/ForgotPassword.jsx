import React, { useState } from 'react';
import { Form, Input, Button, message, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AuthLayout from '../layouts/AuthLayout';

const ForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Gọi API gửi email reset pass
            await api.post('/auth/forgot-password', { email: values.email });

            // Đổi trạng thái thành đã gửi thành công
            setIsSent(true);
            message.success('Đã gửi hướng dẫn khôi phục mật khẩu!');
        } catch (error) {
            message.error(error.response?.data?.message || 'Không tìm thấy tài khoản với email này!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Quên Mật Khẩu?"
            subtitle="Đừng lo, hãy nhập email của bạn để nhận liên kết đặt lại mật khẩu."
        >
            {isSent ? (
                <div className="mb-6">
                    <Alert message="Kiểm tra hộp thư của bạn" description="Chúng tôi đã gửi một liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục Spam nếu không thấy." type="success" showIcon className="text-base py-3" />
                </div>
            ) : (
                <Form name="forgot_password_form" layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email!' }]}>
                        <Input className="text-base py-3" prefix={<MailOutlined className="text-gray-400 mr-2" />} placeholder="Nhập email tài khoản của bạn" />
                    </Form.Item>

                    <Form.Item className="mt-6 mb-0">
                        <Button type="primary" htmlType="submit" className="w-full bg-cta hover:opacity-90 text-white text-lg font-bold h-14 rounded-xl border-0 shadow-md" loading={loading}>
                            GỬI YÊU CẦU
                        </Button>
                    </Form.Item>
                </Form>
            )}

            <div className="text-center mt-8 text-base">
                <Link to="/login" className="text-gray-500 hover:text-brand transition-colors flex items-center justify-center gap-2">
                    <ArrowLeftOutlined /> Quay lại trang đăng nhập
                </Link>
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;