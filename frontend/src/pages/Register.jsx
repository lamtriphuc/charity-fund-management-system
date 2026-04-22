import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AuthLayout from '../layouts/AuthLayout';

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
        <AuthLayout
            title="Tạo Tài Khoản"
            subtitle="Tham gia nền tảng Quỹ Từ Thiện"
        >
            <Form name="register_form" layout="vertical" onFinish={onFinish} size="large">
                <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}>
                    <Input className="text-base py-3" prefix={<UserOutlined className="text-gray-400 mr-2" />} placeholder="Họ và tên của bạn" />
                </Form.Item>

                <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}>
                    <Input className="text-base py-3" prefix={<MailOutlined className="text-gray-400 mr-2" />} placeholder="Email" />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}>
                    <Input.Password className="text-base py-3" prefix={<LockOutlined className="text-gray-400 mr-2" />} placeholder="Mật khẩu" />
                </Form.Item>

                <Form.Item name="retype-password" rules={[{ required: true, message: 'Vui lòng nhập lại Mật khẩu!' }]}>
                    <Input.Password className="text-base py-1" prefix={<LockOutlined className="text-gray-400 mr-2" />} placeholder="Nhập lại mật khẩu" />
                </Form.Item>

                <Form.Item className="mb-0 mt-4">
                    <Button type="primary" htmlType="submit" className="w-full bg-cta hover:opacity-80 text-white text-lg font-bold h-14 rounded-xl border-0 shadow-md" loading={loading}>
                        ĐĂNG KÝ
                    </Button>
                </Form.Item>
            </Form>

            <div className="text-center mt-8 text-gray-500 text-base">
                Đã có tài khoản? <Link to="/login" className="text-brand font-semibold hover:text-blue-400 transition-colors">Đăng nhập</Link>
            </div>
        </AuthLayout>
    );
};

export default Register;