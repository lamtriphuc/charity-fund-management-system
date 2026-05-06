import React, { useState, useEffect } from 'react';
import {  Input, Typography, Tag, Card, Statistic, Row, Col, Button, Table  } from 'antd';
import { SearchOutlined, SafetyOutlined, SwapOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { campaignService } from '../services/campaignService';
import { formatMoney } from '../utils/helper';
import moment from 'moment'; 
import ColumnGroup from 'antd/es/table/ColumnGroup';

const { Title, Text } = Typography;
const { Search } = Input;

const StatementPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [keyword, setKeyword] = useState('');
    const [currentSortBy, setCurrentSortBy] = useState('createdAt');
    const [currentSortOrder, setCurrentSortOrder] = useState('DESC');

    const fetchStatements = async (page = 1, searchKeyword = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
        setLoading(true);
        try {
            const res = await campaignService.getStatements({
                page: page,
                limit: 20,
                keyword: searchKeyword,
                sortBy: sortBy,
                sortOrder: sortOrder
            });
            const responseData = res; 
            setData(responseData.data);
            setTotal(responseData.total);
            setCurrentPage(page);
        } catch (error) {
            console.error("Lỗi tải sao kê:", error);
        } finally {
            setLoading(false);
        }
    };

    // Load lần đầu tiên
    useEffect(() => {
        fetchStatements(1, '', 'createdAt', 'DESC');
    }, []);

    // Xử lý khi người dùng đổi trang
    const handleTableChange = (pagination, filters, sorter) => {
        let newSortBy = 'createdAt';
        let newSortOrder = 'DESC';

        if (sorter && sorter.order) {
            newSortBy = sorter.field; 
            newSortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC'; // Antd dùng chữ ascend/descend, mình quy đổi ra ASC/DESC cho BE
        }

        setCurrentSortBy(newSortBy);
        setCurrentSortOrder(newSortOrder);

        fetchStatements(pagination.current, keyword, newSortBy, newSortOrder);
    };

    // Xử lý khi search
    const handleSearch = (value) => {
        setKeyword(value);
        fetchStatements(1, value, currentSortBy, currentSortOrder);
    };

    // Cấu hình các cột của bảng Sao kê
    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            sorter: true,
            render: (text) => (
                <span className="text-gray-500 font-medium">
                    {moment(text).format('DD/MM/YYYY HH:mm:ss')}
                </span>
            ),
        },
        {
            title: 'Mã GD',
            dataIndex: 'txReference',
            key: 'txReference',
            width: 150,
            render: (text) => (
                <Tag color="blue" className="font-mono text-sm border-none bg-blue-50 text-blue-600">
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Người ủng hộ',
            dataIndex: 'donorName',
            key: 'donorName',
            width: 200,
            render: (text) => <span className="font-bold text-gray-800">{text}</span>,
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            sorter: true,
            render: (amount) => (
                <span className="font-black text-brand! text-base">
                    {formatMoney(amount)}
                </span>
            ),
        },
        {
            title: 'Nội dung / Lời nhắn',
            dataIndex: 'message',
            key: 'message',
            render: (text, record) => (
                <div>
                    <div className="text-gray-700">{text || 'Quyen gop tu thien'}</div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                        ↳ Chiến dịch: {record.campaignTitle}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="max-w-7xl mx-auto py-10 px-4">
            {/* HEADER */}
            <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <SafetyOutlined className="text-3xl text-green-500" />
                    <Title level={2} className="m-0 text-primary!">Sao kê điện tử tự động</Title>
                </div>
                <Text className="text-gray-500 text-lg">
                    Dữ liệu được cập nhật tự động từ Sổ cái (Ledger) ngay khi giao dịch ngân hàng thành công.
                </Text>
            </div>

            {/* THANH TÌM KIẾM */}
            <Card className="rounded-none! shadow-sm border border-gray-100 mb-8 bg-white">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="w-full md:w-1/2">
                        <Search
                            placeholder="Tìm theo Mã GD, Tên người gửi hoặc Lời nhắn..."
                            allowClear
                            enterButton={<Button type="primary" className="bg-brand!">Tìm kiếm</Button>}
                            size="large"
                            onSearch={handleSearch}
                            className="custom-search-input"
                        />
                    </div>
                    <div className="flex gap-4">
                        <Statistic 
                            title="Tổng số giao dịch" 
                            value={total} 
                            prefix={<SwapOutlined className="text-brand!" />} 
                            valueStyle={{ fontWeight: 900, color: '#1E3A8A' }} 
                        />
                    </div>
                </div>
            </Card>

            {/* BẢNG SAO KÊ */}
            <div className="bg-white shadow-xl border border-gray-100 overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    onChange={handleTableChange}
                    pagination={{
                        current: currentPage,
                        pageSize: 20,
                        total: total,
                        showSizeChanger: false, // Tắt chọn pageSize để UI gọn gàng
                        position: ['bottomCenter'],
                        className: 'py-4'
                    }}
                    scroll={{ x: 800 }} // Cuộn ngang trên mobile
                    className="custom-statement-table"
                />
            </div>
        </div>
    );
};

export default StatementPage;