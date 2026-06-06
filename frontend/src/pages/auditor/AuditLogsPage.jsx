import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Input, DatePicker, Button, Space, message, Tooltip, Descriptions, Modal } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, DownloadOutlined, ClearOutlined, FilterOutlined } from '@ant-design/icons';
import { auditService } from '../../services/auditService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

    const [filterInput, setFilterInput] = useState({ keyword: '', startDate: '', endDate: '' });
    const [appliedFilter, setAppliedFilter] = useState({ keyword: '', startDate: '', endDate: '' });

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);


    const fetchLogs = async (page = 1, currentFilters = appliedFilter) => {
        setLoading(true);
        try {
            const res = await auditService.getAuditLogs(
                page,
                pagination.pageSize,
                currentFilters.keyword,
                currentFilters.startDate,
                currentFilters.endDate
            );

            const responseData = res?.data
            const totalItems = res?.total || 0;

            setLogs(responseData);
            setPagination(prev => ({
                ...prev,
                current: page,
                total: totalItems,
            }));
        } catch (error) {
            message.error("Không thể tải nhật ký hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const handleApplyFilters = () => {
        setAppliedFilter(filterInput);
        fetchLogs(1, filterInput);
    };


    const openDetailModal = (record) => {
        setSelectedLog(record);
        setDetailOpen(true);
    };

    const closeDetailModal = () => {
        setDetailOpen(false);
        setSelectedLog(null);
    };

    const handleClearFilters = () => {
        const emptyFilters = { keyword: '', startDate: '', endDate: '' };
        setFilterInput(emptyFilters);
        setAppliedFilter(emptyFilters);
        fetchLogs(1, emptyFilters);
    };

    const JsonBlock = ({ title, data, color = 'gray' }) => {
        if (!data || Object.keys(data).length === 0) return null;

        const colorClass = {
            red: 'bg-red-50 border-red-100',
            green: 'bg-green-50 border-green-100',
            blue: 'bg-blue-50 border-blue-100',
            gray: 'bg-gray-50 border-gray-100',
        }[color];

        return (
            <div className="mb-4">
                <div className="text-xs font-bold text-gray-600 mb-1">{title}</div>
                <pre className={`text-xs text-gray-700 border p-3 rounded-lg max-h-64 overflow-auto whitespace-pre-wrap ${colorClass}`}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    };

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'timestamp',
            render: (val) => <span className="font-mono text-gray-500 text-xs">{val ? new Date(val).toLocaleString('vi-VN') : 'N/A'}</span>,
            width: 160
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => {
                const isSuccess = record.status === 'SUCCESS';
                const actionColor = isSuccess ? 'green' : 'red';
                const severityColor = record.severity === 'WARN' || record.severity === 'CRITICAL' ? 'text-red-500' : 'text-blue-500';

                return (
                    <div className="flex flex-col items-start gap-1">
                        <Tag color={actionColor} className="font-bold border-none m-0">
                            {record.action || 'UNKNOWN'}
                        </Tag>
                        {/* Hiện trạng thái và mức độ nghiêm trọng */}
                        <span className={`text-[10px] font-bold ${severityColor}`}>
                            [{record.severity || 'INFO'}] {record.status}
                        </span>
                    </div>
                );
            },
            width: 100
        },
        {
            title: 'Người thực hiện',
            key: 'actor',
            render: (_, record) => (
                <div>
                    <div className="font-semibold text-gray-700">{record.actor_email || 'Hệ thống (Auto)'}</div>
                    {/* Hiển thị thêm Role để dễ quản lý */}
                    {record.actor_role && record.actor_role !== 'Unknown' && (
                        <Tag className="text-[10px] mt-1 border-none bg-gray-100 text-gray-500">
                            {record.actor_role}
                        </Tag>
                    )}
                </div>
            ),
            width: 100
        },
        {
            title: 'Đối tượng (Entity)',
            key: 'target',
            render: (_, r) => (
                r.entity && r.entity !== 'UNKNOWN' ? (
                    <div className="text-gray-600 text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                        <strong className="text-gray-800">{r.entity}</strong> <br />
                        {/* Dùng Tooltip để không bị tràn dòng cái ID quá dài */}
                        <Tooltip title={r.entity_id}>
                            <span className="font-mono truncate block max-w-[120px] text-gray-400">
                                {r.entity_id || 'N/A'}
                            </span>
                        </Tooltip>
                    </div>
                ) : <span className="text-gray-400 italic text-xs">N/A</span>
            ),
            width: 160
        },
        {
            title: 'Chi tiết',
            key: 'detail',
            align: 'center',
            width: 120,
            render: (_, record) => (
                <Button
                    size="small"
                    type="link"
                    onClick={() => openDetailModal(record)}
                >
                    Xem chi tiết
                </Button>
            )
        },
        {
            title: 'Nguồn truy cập',
            key: 'source',
            render: (_, record) => {
                const ip = record.ip_address || record.ipAddress || '127.0.0.1';
                const ua = record.user_agent || record.userAgent || 'N/A';

                return (
                    <div className="max-w-[180px]">
                        <div className="font-mono text-xs text-gray-500 mb-1">
                            {ip}
                        </div>

                        <Tooltip title={ua}>
                            <div className="text-[10px] text-gray-400 truncate">
                                {ua}
                            </div>
                        </Tooltip>
                    </div>
                );
            },
            width: 190
        }
    ];

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <Title level={2} className="text-primary! m-0 flex items-center gap-2">
                        <SafetyCertificateOutlined /> Nhật ký Kiểm toán
                    </Title>
                    <Text className="text-gray-500">Ghi nhận không thể xóa bỏ mọi thao tác quan trọng trên hệ thống</Text>
                </div>
                <div className="flex flex-col gap-3 items-end">
                    <Space>
                        <Button onClick={handleClearFilters} icon={<ClearOutlined />}>
                            Xóa bộ lọc
                        </Button>

                    </Space>

                    <Space className="p-2 rounded-lg ">
                        {/* Chỉ cập nhật state NHÁP (filterInput), không gọi API */}
                        <Input
                            placeholder="Nhập email, IP, đối tượng..."
                            prefix={<SearchOutlined />}
                            className="w-64"
                            value={filterInput.keyword}
                            onChange={(e) => setFilterInput({ ...filterInput, keyword: e.target.value })}
                            onPressEnter={handleApplyFilters} // Gọi API khi ấn Enter
                        />

                        {/* Chỉ cập nhật state NHÁP (filterInput), không gọi API */}
                        <RangePicker
                            allowClear
                            value={filterInput.startDate && filterInput.endDate ? [dayjs(filterInput.startDate), dayjs(filterInput.endDate)] : null}
                            placeholder={['Từ ngày', 'Đến ngày']}
                            onChange={(dates) => {
                                setFilterInput({
                                    ...filterInput,
                                    startDate: dates ? dates[0].startOf('day').toISOString() : '',
                                    endDate: dates ? dates[1].endOf('day').toISOString() : ''
                                });
                            }}
                        />

                        {/* NÚT CHỐT: GỌI API Ở ĐÂY */}
                        <Button
                            type="primary"
                            icon={<FilterOutlined />}
                            onClick={handleApplyFilters}
                            className="bg-brand! font-bold shadow-md"
                        >
                            Lọc Dữ Liệu
                        </Button>
                    </Space>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={logs}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: false,
                    onChange: (page) => fetchLogs(page, appliedFilter),
                }}
                className="bg-white border border-gray-200 rounded-xl shadow-sm custom-admin-table"
                size="middle"
            />
            <Modal
                title="Chi tiết nhật ký kiểm toán"
                open={detailOpen}
                onCancel={closeDetailModal}
                footer={null}
                width={900}
            >
                {selectedLog && (
                    <div>
                        <Descriptions
                            bordered
                            size="small"
                            column={1}
                            className="mb-4"
                        >
                            <Descriptions.Item label="Thời gian">
                                {selectedLog.timestamp
                                    ? new Date(selectedLog.timestamp).toLocaleString('vi-VN')
                                    : 'N/A'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Hành động">
                                <Tag color={selectedLog.status === 'SUCCESS' ? 'green' : 'red'}>
                                    {selectedLog.action || 'UNKNOWN'}
                                </Tag>
                                <Tag color={selectedLog.severity === 'CRITICAL' ? 'red' : selectedLog.severity === 'WARN' ? 'orange' : 'blue'}>
                                    {selectedLog.severity || 'INFO'}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Người thực hiện">
                                {selectedLog.actor_email || 'Hệ thống (Auto)'}
                                {' '}
                                <Tag>{selectedLog.actor_role || 'Unknown'}</Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Đối tượng">
                                {selectedLog.entity || 'N/A'}
                                {selectedLog.entity_id && (
                                    <div className="font-mono text-xs text-gray-500 mt-1">
                                        {selectedLog.entity_id}
                                    </div>
                                )}
                            </Descriptions.Item>

                            <Descriptions.Item label="Nguồn truy cập">
                                <div className="font-mono text-xs">
                                    IP: {selectedLog.ip_address || selectedLog.ipAddress || '127.0.0.1'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 break-all">
                                    User Agent: {selectedLog.user_agent || selectedLog.userAgent || 'N/A'}
                                </div>
                            </Descriptions.Item>

                            {selectedLog.error && (
                                <Descriptions.Item label="Lỗi">
                                    <span className="text-red-500 font-semibold">
                                        {selectedLog.error}
                                    </span>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <JsonBlock title="Trước thay đổi" data={selectedLog.before} color="red" />
                        <JsonBlock title="Sau thay đổi" data={selectedLog.after} color="green" />
                        <JsonBlock title="Metadata" data={selectedLog.metadata} color="blue" />
                        <JsonBlock title="Payload" data={selectedLog.payload} color="gray" />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AuditLogsPage;