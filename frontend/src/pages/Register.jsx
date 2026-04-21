import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Giả định API Backend của bạn là /auth/register
            await api.post('/auth/register', {
                fullName: values.fullName,
                email: values.email,
                password: values.password,
            });

            message.success('Đăng ký thành công! Vui lòng đăng nhập.');
            // Chuyển về trang đăng nhập sau khi thành công
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-10">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-blue-700 mb-2">Tạo Tài Khoản</h2>
                    <p className="text-gray-500 text-base m-0">Tham gia nền tảng Quỹ Từ Thiện</p>
                </div>

                <Form
                    name="register_form"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="fullName"
                        rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                    >
                        <Input
                            className="text-base py-2"
                            prefix={<UserOutlined className="text-gray-400" />}
                            placeholder="Họ và tên của bạn"
                        />
                    </Form.Item>

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
                            placeholder="Email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                        ]}
                    >
                        <Input.Password
                            className="text-base py-2"
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="Mật khẩu"
                        />
                    </Form.Item>

                    {/* Validate Confirm Password bằng hàm dependencies của Antd */}
                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận Mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Hai mật khẩu không khớp nhau!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            className="text-base py-2"
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="Xác nhận lại mật khẩu"
                        />
                    </Form.Item>

                    <Form.Item className="mt-6 mb-0">
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="w-full bg-green-600 hover:bg-green-700 text-lg font-medium h-12 rounded-lg border-0"
                            loading={loading}
                        >
                            Đăng Ký
                        </Button>
                    </Form.Item>
                </Form>

                <div className="text-center mt-6 text-gray-500 text-base">
                    Đã có tài khoản?{' '}
                    <Link
                        to="/login"
                        className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
                    >
                        Đăng nhập
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default Register;