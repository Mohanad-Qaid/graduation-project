import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  Table, Card, Typography, Tag, Select, DatePicker,
  Row, Col, InputNumber, Input,
} from 'antd';
import { SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { useErrorToast } from '../hooks/useErrorToast';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const typeColors = { PAYMENT: 'blue', TOPUP: 'green', WITHDRAWAL: 'orange' };
const statusColors = { COMPLETED: 'success', PENDING: 'warning', FAILED: 'error' };

function resolveFrom(record) {
  const type = record.transaction_type;
  if (type === 'TOPUP') {
    const cp = (record.counterparty || '').toLowerCase();
    if (cp === 'admin') return { label: 'Admin Top-Up', sub: null };
    return { label: 'Stripe / Customer', sub: null };
  }
  const sender = record.senderWallet?.owner;
  if (sender) return { label: `${sender.first_name} ${sender.last_name}`, sub: sender.email };
  return { label: '—', sub: null };
}

function resolveTo(record) {
  const type = record.transaction_type;
  if (type === 'WITHDRAWAL') {
    const wr = record.withdrawalRequest;
    return {
      label: wr?.bank_name       || record.counterparty || 'Bank Transfer',
      sub:   wr?.bank_account_name || null,
      sub2:  wr?.bank_account      || null,
    };
  }
  const receiver = record.receiverWallet?.owner;
  if (receiver) return { label: receiver.business_name || `${receiver.first_name} ${receiver.last_name}`, sub: receiver.email, sub2: null };
  return { label: '—', sub: null, sub2: null };
}

const Transactions = () => {
  const dispatch = useDispatch();
  const { list, pagination, isLoading, error } = useSelector((state) => state.transactions);
  useErrorToast(error, 'Failed to load transactions');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [searchInput, setSearchInput] = useState(initialRef);
  const [filters, setFilters] = useState({
    type: null, status: null,
    startDate: null, endDate: null,
    minAmount: null, maxAmount: null,
    reference: initialRef, search: '',
    page: 1,
  });

  const debounceRef = useRef(null);

  useEffect(() => {
    if (initialRef) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = { page: filters.page, limit: 50 };
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minAmount !== null && filters.minAmount !== '') params.minAmount = filters.minAmount;
    if (filters.maxAmount !== null && filters.maxAmount !== '') params.maxAmount = filters.maxAmount;
    if (filters.reference?.trim()) params.reference = filters.reference.trim();
    if (filters.search?.trim()) params.search = filters.search.trim();
    dispatch(fetchTransactions(params));
  }, [dispatch, filters]);

  const handleDateChange = (dates) => {
    setFilters((prev) => ({
      ...prev,
      startDate: dates ? dates[0].toISOString() : null,
      endDate: dates ? dates[1].toISOString() : null,
      page: 1,
    }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const isRef = /^(TXN|REF|PAY)-/i.test(val.trim());
      setFilters((prev) => ({
        ...prev,
        reference: isRef ? val.trim() : '',
        search: isRef ? '' : val.trim(),
        page: 1,
      }));
    }, 400);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setFilters((prev) => ({ ...prev, reference: '', search: '', page: 1 }));
  };

  const columns = [
    {
      title: 'Reference',
      dataIndex: 'reference_code',
      key: 'reference_code',
      render: (code) => <code style={{ fontSize: 12 }}>{code}</code>,
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      render: (type) => <Tag color={typeColors[type]}>{type}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <span style={{ fontWeight: 500 }}>₺{Number(amount).toFixed(2)}</span>,
    },
    {
      title: 'From',
      key: 'from',
      render: (_, record) => {
        const { label, sub } = resolveFrom(record);
        return (
          <div>
            <div style={{ fontSize: 13 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: '#999' }}>{sub}</div>}
          </div>
        );
      },
    },
    {
      title: 'To',
      key: 'to',
      render: (_, record) => {
        const { label, sub, sub2 } = resolveTo(record);
        return (
          <div>
            <div style={{ fontSize: 13 }}>{label}</div>
            {sub  && <div style={{ fontSize: 11, color: '#999' }}>{sub}</div>}
            {sub2 && <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{sub2}</div>}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Fraud?',
      dataIndex: 'fraudFlags',
      key: 'fraudFlags',
      render: (flags) =>
        flags && flags.length > 0
          ? <Tag icon={<WarningOutlined />} color="red">YES</Tag>
          : <Tag color="default">NO</Tag>,
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
          <Col xs={24} sm={24} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              placeholder="Search by reference code, user name or email…"
              value={searchInput}
              onChange={handleSearchChange}
              allowClear
              onClear={handleSearchClear}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Type"
              value={filters.type}
              onChange={(value) => setFilters((prev) => ({ ...prev, type: value, page: 1 }))}
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
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
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
              onChange={(value) => setFilters((prev) => ({ ...prev, minAmount: value, page: 1 }))}
              style={{ width: '100%' }}
              prefix="₺"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <InputNumber
              placeholder="Max Amount"
              min={0}
              value={filters.maxAmount}
              onChange={(value) => setFilters((prev) => ({ ...prev, maxAmount: value, page: 1 }))}
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
            pageSize: pagination?.limit || 50,
            total: pagination?.total || 0,
            onChange: (page) => setFilters((prev) => ({ ...prev, page })),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} transactions`,
          }}
        />
      </Card>
    </div>
  );
};

export default Transactions;
