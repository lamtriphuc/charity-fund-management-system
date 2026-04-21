import React, { useState } from 'react';
import { Form, Input, Button, message, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../services/api';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-10">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-blue-700 mb-2">Quên Mật Khẩu?</h2>
                    <p className="text-gray-500 text-base m-0">
                        Đừng lo, hãy nhập email của bạn để nhận liên kết đặt lại mật khẩu.
                    </p>
                </div>

                {/* Nếu đã gửi thành công thì ẩn form, hiện thông báo */}
                {isSent ? (
                    <div className="mb-6">
                        <Alert
                            message="Kiểm tra hộp thư của bạn"
                            description="Chúng tôi đã gửi một liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục Spam nếu không thấy."
                            type="success"
                            showIcon
                            className="text-base"
                        />
                    </div>
                ) : (
                    <Form
                        name="forgot_password_form"
                        layout="vertical"
                        onFinish={onFinish}
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập Email!' },
                                { type: 'email', message: 'Email không đúng định dạng!' }
                            ]}
                        >
                            <Input
                                className="text-base py-2"
                                prefix={<MailOutlined className="text-gray-400" />}
                                placeholder="Nhập email tài khoản của bạn"
                            />
                        </Form.Item>

                        <Form.Item className="mt-6 mb-0">
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-lg font-medium h-12 rounded-lg border-0"
                                loading={loading}
                            >
                                Gửi Yêu Cầu
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                <div className="text-center mt-8 text-base">
                    <Link
                        to="/login"
                        className="text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeftOutlined /> Quay lại trang đăng nhập
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default ForgotPassword;