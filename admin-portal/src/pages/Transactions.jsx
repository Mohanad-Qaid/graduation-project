import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Card, Typography, Tag, Select, DatePicker, Row, Col } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Backend ENUM values are uppercase: PAYMENT, TOPUP, WITHDRAWAL, COMPLETED, PENDING, FAILED

const typeColors = { PAYMENT: 'blue', TOPUP: 'green', WITHDRAWAL: 'orange' };
const statusColors = { COMPLETED: 'success', PENDING: 'warning', FAILED: 'error' };

const Transactions = () => {
  const dispatch = useDispatch();
  const { list, pagination, isLoading } = useSelector((state) => state.transactions);

  const [filters, setFilters] = useState({
    type: null,
    status: null,
    startDate: null,
    endDate: null,
    page: 1,
  });

  useEffect(() => {
    const params = { page: filters.page, limit: 20 };
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    dispatch(fetchTransactions(params));
  }, [dispatch, filters]);

  const handleDateChange = (dates) => {
    setFilters({
      ...filters,
      startDate: dates ? dates[0].toISOString() : null,
      endDate: dates ? dates[1].toISOString() : null,
      page: 1,
    });
  };

  const columns = [
    {
      title: 'Reference',
      dataIndex: 'reference_code',   // snake_case from backend
      key: 'reference_code',
      render: (code) => <code style={{ fontSize: 12 }}>{code}</code>,
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type', // backend field name
      key: 'transaction_type',
      render: (type) => <Tag color={typeColors[type]}>{type}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 500 }}>₺{Number(amount).toFixed(2)}</span>
      ),
    },
    {
      title: 'From',
      key: 'sender',
      render: (_, record) => {
        // senderWallet → User association (backend includes via eager loading)
        const user = record.senderWallet?.user;
        return user ? (
          <div>
            <div>{user.full_name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{user.email}</div>
          </div>
        ) : <span style={{ color: '#bbb' }}>System / Top-up</span>;
      },
    },
    {
      title: 'To',
      key: 'receiver',
      render: (_, record) => {
        const user = record.receiverWallet?.user;
        return user ? (
          <div>
            <div>{user.full_name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{user.email}</div>
          </div>
        ) : <span style={{ color: '#bbb' }}>Withdrawal</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Fraud?',
      dataIndex: 'fraudFlags',
      key: 'fraudFlags',
      render: (flags) =>
        flags && flags.length > 0 ? (
          <Tag icon={<WarningOutlined />} color="red">YES</Tag>
        ) : (
          <Tag color="default">NO</Tag>
        ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>All Transactions</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Type"
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="PAYMENT">Payment</Select.Option>
              <Select.Option value="TOPUP">Top-up</Select.Option>
              <Select.Option value="WITHDRAWAL">Withdrawal</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="COMPLETED">Completed</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="FAILED">Failed</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10}>
            <RangePicker onChange={handleDateChange} style={{ width: '100%' }} />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            onChange: (page) => setFilters({ ...filters, page }),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} transactions`,
          }}
        />
      </Card>
    </div>
  );
};

export default Transactions;
