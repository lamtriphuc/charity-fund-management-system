import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom'; // Bổ sung Link
import api from '../services/api';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                email: values.email,
                password: values.password,
            });

            localStorage.setItem('access_token', response.access_token);
            message.success('Đăng nhập thành công!');
            navigate('/admin/dashboard');
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-blue-700 mb-2">Quỹ Từ Thiện</h2>
                    <p className="text-gray-500 text-base m-0">Đăng nhập hệ thống quản trị</p>
                </div>

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
                            className="text-base py-2"
                            prefix={<UserOutlined className="text-gray-400" />}
                            placeholder="Email của bạn"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                        className="mb-2" // Giảm margin-bottom để dòng "Quên mật khẩu" xích lại gần hơn
                    >
                        <Input.Password
                            className="text-base py-2"
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="Mật khẩu"
                        />
                    </Form.Item>

                    {/* Dòng Quên mật khẩu */}
                    <div className="flex justify-end mb-6">
                        <Link
                            to="/forgot-password"
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                        >
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <Form.Item className="mb-0">
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-lg font-medium h-12 rounded-lg border-0"
                            loading={loading}
                        >
                            Đăng Nhập
                        </Button>
                    </Form.Item>
                </Form>

                {/* Dòng Đăng ký tài khoản */}
                <div className="text-center mt-6 text-gray-500 text-base">
                    Chưa có tài khoản?{' '}
                    <Link
                        to="/register"
                        className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
                    >
                        Đăng ký ngay
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default Login;