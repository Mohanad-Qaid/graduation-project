import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, Statistic, Table, Typography, Spin } from 'antd';
import {
  UserOutlined,
  TransactionOutlined,
  BankOutlined,
  WarningOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import dayjs from 'dayjs';

const { Title } = Typography;

/**
 * NOTE: This dashboard currently shows static/aggregated counts from real API endpoints.
 * The transaction volume chart is a static placeholder — no backend stats endpoint exists yet.
 * TODO: Ask backend to add GET /admin/stats to return richer dashboard data.
 */

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, isLoading, error } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  if (isLoading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

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
      render: (type) => type || '-',
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
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('HH:mm DD/MM'),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Dashboard Overview</Title>


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
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Platform Revenue"
              value={Number(stats.totalRevenue || 0).toFixed(2)}
              prefix={<DollarCircleOutlined style={{ color: '#388E3C' }} />}
              suffix="TRY"
              valueStyle={{ color: '#388E3C', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

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
