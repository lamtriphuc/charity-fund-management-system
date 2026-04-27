import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

import loginBg from '../assets/charity-logo.png'
import AuthLayout from '../layouts/AuthLayout';
import useAuthStore from '../store/authStore';
import { authService } from '../services/authService';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const loginFn = useAuthStore((state) => state.login);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await authService.login({
                email: values.email,
                password: values.password,
            });

            loginFn(response.user, response.accessToken);
            message.success('Đăng nhập thành công!');

            if (response.user?.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Đăng Nhập"
            subtitle="Chào mừng bạn quay trở lại với hệ thống quản trị."
        >
            <Form
                name="login_form"
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
                        className="text-base py-3"
                        prefix={<UserOutlined className="text-gray-400 mr-2" />}
                        placeholder="Email của bạn"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                    className="mb-2"
                >
                    <Input.Password
                        className="text-base py-3"
                        prefix={<LockOutlined className="text-gray-400 mr-2" />}
                        placeholder="Mật khẩu"
                    />
                </Form.Item>

                {/* Nút Quên mật khẩu căn phải */}
                <div className="flex justify-end mb-8">
                    <Link
                        to="/forgot-password"
                        className="text-brand hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                        Quên mật khẩu?
                    </Link>
                </div>

                <Form.Item className="mb-0">
                    <Button
                        type="primary"
                        htmlType="submit"
                        className="w-full text-white text-lg font-bold h-14 rounded-xl border-0 shadow-md transition-all"
                        loading={loading}
                    >
                        ĐĂNG NHẬP
                    </Button>
                </Form.Item>
            </Form>

            {/* Link sang trang đăng ký */}
            <div className="text-center mt-8 text-gray-500 text-base">
                Chưa có tài khoản?{' '}
                <Link
                    to="/register"
                    className="text-brand font-semibold hover:text-blue-800 transition-colors"
                >
                    Đăng ký ngay
                </Link>
            </div>
        </AuthLayout>
    );
};

export default Login;