import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table, Card, Typography, Tag, Button, Select, Space,
  Modal, message, Row, Col, InputNumber, Input, Tooltip,
} from 'antd';
import {
  ShopOutlined, UserOutlined, StopOutlined,
  CheckCircleOutlined, WalletOutlined, SearchOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { fetchUsers, suspendUser, activateUser, topupUser } from '../store/slices/usersSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const statusColors = {
  APPROVED: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  REJECTED: 'default',
};

const UserManagement = () => {
  const dispatch = useDispatch();
  const { list, pagination, isLoading } = useSelector((state) => state.users);

  const [filters, setFilters] = useState({ role: null, status: null, page: 1, search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [suspendModal, setSuspendModal] = useState({ visible: false, userId: null });
  const [suspendReason, setSuspendReason] = useState('');
  const [topupModal, setTopupModal] = useState({ visible: false, userId: null, userName: '' });
  const [topupAmount, setTopupAmount] = useState(null);
  const [topupDesc, setTopupDesc] = useState('');

  useEffect(() => {
    const params = { page: filters.page, limit: 20 };
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    dispatch(fetchUsers(params));
  }, [dispatch, filters]);

  // Debounce search: wait 400ms after user stops typing
  const debounceRef = React.useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: val, page: 1 }));
    }, 400);
  };
  const handleSearchSubmit = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters((prev) => ({ ...prev, search: val, page: 1 }));
  };

  const handleSuspend = async () => {
    try {
      await dispatch(suspendUser({ userId: suspendModal.userId, reason: suspendReason })).unwrap();
      message.success('User suspended successfully');
      setSuspendModal({ visible: false, userId: null });
      setSuspendReason('');
      dispatch(fetchUsers({ page: filters.page, limit: 20 }));
    } catch (error) {
      message.error(error);
    }
  };

  const handleActivate = async (userId) => {
    Modal.confirm({
      title: 'Re-Activate User',
      content: 'This will set the user status back to Approved.',
      okText: 'Yes, Reactivate',
      onOk: async () => {
        try {
          await dispatch(activateUser(userId)).unwrap();
          message.success('User reactivated successfully');
          dispatch(fetchUsers({ page: filters.page, limit: 20 }));
        } catch (error) {
          message.error(error);
        }
      },
    });
  };

  const handleTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      message.error('Please enter a valid amount');
      return;
    }
    try {
      await dispatch(topupUser({ userId: topupModal.userId, amount: topupAmount, description: topupDesc || undefined })).unwrap();
      message.success('Wallet topped up successfully');
      setTopupModal({ visible: false, userId: null, userName: '' });
      setTopupAmount(null);
      setTopupDesc('');
      dispatch(fetchUsers({ page: filters.page, limit: 20 }));
    } catch (error) {
      message.error(error);
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: record.role === 'MERCHANT' ? '#E1BEE7' : '#BBDEFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              flexShrink: 0,
            }}
          >
            {record.role === 'MERCHANT' ? (
              <ShopOutlined style={{ color: '#7B1FA2' }} />
            ) : (
              <UserOutlined style={{ color: '#1976D2' }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{`${record.first_name} ${record.last_name}`}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
            <div style={{ fontSize: 11, color: '#bbb' }}>{record.phone}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'MERCHANT' ? 'purple' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email_verified',
      key: 'email_verified',
      render: (verified) => verified
        ? <Tag color="success" icon={<CheckCircleOutlined />}>Verified</Tag>
        : <Tag color="default">Unverified</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {/* APPROVED → can suspend */}
          {record.status === 'APPROVED' && (
            <Button
              danger
              icon={<StopOutlined />}
              size="small"
              onClick={() => setSuspendModal({ visible: true, userId: record.id })}
            >
              Suspend
            </Button>
          )}

          {/* SUSPENDED → can reactivate */}
          {record.status === 'SUSPENDED' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              onClick={() => handleActivate(record.id)}
            >
              Reactivate
            </Button>
          )}

          {/* REJECTED → can re-approve */}
          {record.status === 'REJECTED' && (
            <Tooltip title="Re-approve this rejected account">
              <Button
                type="default"
                icon={<RollbackOutlined />}
                size="small"
                onClick={() => handleActivate(record.id)}
              >
                Re-Approve
              </Button>
            </Tooltip>
          )}

          {/* Top-Up only for APPROVED users */}
          {record.status === 'APPROVED' && (
            <Button
              icon={<WalletOutlined />}
              size="small"
              onClick={() => setTopupModal({ visible: true, userId: record.id, userName: `${record.first_name} ${record.last_name}` })}
            >
              Top-Up
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 className="page-title" style={{ marginBottom: 24 }}>User Management</h2>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Search bar — full width on small, grows on larger screens */}
          <Col xs={24} md={12}>
            <Input
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              placeholder="Search by name, email or phone…"
              value={searchInput}
              onChange={handleSearchChange}
              onPressEnter={(e) => handleSearchSubmit(e.target.value)}
              allowClear
              onClear={() => handleSearchSubmit('')}
              size="middle"
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Role"
              value={filters.role}
              onChange={(value) => setFilters({ ...filters, role: value, page: 1 })}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="CUSTOMER">Customer</Select.Option>
              <Select.Option value="MERCHANT">Merchant</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="SUSPENDED">Suspended</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            onChange: (page) => setFilters({ ...filters, page }),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>

      {/* Suspend Modal */}
      <Modal
        title="Suspend User"
        open={suspendModal.visible}
        onOk={handleSuspend}
        onCancel={() => {
          setSuspendModal({ visible: false, userId: null });
          setSuspendReason('');
        }}
        okText="Suspend"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to suspend this user? They will not be able to log in.</p>
        <TextArea
          placeholder="Suspension reason (optional)"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          rows={3}
        />
      </Modal>

      {/* Top-Up Modal */}
      <Modal
        title={`Top-Up Wallet — ${topupModal.userName}`}
        open={topupModal.visible}
        onOk={handleTopup}
        onCancel={() => {
          setTopupModal({ visible: false, userId: null, userName: '' });
          setTopupAmount(null);
          setTopupDesc('');
        }}
        okText="Add Funds"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Amount (TRY)</label>
          <InputNumber
            min={1}
            precision={2}
            style={{ width: '100%' }}
            placeholder="0.00"
            value={topupAmount}
            onChange={setTopupAmount}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Description (optional)</label>
          <TextArea
            placeholder="e.g. Admin top-up for testing"
            value={topupDesc}
            onChange={(e) => setTopupDesc(e.target.value)}
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
