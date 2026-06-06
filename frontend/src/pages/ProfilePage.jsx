import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, Button, Upload, Avatar, Card, Tag, message, Result, Spin, notification, Image, Descriptions, Select, DatePicker, Table, Space, Alert } from 'antd';
import {
    UserOutlined,
    IdcardOutlined,
    CameraOutlined,
    LoadingOutlined,
    SafetyCertificateOutlined,
    BankOutlined,
    AppstoreOutlined,
    HistoryOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { userService } from '../services/userService';
import { campaignService } from '../services/campaignService';
import { formatMoney } from '../utils/helper';
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
    const navigate = useNavigate();
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

    // STATE LƯU TRỮ DỮ LIỆU KYC TỪ API (Thế chỗ cho Zustand)
    const [kycProfile, setKycProfile] = useState(null);

    const [kycLoading, setKycLoading] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // STATE CHO TAB CHIẾN DỊCH CỦA TÔI
    const [myCampaigns, setMyCampaigns] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    const [myDonations, setMyDonations] = useState([]);
    const [loadingDonations, setLoadingDonations] = useState(false);

    const [profileLoading, setProfileLoading] = useState(false);

    // useEffect(() => {
    //     if (user) {
    //         fetchProfile();

    //         // Tạm thời lấy status từ user, sau đó fetch API sẽ ghi đè lại nếu có
    //         setKycStatus(user.kycStatus || 'none');

    //         if (user.kycStatus === 'VERIFIED' || user.role === 'VOLUNTEER') {
    //             fetchMyCampaigns();
    //         }

    //         fetchMyDonationsAndKyc();
    //     }
    // }, [user, form, bankingForm]);

    useEffect(() => {
        if (!user?.id) return;

        fetchProfile();

        if (user.kycStatus === 'VERIFIED' || user.role === 'VOLUNTEER') {
            fetchMyCampaigns();
        }

        fetchMyDonationsAndKyc();
    }, [user?.id]);

    const fetchProfile = async () => {
        setProfileLoading(true);
        try {
            const res = await userService.getProfile();
            const profile = res.data || res;

            updateUser(profile);

            form.setFieldsValue({
                fullName: profile.fullName,
                email: profile.email,
                phone: profile.phone || '',
                dob: profile.dob ? dayjs(profile.dob) : null,
                gender: profile.gender || null,
                address: profile.address || '',
                bio: profile.bio || '',
            });

            bankingForm.setFieldsValue({
                bankName: profile.bankName || undefined,
                bankAccountNumber: profile.bankAccountNumber || '',
                bankAccountName: profile.bankAccountName || '',
            });

            setKycStatus(profile.kycStatus || 'none');

            if (profile.kycProfile) {
                setKycProfile(profile.kycProfile);
            }
        } catch (error) {
            console.error('Lỗi lấy profile:', error);
            message.error('Không thể tải thông tin hồ sơ.');
        } finally {
            setProfileLoading(false);
        }
    };

    const fetchMyCampaigns = async () => {
        setLoadingCampaigns(true);
        try {
            const res = await campaignService.getMyCampaigns();
            setMyCampaigns(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error("Lỗi lấy chiến dịch", error);
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const fetchMyDonationsAndKyc = async () => {
        setLoadingDonations(true);
        try {
            const res = await userService.getMyDonations();
            const donationData = res?.data?.data || res?.data || res || [];

            setMyDonations(Array.isArray(donationData) ? donationData : []);

            const kycRes = await userService.getMyKycHistory();
            const kycData = kycRes?.data || kycRes || [];

            if (Array.isArray(kycData) && kycData.length > 0) {
                const latestKyc = kycData[0];
                setKycProfile(latestKyc);
                setKycStatus(latestKyc.status);
            }
        } catch (error) {
            console.error("Lỗi lấy lịch sử quyên góp hoặc kyc", error);
        } finally {
            setLoadingDonations(false);
        }
    };

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

            updateUser({
                fullName: updatedData.fullName,
                phone: updatedData.phone,
                dob: updatedData.dob,
                gender: updatedData.gender,
                address: updatedData.address,
                bio: updatedData.bio,
                bankName: updatedData.bankName,
                bankAccountNumber: updatedData.bankAccountNumber,
                bankAccountName: updatedData.bankAccountName,
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
            await userService.submitKyc(formData);

            notification.success({
                message: 'Gửi hồ sơ thành công!',
                description: 'Hồ sơ của bạn đã được gửi và đang chờ duyệt.',
            });

            // Chỉ cần cập nhật kycStatus trong authStore để các Header/Menu nhận biết
            updateUser({ kycStatus: 'PENDING' });

            // Ép hệ thống gọi lại API để tự động lấy `kycProfile` OCR mới nhất đổ vào state UI
            await fetchMyDonationsAndKyc();

        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ!');
        } finally {
            setKycLoading(false);
        }
    };

    const renderKycDetails = () => {
        // CHỈ DÙNG LOCAL STATE, BỎ user?.kycProfile
        const profile = kycProfile;

        if (!profile) return null;

        return (
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-lg font-black text-primary! mb-4">Thông tin đã ghi nhận từ giấy tờ</h4>
                <Descriptions column={1} bordered size="small" className="bg-white mb-6">
                    <Descriptions.Item label={<span className="font-bold">Họ và Tên</span>}>{profile.extractedName || 'Đang cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Số CMND/CCCD</span>}>{profile.extractedIdNumber || 'Đang cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Ngày sinh</span>}>{profile.extractedDob || 'Đang cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Giới tính</span>}>{profile.extractedGender || 'Đang cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label={<span className="font-bold">Địa chỉ</span>} span={2}>{profile.extractedAddress || 'Đang cập nhật'}</Descriptions.Item>
                </Descriptions>

                <h4 className="font-bold my-4 text-gray-700">Tài liệu đính kèm</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                        <Image src={profile.frontImageUrl} alt="Mặt trước" className="rounded-xl border object-cover h-32 w-full" fallback="" />
                        <p className="text-xs text-gray-500 mt-2">Mặt trước</p>
                    </div>
                    <div className="text-center">
                        <Image src={profile.backImageUrl} alt="Mặt sau" className="rounded-xl border object-cover h-32 w-full" fallback="" />
                        <p className="text-xs text-gray-500 mt-2">Mặt sau</p>
                    </div>
                    <div className="text-center">
                        <Image src={profile.portraitImageUrl} alt="Chân dung" className="rounded-xl border object-cover h-32 w-full" fallback="" />
                        <p className="text-xs text-gray-500 mt-2">Chân dung</p>
                    </div>
                </div>
            </div>
        );
    };

    const campaignColumns = [
        {
            title: 'Tên chiến dịch',
            dataIndex: 'title',
            render: (text, record) => <Link to={`/campaigns/${record.id}`} className="font-semibold text-primary!">{text}</Link>
        },
        {
            title: 'Tiến độ',
            render: (_, record) => {
                const current = Number(record.currentAmount) || 0;
                const target = Number(record.targetAmount) || 0;
                const percent = target > 0 ? Math.round((current / target) * 100) : 0;
                return (
                    <div>
                        <div className="text-brand! font-bold">{formatMoney(current)}</div>
                        <div className="text-xs text-gray-500">/ {formatMoney(target)} ({percent}%)</div>
                    </div>
                );
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status) => {
                const map = { PENDING: 'orange', ACTIVE: 'blue', COMPLETED: 'green', REJECTED: 'red', CLOSED: 'default' };
                return <Tag color={map[status] || 'default'} className="rounded border-none font-medium">{status}</Tag>
            }
        },
        {
            title: 'Thao tác',
            align: 'right',
            render: (_, record) => (
                <Button type="default" size="small" onClick={() => navigate(`/campaigns/${record.id}/manage`)}>
                    Quản lý
                </Button>
            )
        }
    ];

    const donationColumns = [
        { title: 'Ngày đóng góp', dataIndex: 'createdAt', render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm') },
        { title: 'Chiến dịch', dataIndex: 'campaignTitle', render: (text) => <span className="font-medium text-gray-700">{text || 'N/A'}</span> },
        { title: 'Số tiền', dataIndex: 'amount', render: (val) => <span className="text-green-600 font-bold">+{formatMoney(Number(val))}</span> },
    ];

    const totalDonated = myDonations.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
        <div className="max-w-300 mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-10">

                <div className="w-full lg:w-80">
                    <Card className="rounded-lg! border-none! text-center p-4">
                        <div className="relative inline-block mb-6 group cursor-pointer">
                            <Upload name="avatar" showUploadList={false} customRequest={handleCustomUpload} accept="image/png, image/jpeg, image/webp">
                                <Spin spinning={isUploading} indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large">
                                    <Avatar size={120} src={avatarUrl} icon={<UserOutlined />} className={`border-4 border-white! shadow-md object-cover! ${isUploading ? 'opacity-50' : 'group-hover:opacity-80'}`} />
                                </Spin>
                                <div className="absolute bottom-1 right-1 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md text-gray-500 group-hover:text-brand! group-hover:scale-110 transition-all">
                                    <CameraOutlined />
                                </div>
                            </Upload>
                        </div>

                        <h2 className="text-2xl font-black text-primary! mb-1">{user?.fullName}</h2>
                        <p className="text-gray-500 mb-4">{user?.email}</p>

                        {kycStatus === 'VERIFIED' ? (
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
                                <p className="text-xl font-black text-brand! m-0">{myCampaigns.length}</p>
                                <p className="text-xs text-gray-400 font-bold uppercase">Chiến dịch</p>
                            </div>
                            <div>
                                <p className="text-xl font-black text-cta! m-0">
                                    {totalDonated > 0 ? formatMoney(totalDonated) : '0 ₫'}
                                </p>
                                <p className="text-xs text-gray-400 font-bold uppercase">Đã góp</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex-1 bg-white p-8 rounded-lg border border-gray-100">
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
                                            <Form.Item name="fullName" label={<span className="font-bold">Họ và Tên</span>}><Input className="h-12! rounded-lg!" /></Form.Item>
                                            <Form.Item name="email" label={<span className="font-bold">Email</span>}><Input className="h-12! rounded-lg!" disabled /></Form.Item>
                                            <Form.Item name="dob" label={<span className="font-bold">Ngày sinh</span>}><DatePicker className="w-full h-12! rounded-lg!" format="DD/MM/YYYY" /></Form.Item>
                                            <Form.Item name="gender" label={<span className="font-bold">Giới tính</span>}>
                                                <Select className="h-12! rounded-lg!" options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Khác', label: 'Khác' }]} />
                                            </Form.Item>
                                            <Form.Item name="phone" label={<span className="font-bold">Số điện thoại</span>}><Input className="h-12! rounded-lg!" /></Form.Item>
                                            <Form.Item name="address" label={<span className="font-bold">Địa chỉ</span>}><Input className="h-12! rounded-lg!" /></Form.Item>
                                            <Form.Item name="bio" label={<span className="font-bold">Giới thiệu bản thân</span>} className="md:col-span-2"><Input.TextArea rows={4} className="rounded-lg!" /></Form.Item>
                                        </div>
                                        <Button type="primary" htmlType="submit" loading={isUpdatingProfile} className="bg-primary! border-none! h-12 px-10 font-bold rounded-lg! mt-4">LƯU THAY ĐỔI</Button>
                                    </Form>
                                )
                            },
                            {
                                key: '2',
                                label: <span className="font-bold"><IdcardOutlined /> Xác thực KYC</span>,
                                children: (
                                    <div className="mt-6">
                                        {kycStatus === 'VERIFIED' || kycStatus === 'APPROVED' ? (
                                            <>
                                                <Result status="success" title={<span className="text-2xl font-black text-primary!">Bạn đã là Tình nguyện viên chính thức!</span>} subTitle="Tài khoản của bạn đã được xác thực danh tính." />
                                                {renderKycDetails()}
                                            </>
                                        ) : kycStatus === 'PENDING' ? (
                                            <>
                                                <Result status="info" title={<span className="text-xl font-bold">Hồ sơ đang chờ duyệt</span>} subTitle="Hệ thống đang kiểm tra tài liệu của bạn. Thường mất từ 12-24 giờ làm việc." />
                                                {renderKycDetails()}
                                            </>
                                        ) : (
                                            <Form layout="vertical" onFinish={onSubmitKYC}>

                                                {/* HIỆN LÝ DO NẾU BỊ TỪ CHỐI BẰNG BIẾN STATE kycProfile */}
                                                {kycStatus === 'REJECTED' && (
                                                    <Alert
                                                        message={<span className="font-bold text-red-700">HỒ SƠ XÁC THỰC BỊ TỪ CHỐI!</span>}
                                                        description={
                                                            <div className="text-sm text-red-600 mt-1">
                                                                <strong>Lý do từ Ban quản trị:</strong> {kycProfile?.rejectionReason || 'Hồ sơ không đạt tiêu chuẩn.'}
                                                                <br />
                                                                <span className="text-gray-500 text-xs mt-2 block">Vui lòng kiểm tra lại hình ảnh chứng từ và nộp hồ sơ mới rõ nét hơn ở bên dưới.</span>
                                                            </div>
                                                        }
                                                        type="error"
                                                        showIcon
                                                        className="mb-6! rounded-2xl border-red-200"
                                                    />
                                                )}



                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div>
                                                        <p className="font-bold mb-2">1. Ảnh mặt trước</p>
                                                        {frontPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border h-44">
                                                                <img src={frontPreview} alt="Mặt trước" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setFrontFile(null); setFrontPreview(null); }}>Đổi ảnh</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center" maxCount={1} accept="image/*" showUploadList={false} beforeUpload={(file) => { setFrontFile(file); getBase64(file, (url) => setFrontPreview(url)); return false; }}>
                                                                <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Tải ảnh mặt trước CCCD</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold mb-2">2. Ảnh mặt sau</p>
                                                        {backPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border h-44">
                                                                <img src={backPreview} alt="Mặt sau" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setBackFile(null); setBackPreview(null); }}>Đổi ảnh</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center" maxCount={1} accept="image/*" showUploadList={false} beforeUpload={(file) => { setBackFile(file); getBase64(file, (url) => setBackPreview(url)); return false; }}>
                                                                <p className="ant-upload-drag-icon"><IdcardOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Tải ảnh mặt sau CCCD</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold mb-2">3. Ảnh chân dung</p>
                                                        {portraitPreview ? (
                                                            <div className="relative group rounded-2xl overflow-hidden border h-44">
                                                                <img src={portraitPreview} alt="Chân dung" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button danger type="primary" icon={<DeleteOutlined />} onClick={() => { setPortraitFile(null); setPortraitPreview(null); }}>Đổi ảnh</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Upload.Dragger className="bg-slate-50! rounded-2xl! h-44! [&_.ant-upload]:h-full! [&_.ant-upload]:flex [&_.ant-upload]:flex-col [&_.ant-upload]:justify-center" maxCount={1} accept="image/*" showUploadList={false} beforeUpload={(file) => { setPortraitFile(file); getBase64(file, (url) => setPortraitPreview(url)); return false; }}>
                                                                <p className="ant-upload-drag-icon"><CameraOutlined className="text-brand! text-3xl" /></p>
                                                                <p className="text-xs text-gray-400 px-2 mt-2">Selfie khuôn mặt</p>
                                                            </Upload.Dragger>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button loading={kycLoading} type="primary" htmlType="submit" className="bg-cta! mt-2 border-none! h-14 px-12 font-black rounded-xl! shadow-lg shadow-orange-100!">
                                                    {kycLoading ? 'ĐANG QUÉT AI...' : kycStatus === 'REJECTED' ? 'NỘP LẠI HỒ SƠ MỚI' : 'GỬI HỒ SƠ XÁC THỰC'}
                                                </Button>
                                            </Form>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: '3',
                                label: <span className="font-bold"><BankOutlined /> Thanh toán</span>,
                                children: (
                                    <Form form={bankingForm} layout="vertical" onFinish={onUpdateProfile} className="mt-6">
                                        <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                                            <h4 className="text-brand! font-bold mb-2">Lưu ý quan trọng</h4>
                                            <p className="text-gray-600 m-0 text-sm">Hệ thống sử dụng thông tin này để ban quản trị chuyển tiền hỗ trợ giải ngân.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                            <Form.Item name="bankName" label={<span className="font-bold">Ngân hàng thụ hưởng</span>} rules={[{ required: true }]}>
                                                <Select showSearch className="h-12! rounded-lg!" options={[{ value: 'Vietcombank', label: 'Vietcombank' }, { value: 'Techcombank', label: 'Techcombank' }, { value: 'MBBank', label: 'MB Bank' }]} />
                                            </Form.Item>
                                            <Form.Item name="bankAccountNumber" label={<span className="font-bold">Số tài khoản</span>} rules={[{ required: true }]}>
                                                <Input className="h-12! rounded-lg!" />
                                            </Form.Item>
                                            <Form.Item name="bankAccountName" label={<span className="font-bold">Tên chủ tài khoản</span>} className="md:col-span-2" rules={[{ required: true }]}>
                                                <Input className="h-12! rounded-lg! uppercase!" onChange={(e) => bankingForm.setFieldsValue({ bankAccountName: e.target.value.toUpperCase() })} />
                                            </Form.Item>
                                        </div>
                                        <Button type="primary" htmlType="submit" className="bg-primary! border-none! h-12 px-10 font-bold rounded-lg! mt-4">LƯU THÔNG TIN</Button>
                                    </Form>
                                )
                            },
                            {
                                key: '4',
                                label: <span className="font-medium px-2"><HistoryOutlined /> Lịch sử Donate</span>,
                                children: (
                                    <div className="mt-4">
                                        <Table columns={donationColumns} dataSource={myDonations} rowKey="id" loading={loadingDonations} pagination={{ pageSize: 5 }} size="small" />
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            </div>

            {(kycStatus === 'VERIFIED' || user?.role === 'VOLUNTEER') && (
                <div className="border mt-10 border-gray-200 rounded-lg bg-white p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 m-0"><AppstoreOutlined className="mr-2" />Quản lý chiến dịch khởi xướng</h3>
                        <Button type="primary" className="bg-brand! rounded font-medium" onClick={() => navigate('/propose')}>+ Đề xuất mới</Button>
                    </div>
                    <Table
                        columns={campaignColumns}
                        dataSource={myCampaigns}
                        rowKey="id"
                        loading={loadingCampaigns}
                        pagination={{ pageSize: 5 }}
                        className="border border-gray-100 rounded"
                        size="middle"
                    />
                </div>
            )}
        </div>
    );
};

export default ProfilePage;