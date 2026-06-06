import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Modal, QRCode, Typography, Spin, Switch, Avatar, Tag, message, Result } from 'antd';
import { formatMoney } from '../utils/helper';
import { campaignService } from '../services/campaignService';
import logo from '../assets/charity-logo.png';
import napasLogo from '../assets/Logo-Napas.png';
import vietQRLogo from '../assets/VietQR_Logo.svg.png';
import mbBankLogo from '../assets/mb-bank-logo.png';
import { LoadingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DonatePage = () => {
    const { id: campaignId } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const watchedAmount = Form.useWatch('amount', form);

    const [campaign, setCampaign] = useState(null);
    const [loadingCampaign, setLoadingCampaign] = useState(true);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // States cho Modal QR
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loadingQr, setLoadingQr] = useState(false);

    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

    // Lưu toàn bộ thông tin thanh toán
    const [paymentInfo, setPaymentInfo] = useState({
        qrCodeData: '',
        amount: 0,
        txReference: '',
        accountName: '',
        accountNumber: '',
        description: '',
        bin: ''
    });

    useEffect(() => {
        const fetchCampaign = async () => {
            setLoadingCampaign(true)
            try {
                const campaignRes = await campaignService.getById(campaignId);
                setCampaign(campaignRes);
            } catch (error) {
                console.error("Lỗi tải chiến dịch", error);
            } finally {
                setLoadingCampaign(false)
            }
        };
        fetchCampaign();
    }, [campaignId]);

    const handleFinish = async (values) => {
        setLoadingQr(true);
        try {
            const actualAmount = Number(String(values.amount).replace(/\D/g, ''));
            const response = await campaignService.createDonations(campaignId, {
                amount: actualAmount,
                message: values.message || 'Quyen gop tu thien',
                donorName: values.donorName,
                isAnonymous: isAnonymous,
            });

            const data = response.data || response;

            setPaymentInfo({
                qrCodeData: data.qrCodeData,
                amount: actualAmount,
                txReference: data.txReference,
                accountName: data.accountName,
                accountNumber: data.accountNumber,
                description: data.description,
                bin: data.bin
            });

            setIsModalVisible(true);
        } catch (error) {
            Modal.error({ title: 'Lỗi', content: 'Không thể tạo mã thanh toán lúc này!' });
        } finally {
            setLoadingQr(false);
        }
    };

    // Hàm dọn rác DB khi bấm Hủy/Đóng
    const handleCancelQr = async () => {
        setIsModalVisible(false);
        if (paymentInfo.txReference) {
            try {
                await campaignService.cancelDonation(paymentInfo.txReference);
            } catch (error) {
            }
        }
    };

    // Hàm copy Text
    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        message.success('Đã sao chép thành công!');
    };

    // Polling kiểm tra trạng thái
    useEffect(() => {
        let interval;
        if (isModalVisible && paymentInfo.txReference) {
            interval = setInterval(async () => {
                try {
                    const res = await campaignService.checkPaymentStatus(paymentInfo.txReference)
                    const status = res.data?.status || res.status;

                    if (status === 'SUCCESS') {
                        clearInterval(interval);
                        setIsModalVisible(false); // Đóng QR

                        setIsSuccessModalVisible(true);
                    }
                } catch (error) {
                    // Đang chờ thanh toán
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isModalVisible, paymentInfo.txReference, navigate, campaignId, paymentInfo.amount]);

    if (loadingCampaign || !campaign) return <div className="text-center py-20"><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} /></div>;

    const currentNumericAmount = Number(String(watchedAmount || '').replace(/\D/g, ''));

    const imageUrlsArray = campaign?.imageUrls ? campaign.imageUrls.split(',') : [];
    const coverImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : 'https://placehold.co/800x400?text=No+Cover';

    return (
        <div className="max-w-300 mx-auto py-10 px-4 overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* ... (CỘT TRÁI GIỮ NGUYÊN) ... */}
                <div className="lg:w-1/2">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-28">
                        <img src={coverImage} alt={campaign.title} className="w-full h-64 object-cover rounded-2xl mb-6" />
                        <Tag className="bg-brand! border-none! text-white! px-3 py-1 rounded-md mb-4 font-bold">{campaign.category}</Tag>
                        <h2 className="text-2xl font-black text-primary! mb-4 leading-tight">{campaign.title}</h2>

                        <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                            <Avatar size={40} className="bg-cta!">QT</Avatar>
                            <div>
                                <p className="text-xs text-gray-500 font-bold m-0 uppercase">Tổ chức thực hiện</p>
                                <p className="text-sm font-bold text-primary! m-0">{campaign.organizer || 'Hệ thống Quỹ'}</p>
                            </div>
                        </div>

                        <div className="text-gray-600 text-base leading-relaxed line-clamp-4">
                            {campaign.description}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: FORM */}
                <div className="lg:w-1/2">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <Title level={2} className="text-center text-primary! mb-8">Nhập thông tin ủng hộ</Title>

                        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ amount: '2,000' }}>
                            <Form.Item label={<span className="font-bold text-gray-700">Số tiền quyên góp (VNĐ)</span>} name="amount" rules={[{ validator: (_, value) => { const rawValue = Number(String(value).replace(/\D/g, '')); if (rawValue < 2000) return Promise.reject('Tối thiểu 2.000đ'); return Promise.resolve(); } }]} className="mb-3">
                                <Input className="w-full h-16 text-4xl! font-black text-cta! rounded-xl border-gray-200 hover:border-gray-300 focus:border-blue-400 shadow-none! focus:shadow-none!" onChange={(e) => { const rawValue = e.target.value.replace(/\D/g, ''); const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ','); form.setFieldsValue({ amount: formatted }); }} />
                            </Form.Item>

                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
                                {[50000, 100000, 200000, 500000, 1000000].map((val) => {
                                    const isActive = currentNumericAmount === val;
                                    return (
                                        <div key={val} onClick={() => { const formatted = String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ','); form.setFieldsValue({ amount: formatted }); }} className={`cursor-pointer flex items-center justify-center h-10 rounded-lg border font-bold transition-all shadow-sm ${isActive ? 'bg-cta! text-white! border-cta!' : 'border-gray-200 text-primary! bg-white hover:bg-cta! hover:text-white! hover:border-cta!'}`}>{val / 1000}k</div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center p-4 rounded-xl border border-blue-100 bg-blue-50 mb-6">
                                <div>
                                    <p className="font-bold text-primary! m-0">Ẩn danh</p>
                                    <p className="text-xs text-gray-500 m-0">Tên bạn sẽ hiển thị là "Nhà hảo tâm ẩn danh"</p>
                                </div>
                                <Switch checked={isAnonymous} onChange={setIsAnonymous} />
                            </div>

                            {!isAnonymous && (
                                <Form.Item label={<span className="font-bold text-gray-700">Tên của bạn</span>} name="donorName">
                                    <Input className="h-12 rounded-xl" placeholder="Nhập tên hiển thị trên sao kê..." />
                                </Form.Item>
                            )}

                            <Form.Item label={<span className="font-bold text-gray-700">Lời nhắn (tùy chọn)</span>} name="message">
                                <Input.TextArea rows={3} placeholder="Nhập lời chúc ..." className="text-base p-3 rounded-xl" />
                            </Form.Item>

                            <Button type="primary" htmlType="submit" loading={loadingQr} className="w-full h-14 mt-2 text-lg font-black bg-brand! hover:bg-blue-700! rounded-xl shadow-lg">
                                TẠO MÃ QR CHUYỂN KHOẢN
                            </Button>
                        </Form>
                    </div>
                </div>
            </div>

            {/* ================= MODAL CHUẨN VIETQR PRO ================= */}
            <Modal
                open={isModalVisible}
                onCancel={handleCancelQr} // Gọi hàm xóa rác DB
                footer={null}
                centered
                width={850} // Kéo rộng Modal ra để chứa 2 cột
                closable={false}
                className="custom-vietqr-modal"
                closeIcon={<span className="text-gray-400 text-xl hover:text-red-500 transition-colors">✕</span>}
            >
                {paymentInfo.qrCodeData ? (
                    <div className="flex flex-col md:flex-row gap-8 py-4">

                        {/* Cột trái: Hiển thị ảnh QR */}
                        <div className="w-full md:w-5/12 flex flex-col items-center border-r border-gray-100 pr-0 md:pr-8">
                            {/* Chèn logo VietQR giả lập */}
                            <img src={vietQRLogo} alt="VietQR" className="h-6 mb-4" />

                            <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-brand! relative">
                                <QRCode
                                    value={paymentInfo.qrCodeData}
                                    size={220}
                                    bordered={false}
                                    icon={logo}
                                />
                            </div>

                            <div className="flex items-center gap-4 mt-6">
                                <img src={napasLogo} alt="Napas" className="h-5" />
                            </div>

                            <Button onClick={handleCancelQr} className="mt-8 w-32 h-10 rounded-lg text-gray-500 font-semibold border-gray-300">
                                Huỷ
                            </Button>
                        </div>

                        {/* Cột phải: Thông tin chuyển khoản chi tiết */}
                        <div className="w-full md:w-7/12 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-brand! font-black text-xl">
                                    <img src={mbBankLogo} alt="" />
                                </div>
                                <div>
                                    <p className="text-gray-500 m-0 text-sm">Ngân hàng thụ hưởng</p>
                                    {/* Mặc định hiển thị MB Bank nếu PayOS config của bạn là MB, có thể thay đổi */}
                                    <p className="font-bold text-primary! text-lg m-0">Ngân hàng TMCP Quân Đội (MB)</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <p className="text-gray-500 m-0 text-sm mb-1">Chủ tài khoản:</p>
                                    <p className="font-bold text-primary! uppercase text-base m-0">{paymentInfo.accountName}</p>
                                </div>

                                <div>
                                    <p className="text-gray-500 m-0 text-sm mb-1">Số tài khoản:</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-brand! text-xl m-0 tracking-wider">{paymentInfo.accountNumber}</p>
                                        <Button size="small" className="bg-green-50 text-green-600 border-none font-semibold rounded" onClick={() => handleCopy(paymentInfo.accountNumber)}>Sao chép</Button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-gray-500 m-0 text-sm mb-1">Số tiền:</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-primary! text-lg m-0">{formatMoney(paymentInfo.amount)}</p>
                                        <Button size="small" className="bg-green-50 text-green-600 border-none font-semibold rounded" onClick={() => handleCopy(String(paymentInfo.amount))}>Sao chép</Button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-gray-500 m-0 text-sm mb-1">Nội dung chuyển khoản:</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-primary! text-base m-0">{paymentInfo.description}</p>
                                        <Button size="small" className="bg-green-50 text-green-600 border-none font-semibold rounded" onClick={() => handleCopy(paymentInfo.description)}>Sao chép</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <p className="text-cta! text-sm m-0 text-center font-medium">
                                    Lưu ý: Nhập chính xác số tiền <strong className="font-black">{formatMoney(paymentInfo.amount)}</strong> khi chuyển khoản
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center"><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Đang kết nối cổng thanh toán..." /></div>
                )}
            </Modal>

            <Modal
                open={isSuccessModalVisible}
                footer={null}
                closable={false}
                centered
                maskClosable={false}
                width={500}
                className="rounded-3xl overflow-hidden"
            >
                <div className="py-8 px-4">
                    <Result
                        status="success"
                        title={<span className="text-2xl font-black text-green-600">Quyên góp thành công!</span>}
                        subTitle={
                            <div className="mt-4 text-base text-gray-600">
                                Cảm ơn tấm lòng vàng của bạn. Số tiền <strong className="text-brand! text-lg">{formatMoney(paymentInfo.amount)}</strong> đã được ghi nhận vào quỹ của chiến dịch <br /> <strong>"{campaign?.title}"</strong>.
                            </div>
                        }
                        extra={[
                            <Button
                                type="primary"
                                key="back"
                                onClick={() => navigate(`/campaigns/${campaignId}`)}
                                className="h-12 px-8 mt-6 text-lg font-bold bg-brand! hover:bg-blue-700! rounded-xl shadow-lg"
                            >
                                Quay lại chiến dịch
                            </Button>
                        ]}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default DonatePage;