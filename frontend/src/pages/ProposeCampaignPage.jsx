import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Typography, Card, message, Row, Col, Upload } from 'antd';
import { UploadOutlined, FileTextOutlined, PlusOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import useAuthStore from '../store/authStore';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ProposeCampaignPage = () => {
    const { user } = useAuthStore();
    const hasCheckedAccess = useRef(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const [coverFileList, setCoverFileList] = useState([]);
    const [proofFileList, setProofFileList] = useState([]);

    const navigate = useNavigate();
    const role = typeof user?.role === 'object' ? user.role?.name : user?.role;

    useEffect(() => {
        if (hasCheckedAccess.current) return;
        hasCheckedAccess.current = true;

        if (!user) {
            message.warning('Vui lòng đăng nhập để tạo chiến dịch.');
            navigate('/login');
            return;
        }

        if (role !== 'VOLUNTEER') {
            message.error('Chỉ tình nguyện viên mới được tạo chiến dịch. Hãy xác thực KYC');
            navigate('/');
        }
    }, [user, role, navigate]);


    const onFinish = async (values) => {
        if (coverFileList.length === 0) return message.error('Vui lòng tải lên Ảnh bìa!');
        if (proofFileList.length === 0) return message.error('Vui lòng tải lên Ảnh minh chứng!');

        setLoading(true);
        try {
            const formData = new FormData();

            console.log(typeof (values.targetAmount))

            formData.append('title', values.title);
            formData.append('description', values.description);
            formData.append('targetAmount', values.targetAmount);
            formData.append('campaignType', values.campaignType);
            formData.append('category', values.category);
            formData.append('startDate', values.dateRange[0].toISOString());
            formData.append('endDate', values.dateRange[1].toISOString());

            formData.append('coverImage', coverFileList[0].originFileObj);

            proofFileList.forEach((file) => {
                formData.append('proofFiles', file.originFileObj);
            });

            await campaignService.createCampaign(formData);

            message.success({
                content: 'Gửi yêu cầu tạo chiến dịch thành công! Vui lòng chờ Ban quản trị phê duyệt.',
                duration: 5
            });

            navigate('/');
        } catch (error) {
            console.error("Lỗi tạo chiến dịch:", error);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu!');
        } finally {
            setLoading(false);
        }
    };

    const uploadButton = (
        <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
        </div>
    );

    return (
        <div className="max-w-300 mx-auto py-10">
            <div className="text-center mb-8">
                <FileTextOutlined className="text-4xl text-brand! mb-2" />
                <Title level={2} className="text-primary! m-0">Đề xuất Chiến dịch mới</Title>
                <Text className="text-gray-500">
                    Thông tin của bạn sẽ được gửi đến Ban kiểm duyệt. Vui lòng điền đầy đủ và trung thực.
                </Text>
            </div>

            <Card className="rounded-3xl shadow-xl border-0 overflow-hidden">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                    requiredMark="optional"
                >
                    <Row gutter={24}>
                        {/* CỘT TRÁI */}
                        <Col xs={24} md={16}>
                            <Form.Item
                                label={<span className="font-bold text-gray-700">Tên chiến dịch</span>}
                                name="title"
                                rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
                            >
                                <Input placeholder="VD: Xây cầu hy vọng bản Nậm Pồ..." className="rounded-xl" />
                            </Form.Item>

                            <Form.Item
                                label={<span className="font-bold text-gray-700">Mô tả hoàn cảnh (Chi tiết)</span>}
                                name="description"
                                rules={[{ required: true, message: 'Vui lòng nhập mô tả hoàn cảnh' }]}
                            >
                                <TextArea
                                    rows={8}
                                    placeholder="Kể lại câu chuyện, hoàn cảnh khó khăn cần được giúp đỡ..."
                                    className="rounded-xl"
                                />
                            </Form.Item>

                            <Row gutter={16}>
                                {/* 👉 KHU VỰC 1: ẢNH BÌA (TỐI ĐA 1 ẢNH) */}
                                <Col span={6}>
                                    <Form.Item
                                        label={
                                            <div>
                                                <span className="font-bold text-brand! block"><PictureOutlined /> Ảnh Bìa Chính</span>
                                                <span className="text-xs text-gray-400">Tỉ lệ 16:9 (1 ảnh)</span>
                                            </div>
                                        }
                                        required
                                    >
                                        <Upload
                                            listType="picture-card"
                                            fileList={coverFileList}
                                            onChange={({ fileList }) => setCoverFileList(fileList)}
                                            beforeUpload={() => false}
                                            accept="image/*"
                                            maxCount={1}
                                            className="custom-upload-cover"
                                        >
                                            {coverFileList.length >= 1 ? null : uploadButton}
                                        </Upload>
                                    </Form.Item>
                                </Col>

                                {/* 👉 KHU VỰC 2: ẢNH MINH CHỨNG (TỐI ĐA 5 ẢNH) */}
                                <Col span={18}>
                                    <Form.Item
                                        label={
                                            <div>
                                                <span className="font-bold text-gray-700 block">Hình ảnh & Giấy tờ minh chứng</span>
                                                <span className="text-xs text-gray-400">Tải lên tối đa 5 ảnh (Hộ nghèo, Bệnh án...)</span>
                                            </div>
                                        }
                                        required
                                    >
                                        <Upload
                                            listType="picture-card"
                                            fileList={proofFileList}
                                            onChange={({ fileList }) => setProofFileList(fileList)}
                                            beforeUpload={() => false}
                                            multiple
                                            accept="image/*"
                                            maxCount={5}
                                        >
                                            {proofFileList.length >= 5 ? null : uploadButton}
                                        </Upload>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Col>

                        {/* CỘT PHẢI */}
                        <Col xs={24} md={8}>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 h-full">
                                <Form.Item
                                    label={<span className="font-bold text-gray-700">Số tiền mục tiêu (VNĐ)</span>}
                                    name="targetAmount"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập số tiền' },
                                        { type: 'number', min: 1000000, message: 'Tối thiểu 1.000.000đ' }
                                    ]}
                                >
                                    <InputNumber
                                        controls={false}
                                        className="w-full! h-16 text-3xl! font-black rounded-xl border-blue-200 focus-within:border-brand! shadow-sm [&_input]:text-brand! [&_input]:text-center"
                                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                                        placeholder="50,000,000"
                                        addonAfter="VNĐ"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<span className="font-bold text-gray-700">Thời gian gọi vốn</span>}
                                    name="dateRange"
                                    rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu và kết thúc' }]}
                                >
                                    <RangePicker className="w-full rounded-xl" format="DD/MM/YYYY" />
                                </Form.Item>

                                <Form.Item
                                    label={<span className="font-bold text-gray-700">Loại chiến dịch</span>}
                                    name="campaignType"
                                    rules={[{ required: true, message: 'Vui lòng chọn loại hình' }]}
                                    initialValue="FLEXIBLE"
                                >
                                    <Select className="rounded-xl">
                                        <Select.Option value="FLEXIBLE">Linh hoạt (Được giải ngân dù chưa đủ)</Select.Option>
                                        <Select.Option value="FIXED">Cố định (Phải đủ mục tiêu mới giải ngân)</Select.Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    label={<span className="font-bold text-gray-700">Danh mục</span>}
                                    name="category"
                                    rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
                                >
                                    <Select className="rounded-xl" placeholder="Chọn danh mục...">
                                        <Select.Option value="Y_TE"> Y tế & Sức khỏe</Select.Option>
                                        <Select.Option value="GIAO_DUC"> Giáo dục</Select.Option>
                                        <Select.Option value="THIEN_TAI"> Thiên tai bão lũ</Select.Option>
                                        <Select.Option value="XAY_DUNG"> Xây dựng cơ sở hạ tầng</Select.Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        </Col>
                    </Row>

                    <div className="mt-8 text-center border-t border-gray-100 pt-8">
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="h-14 px-12 text-lg font-black bg-brand! hover:bg-blue-700! rounded-xl shadow-lg"
                        >
                            GỬI YÊU CẦU KIỂM DUYỆT
                        </Button>
                        <p className="text-xs text-gray-400 mt-3">
                            Bằng việc gửi yêu cầu, bạn cam kết tính trung thực của các thông tin trên và chịu trách nhiệm trước pháp luật.
                        </p>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default ProposeCampaignPage;