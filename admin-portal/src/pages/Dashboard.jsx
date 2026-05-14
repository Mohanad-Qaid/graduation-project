import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Select, DatePicker, Space, Divider, Tag } from 'antd';
import {
  UserOutlined,
  TransactionOutlined,
  BankOutlined,
  WarningOutlined,
  DollarCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  fetchDashboardStats,
  fetchFilteredRevenue,
  clearFilteredRevenue,
} from '../store/slices/dashboardSlice';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Preset helpers ─────────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

function getPresetDates(preset) {
  const now = dayjs();
  switch (preset) {
    case 'today': return { startDate: now.startOf('day').toISOString(), endDate: now.endOf('day').toISOString() };
    case 'week': return { startDate: now.startOf('week').toISOString(), endDate: now.endOf('week').toISOString() };
    case 'month': return { startDate: now.startOf('month').toISOString(), endDate: now.endOf('month').toISOString() };
    default: return {};
  }
}

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, isLoading, filteredRevenue, revenueLoading } = useSelector((state) => state.dashboard);

  const [preset, setPreset] = useState('today');
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchFilteredRevenue(getPresetDates('today'))); // today on load
  }, [dispatch]);

  const applyFilter = (newPreset, newRange) => {
    if (newRange && newRange[0] && newRange[1]) {
      dispatch(fetchFilteredRevenue({
        startDate: newRange[0].startOf('day').toISOString(),
        endDate: newRange[1].endOf('day').toISOString(),
      }));
    } else {
      dispatch(fetchFilteredRevenue(getPresetDates(newPreset)));
    }
  };

  const handlePresetChange = (val) => {
    setPreset(val);
    setDateRange(null);
    applyFilter(val, null);
  };

  const handleRangeChange = (dates) => {
    setDateRange(dates);
    if (dates && dates[0] && dates[1]) {
      setPreset(null);
      applyFilter(null, dates);
    }
  };

  const handleReset = () => {
    setPreset('all');
    setDateRange(null);
    dispatch(clearFilteredRevenue());
    dispatch(fetchFilteredRevenue({}));
  };

  if (isLoading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── Bug fix: Status column uses colored Tags ───────────────────────────────
  const STATUS_COLORS = {
    COMPLETED: 'success',
    PENDING: 'warning',
    FAILED: 'error',
  };

  const recentColumns = [
    {
      title: 'Reference',
      dataIndex: 'reference_code',
      key: 'reference_code',
      render: (code) => <code style={{ fontSize: 11 }}>{code}</code>,
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      render: (type) => type || '—',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₺${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status || '—'}</Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('HH:mm · DD/MM'),
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        <Tag color="purple" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
          {dayjs().format('dddd, DD MMM YYYY')}
        </Tag>
      </div>

      {/* ── Stat cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined style={{ color: '#6200EE' }} />}
              valueStyle={{ color: '#6200EE' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Transactions"
              value={stats.totalTransactions}
              prefix={<TransactionOutlined style={{ color: '#2196F3' }} />}
              valueStyle={{ color: '#2196F3' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Pending Withdrawals"
              value={stats.pendingWithdrawals}
              prefix={<BankOutlined style={{ color: '#FF9800' }} />}
              valueStyle={{ color: '#FF9800' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Unreviewed Fraud Flags"
              value={stats.unreviewedFraudFlags}
              prefix={<WarningOutlined style={{ color: '#F44336' }} />}
              valueStyle={{ color: '#F44336' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Revenue Filter Panel ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <FilterOutlined style={{ color: '#6200EE' }} />
                <span>Platform Revenue</span>
              </Space>
            }
            extra={
              <a onClick={handleReset} style={{ color: '#6200EE', cursor: 'pointer' }}>
                <ReloadOutlined /> Reset
              </a>
            }
          >
            <Space wrap style={{ marginBottom: 20 }}>
              <Select
                value={preset}
                onChange={handlePresetChange}
                style={{ width: 140 }}
                options={PRESETS}
                placeholder="Quick select"
              />
              <RangePicker
                value={dateRange}
                onChange={handleRangeChange}
                disabledDate={(d) => d && d.isAfter(dayjs())}
                format="DD/MM/YYYY"
                allowClear
              />
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {revenueLoading ? (
              <Spin size="small" />
            ) : filteredRevenue ? (
              <Row gutter={[24, 0]} align="middle">
                <Col>
                  <Statistic
                    title="Revenue in Period"
                    value={Number(filteredRevenue.totalRevenue || 0).toFixed(2)}
                    suffix="TRY"
                    valueStyle={{ color: '#388E3C', fontSize: 28, fontWeight: 800 }}
                    prefix={<DollarCircleOutlined />}
                  />
                </Col>
                <Col>
                  <Statistic
                    title="Approved Withdrawals"
                    value={filteredRevenue.count || 0}
                    valueStyle={{ color: '#555', fontSize: 22 }}
                  />
                </Col>
                {filteredRevenue.startDate && (
                  <Col style={{ marginTop: 8 }}>
                    <Tag color="purple">
                      {dayjs(filteredRevenue.startDate).format('DD MMM YYYY')}
                      {' → '}
                      {filteredRevenue.endDate
                        ? dayjs(filteredRevenue.endDate).format('DD MMM YYYY')
                        : 'now'}
                    </Tag>
                  </Col>
                )}
              </Row>
            ) : (
              <Text type="secondary">Select a date range to filter revenue.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Recent Transactions ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Recent Transactions">
            <Table
              dataSource={stats.recentTransactions}
              columns={recentColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No transactions yet' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
