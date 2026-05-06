import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Upload, Avatar, Card, Tag, message, Result, Spin, notification, Image, Descriptions, Select, DatePicker } from 'antd'; // THÊM Select
import {
    UserOutlined,
    IdcardOutlined,
    CameraOutlined,
    LoadingOutlined,
    SafetyCertificateOutlined,
    DeleteOutlined,
    BankOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';
import { userService } from '../services/userService';
import dayjs from 'dayjs';

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
    const [bankingForm] = Form.useForm();

    const [kycStatus, setKycStatus] = useState('none');
    const [isUploading, setIsUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar);

    // state lưu file
    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [portraitFile, setPortraitFile] = useState(null);

    // State review kyc
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [portraitPreview, setPortraitPreview] = useState(null);

    const [kycLoading, setKycLoading] = useState(false);

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || '',
                dob: user.dob ? dayjs(user.dob) : null,
                gender: user.gender || null,
                address: user.address || '',
                bio: user.bio || ''
            });
            bankingForm.setFieldsValue({
                bankName: user.bankName || undefined,
                bankAccountNumber: user.bankAccountNumber || '',
                bankAccountName: user.bankAccountName || ''
            });
            setKycStatus(user.kycStatus?.toLowerCase() || 'none');
        }
    }, [user, form, bankingForm]);

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

    const onUpdateProfile = async (values) => {
        setIsUpdatingProfile(true);

        const { email, dob, ...rest } = values;

        const payload = {
            ...rest,
            dob: dob?.format('YYYY-MM-DD') ?? null,
        };

        try {
            const response = await userService.updateProfile(payload);
            const updatedData = response.data?.user || response.user;

            // Zustand
            updateUser({
                fullName: updatedData.fullName,
                phone: updatedData.phone,
                dob: updatedData.dob,
                gender: updatedData.gender,
                address: updatedData.address,
                bio: updatedData.bio,
            });

            message.success('Cập nhật thông tin thành công!');
        } catch (error) {
            console.error('Lỗi update profile:', error);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật!');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

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
            const response = await userService.submitKyc(formData);
            const data = response.data || response;

            const extractedInfo = data.extractedInfo || {};
            const uploadedUrls = data.uploadedUrls || {};

            notification.success({
                message: 'Gửi hồ sơ thành công!',
                description: extractedInfo?.name
                    ? `Hệ thống ghi nhận hồ sơ của: ${extractedInfo.name}. Vui lòng chờ admin duyệt.`
                    : 'Hồ sơ của bạn đã được gửi và đang chờ duyệt.',
            });

            setKycStatus('pending');
            updateUser({
                kycStatus: 'PENDING',
                kycProfile: {
                    extractedName: extractedInfo.name,
                    extractedIdNumber: extractedInfo.idNumber,
                    extractedDob: extractedInfo.dob,
                    extractedGender: extractedInfo.gender || extractedInfo.sex,
                    extractedAddress: extractedInfo.address,
                    frontImageUrl: uploadedUrls.frontImageUrl,
                    backImageUrl: uploadedUrls.backImageUrl,
                    portraitImageUrl: uploadedUrls.portraitImageUrl,
                }
            });

        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ!');
        } finally {
            setKycLoading(false);
        }
    };

    const renderKycDetails = () => {
        const profile = user?.kycProfile;
        if (!profile) return null;

        return (
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-lg font-black text-primary! mb-4">Thông tin đã ghi nhận từ giấy tờ</h4>

                <Descriptions column={1} bordered size="small" className="bg-white mb-6">
                    <Descriptions.Item label={<span className="font-bold">Họ và Tên</span>}>
                        {profile.extractedName || 'Đang cập nhật'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Số CMND/CCCD</span>}>
                        {profile.extractedIdNumber || 'Đang cập nhật'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Ngày sinh</span>}>
                        {profile.extractedDob || 'Đang cập nhật'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Giới tính</span>}>
                        {profile.extractedGender || 'Đang cập nhật'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Địa chỉ</span>} span={2}>
                        {profile.extractedAddress || 'Đang cập nhật'}
                    </Descriptions.Item>
                </Descriptions>

                <h4 className="font-bold my-4 text-gray-700">Tài liệu đính kèm</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                        <Image
                            src={profile.frontImageUrl}
                            alt="Mặt trước"
                            className="rounded-xl border object-cover h-32 w-full"
                            fallback="https://via.placeholder.com/300x200?text=Lỗi+hiển+thị+ảnh"
                        />
                        <p className="text-xs text-gray-500 mt-2">Mặt trước</p>
                    </div>
                    <div className="text-center">
                        <Image
                            src={profile.backImageUrl}
                            alt="Mặt sau"
                            className="rounded-xl border object-cover h-32 w-full"
                            fallback="https://via.placeholder.com/300x200?text=Lỗi+hiển+thị+ảnh"
                        />
                        <p className="text-xs text-gray-500 mt-2">Mặt sau</p>
                    </div>
                    <div className="text-center">
                        <Image
                            src={profile.portraitImageUrl}
                            alt="Chân dung"
                            className="rounded-xl border object-cover h-32 w-full"
                            fallback="https://via.placeholder.com/300x200?text=Lỗi+hiển+thị+ảnh"
                        />
                        <p className="text-xs text-gray-500 mt-2">Chân dung</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-300 mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-10">

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

                                            <Form.Item name="dob" label={<span className="font-bold">Ngày sinh</span>}>
                                                <DatePicker
                                                    className="w-full h-12! rounded-lg!"
                                                    format="DD/MM/YYYY"
                                                    placeholder="Chọn ngày sinh"
                                                />
                                            </Form.Item>

                                            <Form.Item name="gender" label={<span className="font-bold">Giới tính</span>}>
                                                <Select className="h-12! rounded-lg!" placeholder="Chọn giới tính" options={[
                                                    { value: 'Nam', label: 'Nam' },
                                                    { value: 'Nữ', label: 'Nữ' },
                                                    { value: 'Khác', label: 'Khác' },
                                                ]} />
                                            </Form.Item>

                                            <Form.Item name="phone" label={<span className="font-bold">Số điện thoại</span>}>
                                                <Input className="h-12! rounded-lg!" placeholder="Nhập số điện thoại" />
                                            </Form.Item>

                                            <Form.Item name="address" label={<span className="font-bold">Địa chỉ</span>}>
                                                <Input className="h-12! rounded-lg!" placeholder="Nhập địa chỉ của bạn" />
                                            </Form.Item>

                                            <Form.Item name="bio" label={<span className="font-bold">Giới thiệu bản thân</span>} className="md:col-span-2">
                                                <Input.TextArea rows={4} className="rounded-lg!" placeholder="Vài nét về bạn..." />
                                            </Form.Item>
                                        </div>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={isUpdatingProfile}
                                            className="bg-primary! border-none! h-12 px-10 font-bold rounded-lg! mt-4"
                                        >
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
                                            <>
                                                <Result
                                                    status="success"
                                                    title={<span className="text-2xl font-black text-primary!">Bạn đã là Tình nguyện viên chính thức!</span>}
                                                    subTitle="Tài khoản của bạn đã được xác thực danh tính. Dưới đây là hồ sơ của bạn."
                                                />
                                                {renderKycDetails()}
                                            </>
                                        ) : kycStatus === 'pending' ? (
                                            <>
                                                <Result
                                                    status="info"
                                                    title={<span className="text-xl font-bold">Hồ sơ đang chờ duyệt</span>}
                                                    subTitle="Chúng tôi đang kiểm tra tài liệu của bạn bằng hệ thống AI và con người. Quá trình này thường mất từ 12-24 giờ làm việc."
                                                />
                                                {renderKycDetails()}
                                            </>
                                        ) : (
                                            <Form layout="vertical" onFinish={onSubmitKYC}>
                                                <div className="bg-orange-50 p-6 rounded-2xl mb-8 border border-orange-100">
                                                    <h4 className="text-cta! font-bold mb-2">Tại sao cần xác thực?</h4>
                                                    <p className="text-gray-600 m-0 text-sm">Hệ thống sẽ dùng AI để trích xuất thông tin từ giấy tờ. Vui lòng chụp rõ nét, không bị chói sáng để hệ thống tự động nhận diện.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    {/* 1. MẶT TRƯỚC */}
                                                    <div>
                                                        <p className="font-bold mb-2">1. Ảnh mặt trước</p>
                                                        {frontPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border border-gray-200 h-44">
                                                                {/* Dùng thẻ img gốc thay vì Image của Antd */}
                                                                <img src={frontPreview} alt="Mặt trước" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setFrontFile(null); setFrontPreview(null); }}>
                                                                        Đổi ảnh
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger
                                                                // Ép chiều cao h-44 và dùng Tailwind để ép thẻ con của Dragger full chiều cao & căn giữa
                                                                className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center"
                                                                maxCount={1}
                                                                accept="image/*"
                                                                showUploadList={false}
                                                                beforeUpload={(file) => {
                                                                    setFrontFile(file);
                                                                    getBase64(file, (url) => setFrontPreview(url));
                                                                    return false;
                                                                }}
                                                            >
                                                                <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Tải ảnh mặt trước CCCD</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>

                                                    {/* 2. MẶT SAU */}
                                                    <div>
                                                        <p className="font-bold mb-2">2. Ảnh mặt sau</p>
                                                        {backPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border border-gray-200 h-44">
                                                                <img src={backPreview} alt="Mặt sau" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setBackFile(null); setBackPreview(null); }}>
                                                                        Đổi ảnh
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger
                                                                className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center"
                                                                maxCount={1}
                                                                accept="image/*"
                                                                showUploadList={false}
                                                                beforeUpload={(file) => {
                                                                    setBackFile(file);
                                                                    getBase64(file, (url) => setBackPreview(url));
                                                                    return false;
                                                                }}
                                                            >
                                                                <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Tải ảnh mặt sau CCCD</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>

                                                    {/* 3. CHÂN DUNG */}
                                                    <div>
                                                        <p className="font-bold mb-2">3. Ảnh chân dung</p>
                                                        {portraitPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border border-gray-200 h-44">
                                                                <img src={portraitPreview} alt="Chân dung" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setPortraitFile(null); setPortraitPreview(null); }}>
                                                                        Đổi ảnh
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger
                                                                className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center"
                                                                maxCount={1}
                                                                accept="image/*"
                                                                showUploadList={false}
                                                                beforeUpload={(file) => {
                                                                    setPortraitFile(file);
                                                                    getBase64(file, (url) => setPortraitPreview(url));
                                                                    return false;
                                                                }}
                                                            >
                                                                <p className="ant-upload-drag-icon"><CameraOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Selfie khuôn mặt</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button loading={kycLoading} type="primary" htmlType="submit" className="bg-cta! mt-2 border-none! h-14 px-12 font-black rounded-xl! shadow-lg shadow-orange-100!">
                                                    {kycLoading ? 'ĐANG QUÉT AI...' : 'GỬI HỒ SƠ XÁC THỰC'}
                                                </Button>
                                            </Form>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: '3',
                                label: <span className="font-bold"><BankOutlined /> Thông tin thanh toán</span>,
                                children: (
                                    <Form
                                        form={bankingForm}
                                        layout="vertical"
                                        onFinish={onUpdateProfile} // Dùng chung hàm update vì BE dùng chung PATCH /users/me
                                        className="mt-6"
                                    >
                                        <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                                            <h4 className="text-brand! font-bold mb-2">Lưu ý quan trọng</h4>
                                            <p className="text-gray-600 m-0 text-sm">
                                                Vui lòng nhập chính xác thông tin tài khoản ngân hàng của bạn. Hệ thống sẽ sử dụng thông tin này để ban quản trị chuyển tiền hỗ trợ giải ngân cho các chiến dịch cứu trợ.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                            <Form.Item
                                                name="bankName"
                                                label={<span className="font-bold">Ngân hàng thụ hưởng</span>}
                                                rules={[{ required: true, message: 'Vui lòng chọn ngân hàng!' }]}
                                            >
                                                <Select
                                                    showSearch
                                                    className="h-12! rounded-lg!"
                                                    placeholder="Chọn ngân hàng"
                                                    options={[
                                                        { value: 'Vietcombank', label: 'Vietcombank (VCB)' },
                                                        { value: 'Techcombank', label: 'Techcombank (TCB)' },
                                                        { value: 'MBBank', label: 'MB Bank (MB)' },
                                                        { value: 'BIDV', label: 'BIDV' },
                                                        { value: 'VietinBank', label: 'VietinBank' },
                                                        { value: 'Agribank', label: 'Agribank' },
                                                        { value: 'ACB', label: 'ACB' },
                                                        { value: 'TPBank', label: 'TPBank' },
                                                        // Bạn có thể fetch danh sách ngân hàng từ API của VietQR để đầy đủ hơn
                                                    ]}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name="bankAccountNumber"
                                                label={<span className="font-bold">Số tài khoản</span>}
                                                rules={[{ required: true, message: 'Vui lòng nhập số tài khoản!' }]}
                                            >
                                                <Input className="h-12! rounded-lg!" placeholder="VD: 1903123456789" />
                                            </Form.Item>

                                            <Form.Item
                                                name="bankAccountName"
                                                label={<span className="font-bold">Tên chủ tài khoản</span>}
                                                rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản!' }]}
                                                className="md:col-span-2"
                                            >
                                                <Input
                                                    className="h-12! rounded-lg! uppercase!" // Dùng CSS uppercase hiển thị
                                                    placeholder="VD: NGUYEN VAN A"
                                                    onChange={(e) => {
                                                        // Tự động chuyển thành chữ hoa không dấu khi gõ
                                                        const val = e.target.value.toUpperCase();
                                                        bankingForm.setFieldsValue({ bankAccountName: val });
                                                    }}
                                                />
                                            </Form.Item>
                                        </div>

                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            className="bg-primary! border-none! h-12 px-10 font-bold rounded-lg! mt-4"
                                        >
                                            LƯU THÔNG TIN THANH TOÁN
                                        </Button>
                                    </Form>
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