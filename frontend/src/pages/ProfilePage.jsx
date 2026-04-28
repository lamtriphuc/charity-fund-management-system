import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Upload, Avatar, Card, Tag, message, Space, Result } from 'antd';
import {
    UserOutlined,
    IdcardOutlined,
    CameraOutlined,
    UploadOutlined,
    CheckCircleFilled,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';

const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
};

const ProfilePage = () => {
    const { user } = useAuthStore();
    const [form] = Form.useForm();
    const [kycStatus, setKycStatus] = useState('none'); // none, pending, verified

    const [avatarUrl, setAvatarUrl] = useState(user?.avatar);

    const handleAvatarChange = (info) => {
        // Ant Design có nhiều trạng thái upload, ta bắt trạng thái 'done' hoặc khi vừa chọn file
        if (info.file.status === 'done' || info.file.status === 'uploading') {
            // Lấy file thật ra và đổi thành Base64 để hiển thị
            getBase64(info.file.originFileObj, (url) => {
                setAvatarUrl(url);
                message.success('Đã tải lên ảnh đại diện mới!');
                // TODO: Gọi API lưu file lên Server (Ví dụ: profileService.updateAvatar(info.file.originFileObj))
            });
        }
    };

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || '',
                address: user.address || ''
            });
            setKycStatus(user.kycStatus || 'none');
        }
    }, [user, form]);

    const onUpdateProfile = (values) => {
        message.success('Cập nhật thông tin thành công!');
    };

    const onSubmitKYC = (values) => {
        setKycStatus('pending');
        message.loading('Đang gửi hồ sơ xác thực...', 2)
            .then(() => message.success('Hồ sơ của bạn đã được gửi. Admin sẽ duyệt trong 24h!'));
    };

    return (
        <div className="max-w-300 mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-10">

                {/* 1. SIDEBAR: TÓM TẮT THÔNG TIN */}
                <div className="w-full md:w-80">
                    <Card className="rounded-3xl! shadow-sm border-none! text-center p-4">
                        {/* KHU VỰC AVATAR ĐÃ ĐƯỢC BỌC TRONG THẺ UPLOAD */}
                        <div className="relative inline-block mb-6 group cursor-pointer">
                            <Upload
                                name="avatar"
                                showUploadList={false} // Ẩn danh sách file mặc định của Antd
                                customRequest={({ file, onSuccess }) => {
                                    // Chặn Antd tự gọi API mặc định, giả lập gọi thành công
                                    setTimeout(() => { onSuccess("ok") }, 0);
                                }}
                                onChange={handleAvatarChange}
                                accept="image/png, image/jpeg" // Chỉ nhận ảnh
                            >
                                <Avatar
                                    size={120}
                                    src={avatarUrl}
                                    icon={<UserOutlined />}
                                    className="border-4 border-white! shadow-md bg-brand! group-hover:opacity-80 transition-opacity"
                                />

                                {/* Nút Camera đè lên Avatar */}
                                <div className="absolute bottom-1 right-1 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md text-gray-500 group-hover:text-brand! group-hover:scale-110 transition-all">
                                    <CameraOutlined />
                                </div>
                            </Upload>
                        </div>

                        <h2 className="text-2xl font-black text-primary! mb-1">{user?.fullName}</h2>
                        <p className="text-gray-500 mb-4">{user?.email}</p>

                        {kycStatus === 'verified' ? (
                            <Tag color="green" className="border-none! px-4 py-1 rounded-full font-bold">
                                <SafetyCertificateOutlined /> TÌNH NGUYỆN VIÊN
                            </Tag>
                        ) : (
                            <Tag color="default" className="border-none! px-4 py-1 rounded-full font-bold">
                                NHÀ HẢO TÂM (DONOR)
                            </Tag>
                        )}

                        <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xl font-black text-brand! m-0">12</p>
                                <p className="text-xs text-gray-400 font-bold uppercase">Chiến dịch</p>
                            </div>
                            <div>
                                <p className="text-xl font-black text-cta! m-0">15.5tr</p>
                                <p className="text-xs text-gray-400 font-bold uppercase">Đã góp</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 2. NỘI DUNG CHÍNH: TABS */}
                <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <Tabs
                        defaultActiveKey="1"
                        size="large"
                        items={[
                            {
                                key: '1',
                                label: <span className="font-bold"><UserOutlined /> Thông tin cá nhân</span>,
                                children: (
                                    <Form form={form} layout="vertical" onFinish={onUpdateProfile} className="mt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                            <Form.Item name="fullName" label={<span className="font-bold">Họ và Tên</span>}>
                                                <Input className="h-12! rounded-lg!" />
                                            </Form.Item>
                                            <Form.Item name="email" label={<span className="font-bold">Email</span>}>
                                                <Input className="h-12! rounded-lg!" disabled />
                                            </Form.Item>
                                            <Form.Item name="phone" label={<span className="font-bold">Số điện thoại</span>}>
                                                <Input className="h-12! rounded-lg!" placeholder="Chưa cập nhật" />
                                            </Form.Item>
                                            <Form.Item name="address" label={<span className="font-bold">Địa chỉ</span>}>
                                                <Input className="h-12! rounded-lg!" placeholder="Chưa cập nhật" />
                                            </Form.Item>
                                        </div>
                                        <Button type="primary" htmlType="submit" className="bg-primary! border-none! h-12 px-10 font-bold rounded-lg! mt-4">
                                            LƯU THAY ĐỔI
                                        </Button>
                                    </Form>
                                )
                            },
                            {
                                key: '2',
                                label: <span className="font-bold"><IdcardOutlined /> Xác thực KYC / Volunteer</span>,
                                children: (
                                    <div className="mt-6">
                                        {kycStatus === 'verified' ? (
                                            <Result
                                                status="success"
                                                title={<span className="text-2xl font-black text-primary!">Bạn đã là Tình nguyện viên chính thức!</span>}
                                                subTitle="Tài khoản của bạn đã được xác thực danh tính. Bây giờ bạn có thể tham gia các hoạt động cứu trợ khẩn cấp của hệ thống."
                                                extra={[<Button type="primary" key="home" className="bg-brand! border-none! rounded-lg!">VỀ TRANG CHỦ</Button>]}
                                            />
                                        ) : kycStatus === 'pending' ? (
                                            <Result
                                                status="info"
                                                title="Hồ sơ đang chờ duyệt"
                                                subTitle="Chúng tôi đang kiểm tra tài liệu của bạn. Quá trình này thường mất từ 12-24 giờ làm việc."
                                            />
                                        ) : (
                                            <Form layout="vertical" onFinish={onSubmitKYC}>
                                                <div className="bg-orange-50 p-6 rounded-2xl mb-8 border border-orange-100">
                                                    <h4 className="text-cta! font-bold mb-2">Tại sao cần xác thực?</h4>
                                                    <p className="text-gray-600 m-0 text-sm">Để đảm bảo tính minh bạch, chỉ những người dùng đã xác thực danh tính (KYC) mới được phép tham gia điều phối các chiến dịch cứu trợ trực tiếp.</p>
                                                </div>

                                                <Form.Item label={<span className="font-bold">Số CMND / CCCD / Hộ chiếu</span>} required>
                                                    <Input className="h-12! rounded-lg!" placeholder="Nhập số giấy tờ tùy thân" />
                                                </Form.Item>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                    <div>
                                                        <p className="font-bold mb-2">Ảnh mặt trước</p>
                                                        <Upload.Dragger className="bg-slate-50! rounded-2xl!">
                                                            <p className="ant-upload-drag-icon"><UploadOutlined className="text-brand!" /></p>
                                                            <p className="text-xs text-gray-400">Tải ảnh mặt trước CCCD</p>
                                                        </Upload.Dragger>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold mb-2">Ảnh mặt sau</p>
                                                        <Upload.Dragger className="bg-slate-50! rounded-2xl!">
                                                            <p className="ant-upload-drag-icon"><UploadOutlined className="text-brand!" /></p>
                                                            <p className="text-xs text-gray-400">Tải ảnh mặt sau CCCD</p>
                                                        </Upload.Dragger>
                                                    </div>
                                                </div>

                                                <Button type="primary" htmlType="submit" className="bg-cta! mt-4 border-none! h-14 px-12 font-black rounded-xl! shadow-lg shadow-orange-100!">
                                                    GỬI HỒ SƠ XÁC THỰC
                                                </Button>
                                            </Form>
                                        )}
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;