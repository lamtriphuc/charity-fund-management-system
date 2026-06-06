import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, DatePicker, Card, Statistic, Space, message, Tooltip } from 'antd';
import { SearchOutlined, FileProtectOutlined } from '@ant-design/icons';
import { ledgerService } from '../../services/ledgerService'; // Chỉnh đường dẫn cho đúng
import useAuthStore from '../../store/authStore';

const { RangePicker } = DatePicker;
const { Search } = Input;

const AdminLedger = () => {
    const { user: currentUser } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalCash: 0, totalLiability: 0, surplus: 0 });
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // State quản lý phân trang Backend
    const [tableParams, setTableParams] = useState({
        current: 1,
        pageSize: 15,
        total: 0
    });

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 1. Fetch Thống kê số dư
    const fetchBalances = async () => {
        try {
            const res = await ledgerService.getBalances();
            setStats(res);
        } catch (error) {
            console.error('Lỗi tải số dư:', error);
        }
    };

    // 2. Fetch danh sách Bút toán
    const fetchLedgerLines = async (page = tableParams.current, limit = tableParams.pageSize) => {
        setLoading(true);
        try {
            const params = { page, limit };
            if (searchTerm) params.keyword = searchTerm;

            const response = await ledgerService.getLines(params);
            setData(response.data || []);
            setTableParams({
                ...tableParams,
                current: page,
                total: response.meta?.totalItems || 0,
            });
        } catch (error) {
            message.error('Không thể tải dữ liệu sổ cái!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
        fetchLedgerLines(1, tableParams.pageSize);
    }, [searchTerm]);

    // Xử lý sự kiện chuyển trang của Table
    const handleTableChange = (pagination) => {
        fetchLedgerLines(pagination.current, pagination.pageSize);
    };

    const shortenUuid = (id, start = 8, end = 4) => {
        if (!id) return '-';
        if (id.length <= start + end) return id;
        return `${id.slice(0, start)}...${id.slice(-end)}`;
    };

    const columns = [
        {
            title: 'Mã Bút Toán',
            dataIndex: 'transactionId',
            key: 'transactionId',
            width: 120,
            render: (text) => (
                <Tooltip title={text}>
                    <span className="font-bold hover:underline cursor-pointer">
                        {shortenUuid(text)}
                    </span>
                </Tooltip>
            )
        },
        {
            title: 'Thời gian',
            dataIndex: 'date',
            key: 'date',
            width: 160,
            render: (date) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Tài khoản hạch toán',
            dataIndex: 'account',
            key: 'account',
            render: (text, record) => (
                <div>
                    <Tag className="bg-slate-100! border-none! text-primary! font-semibold px-3">{text}</Tag>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase">{record.accountCode}</div>
                </div>
            )
        },
        {
            title: 'Nội dung',
            dataIndex: 'description',
            key: 'description',
            width: '25%',
            render: (text) => <span className="text-primary! font-medium">{text}</span>
        },
        {
            title: 'Nợ (Debit)',
            dataIndex: 'debit',
            key: 'debit',
            align: 'right',
            render: (val) => val > 0 ? <span className="text-green-600! font-bold">{formatMoney(val)}</span> : '-'
        },
        {
            title: 'Có (Credit)',
            dataIndex: 'credit',
            key: 'credit',
            align: 'right',
            render: (val) => val > 0 ? <span className="text-red-600! font-bold">{formatMoney(val)}</span> : '-'
        },
        {
            title: 'Đối ứng',
            dataIndex: 'reference',
            key: 'reference',
            align: 'center',
            render: (ref) => (
                <Tooltip title={ref}>
                    <span className="text-brand! font-bold hover:underline cursor-pointer">
                        {shortenUuid(ref)}
                    </span>
                </Tooltip>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-primary! m-0">Sổ Cái Hệ Thống</h1>
                    <p className="text-gray-500 m-0">Dòng tiền chi tiết được hạch toán theo nguyên tắc kế toán kép.</p>
                </div>

            </div>

            {/* Thống kê nhanh số dư */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Tổng tiền mặt (Khả dụng)"
                        value={stats.totalCash}
                        styles={{ content: { color: '#0F172A', fontWeight: 900 } }}
                        suffix="₫"
                    />
                </Card>
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Tổng nợ phải trả (Trách nhiệm giải ngân)"
                        value={stats.totalLiability}
                        styles={{ content: { color: '#2563EB', fontWeight: 900 } }}
                        suffix="₫"
                    />
                </Card>
                <Card className="rounded-2xl! shadow-sm border-none!">
                    <Statistic
                        title="Thặng dư hệ thống"
                        value={stats.surplus}
                        styles={{ content: { color: '#F59E0B', fontWeight: 900 } }}
                        suffix="₫"
                    />
                </Card>
            </div>

            {/* Bộ lọc */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <Search
                    placeholder="Tìm mã tham chiếu, nội dung..."
                    allowClear
                    onSearch={(value) => setSearchTerm(value)}
                    className="w-full md:w-80 rounded-lg"
                />
            </div>

            {/* Bảng giao dịch */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    onChange={handleTableChange}
                    pagination={{
                        current: tableParams.current,
                        pageSize: tableParams.pageSize,
                        total: tableParams.total,
                        className: "p-6!",
                        showSizeChanger: false
                    }}
                    className="custom-admin-table"
                />
            </div>
        </div>
    );
};

export default AdminLedger;