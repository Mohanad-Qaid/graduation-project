import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Card, Typography, Tag, Select, DatePicker, Row, Col, InputNumber } from 'antd';
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
    minAmount: null,
    maxAmount: null,
    page: 1,
  });

  useEffect(() => {
    const params = { page: filters.page, limit: 20 };
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minAmount !== null && filters.minAmount !== '') params.minAmount = filters.minAmount;
    if (filters.maxAmount !== null && filters.maxAmount !== '') params.maxAmount = filters.maxAmount;
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
        // senderWallet → User association (backend eager-loads with alias 'owner')
        const sender = record.senderWallet?.owner;
        return sender ? (
          <div>
            <div>{`${sender.first_name} ${sender.last_name}`}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{sender.email}</div>
          </div>
        ) : <span style={{ color: '#bbb' }}>System / Top-up</span>;
      },
    },
    {
      title: 'To',
      key: 'receiver',
      render: (_, record) => {
        const receiver = record.receiverWallet?.owner;
        return receiver ? (
          <div>
            <div>{`${receiver.first_name} ${receiver.last_name}`}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{receiver.email}</div>
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
          <Col xs={24} sm={12} md={4}>
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
          <Col xs={24} sm={12} md={4}>
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
          <Col xs={24} sm={24} md={8}>
            <RangePicker onChange={handleDateChange} style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <InputNumber
              placeholder="Min Amount"
              min={0}
              value={filters.minAmount}
              onChange={(value) => setFilters({ ...filters, minAmount: value, page: 1 })}
              style={{ width: '100%' }}
              prefix="₺"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <InputNumber
              placeholder="Max Amount"
              min={0}
              value={filters.maxAmount}
              onChange={(value) => setFilters({ ...filters, maxAmount: value, page: 1 })}
              style={{ width: '100%' }}
              prefix="₺"
            />
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
