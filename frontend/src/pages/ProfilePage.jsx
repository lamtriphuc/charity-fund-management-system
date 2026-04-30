import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Upload, Avatar, Card, Tag, message, Result, Spin, notification } from 'antd';
import {
    UserOutlined,
    IdcardOutlined,
    CameraOutlined,
    UploadOutlined,
    LoadingOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';
import { userService } from '../services/userService';

const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
};

const getRoleName = role => {
    switch (role) {
        case 'ADMIN': return 'QUẢN TRỊ VIÊN (ADMIN)';
        case 'DONOR': return 'NHÀ HẢO TÂM (DONOR)';
        case 'VOLUNTEER': return 'TÌNH NGUYỆN VIÊN (VOLUNTEER)';
        case 'AUDITOR': return 'BAN KIỂM SOÁT (AUDITOR)';
        default: return 'NGƯỜI DÙNG (USER)';
    }
}

const ProfilePage = () => {
    const { user, updateUser } = useAuthStore();
    const [form] = Form.useForm();

    const [kycStatus, setKycStatus] = useState('none'); // none, pending, verified
    const [isUploading, setIsUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar);

    // STATE LƯU 3 FILE KYC
    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [portraitFile, setPortraitFile] = useState(null);
    const [kycLoading, setKycLoading] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || '',
                address: user.address || ''
            });
            // Đồng bộ trạng thái KYC từ Backend (chuyển về chữ thường để khớp với UI)
            setKycStatus(user.kycStatus?.toLowerCase() || 'none');
        }
    }, [user, form]);

    const handleCustomUpload = async (options) => {
        const { file, onSuccess, onError } = options;
        setIsUploading(true);
        try {
            getBase64(file, (url) => setAvatarUrl(url));
            const response = await userService.updateAvatar(file);
            const newUrl = response.data?.avatarUrl || response.data?.avatar || response.avatarUrl;

            updateUser({ avatar: newUrl });
            onSuccess("ok");
            message.success('Cập nhật ảnh đại diện thành công!');
        } catch (error) {
            console.error(error);
            setAvatarUrl(user?.avatar);
            onError("error");
            message.error(error.response?.data?.message || 'Lỗi khi tải ảnh lên server!');
        } finally {
            setIsUploading(false);
        }
    };

    const onUpdateProfile = (values) => {
        message.success('Cập nhật thông tin thành công!');
    };

    // HÀM XỬ LÝ GỬI KYC LÊN BACKEND
    const onSubmitKYC = async () => {
        if (!frontFile || !backFile || !portraitFile) {
            return message.error('Vui lòng tải lên đầy đủ 3 ảnh (Mặt trước, mặt sau và chân dung)!');
        }

        const formData = new FormData();
        formData.append('frontImage', frontFile);
        formData.append('backImage', backFile);
        formData.append('portraitImage', portraitFile);

        setKycLoading(true);
        try {
            // Giả định bạn có hàm submitKyc trong userService
            const response = await userService.submitKyc(formData);

            // Hiện thông báo chứa tên quét được từ FPT (nếu có)
            const extractedName = response.data?.extractedInfo?.name;
            notification.success({
                message: 'Gửi hồ sơ thành công!',
                description: extractedName
                    ? `Hệ thống ghi nhận hồ sơ của: ${extractedName}. Vui lòng chờ admin duyệt.`
                    : 'Hồ sơ của bạn đã được gửi và đang chờ duyệt.',
            });

            // Cập nhật trạng thái giao diện và Zustand Store
            setKycStatus('pending');
            updateUser({ kycStatus: 'PENDING' });

        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ!');
        } finally {
            setKycLoading(false);
        }
    };

    return (
        <div className="max-w-300 mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-10">

                {/* 1. SIDEBAR: TÓM TẮT THÔNG TIN */}
                <div className="w-full md:w-80">
                    <Card className="rounded-3xl! shadow-sm border-none! text-center p-4">
                        <div className="relative inline-block mb-6 group cursor-pointer">
                            <Upload
                                name="avatar"
                                showUploadList={false}
                                customRequest={handleCustomUpload}
                                accept="image/png, image/jpeg, image/webp"
                            >
                                <Spin spinning={isUploading} description="Đang tải..." indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large">
                                    <Avatar
                                        size={120}
                                        src={avatarUrl}
                                        icon={<UserOutlined />}
                                        className={`border-4 border-white! shadow-md bg-brand! transition-opacity object-cover! ${isUploading ? 'opacity-50' : 'group-hover:opacity-80'}`}
                                    />
                                </Spin>
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
                                {getRoleName(user?.role)}
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
                                            />
                                        ) : kycStatus === 'pending' ? (
                                            <Result
                                                status="info"
                                                title={<span className="text-xl font-bold">Hồ sơ đang chờ duyệt</span>}
                                                subTitle="Chúng tôi đang kiểm tra tài liệu của bạn bằng hệ thống AI và con người. Quá trình này thường mất từ 12-24 giờ làm việc."
                                            />
                                        ) : (
                                            <Form layout="vertical" onFinish={onSubmitKYC}>
                                                <div className="bg-orange-50 p-6 rounded-2xl mb-8 border border-orange-100">
                                                    <h4 className="text-cta! font-bold mb-2">Tại sao cần xác thực?</h4>
                                                    <p className="text-gray-600 m-0 text-sm">Hệ thống sẽ dùng AI để trích xuất thông tin từ giấy tờ. Vui lòng chụp rõ nét, không bị chói sáng để hệ thống tự động nhận diện.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    {/* MẶT TRƯỚC */}
                                                    <div>
                                                        <p className="font-bold mb-2">1. Ảnh mặt trước</p>
                                                        <Upload.Dragger
                                                            className="bg-slate-50! rounded-2xl!"
                                                            maxCount={1}
                                                            accept="image/*"
                                                            beforeUpload={(file) => { setFrontFile(file); return false; }}
                                                            onRemove={() => setFrontFile(null)}
                                                        >
                                                            <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand!" /></p>
                                                            <p className="text-xs text-gray-400 px-2">Tải ảnh mặt trước CCCD</p>
                                                        </Upload.Dragger>
                                                    </div>

                                                    {/* MẶT SAU */}
                                                    <div>
                                                        <p className="font-bold mb-2">2. Ảnh mặt sau</p>
                                                        <Upload.Dragger
                                                            className="bg-slate-50! rounded-2xl!"
                                                            maxCount={1}
                                                            accept="image/*"
                                                            beforeUpload={(file) => { setBackFile(file); return false; }}
                                                            onRemove={() => setBackFile(null)}
                                                        >
                                                            <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand!" /></p>
                                                            <p className="text-xs text-gray-400 px-2">Tải ảnh mặt sau CCCD</p>
                                                        </Upload.Dragger>
                                                    </div>

                                                    {/* CHÂN DUNG */}
                                                    <div>
                                                        <p className="font-bold mb-2">3. Ảnh chân dung</p>
                                                        <Upload.Dragger
                                                            className="bg-slate-50! rounded-2xl!"
                                                            maxCount={1}
                                                            accept="image/*"
                                                            beforeUpload={(file) => { setPortraitFile(file); return false; }}
                                                            onRemove={() => setPortraitFile(null)}
                                                        >
                                                            <p className="ant-upload-drag-icon"><CameraOutlined className="text-brand!" /></p>
                                                            <p className="text-xs text-gray-400 px-2">Selfie khuôn mặt hiện tại</p>
                                                        </Upload.Dragger>
                                                    </div>
                                                </div>

                                                <Button loading={kycLoading} type="primary" htmlType="submit" className="bg-cta! mt-2 border-none! h-14 px-12 font-black rounded-xl! shadow-lg shadow-orange-100!">
                                                    {kycLoading ? 'ĐANG QUÉT AI...' : 'GỬI HỒ SƠ XÁC THỰC'}
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