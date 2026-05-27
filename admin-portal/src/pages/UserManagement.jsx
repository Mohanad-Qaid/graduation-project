import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
  Table, Button, Tag, Space, Card, Input, Select,
  Modal, InputNumber, message, Tooltip, Typography,
} from 'antd';
import {
  SearchOutlined, StopOutlined, CheckCircleOutlined,
  DollarOutlined, UserOutlined, ShopOutlined,
} from '@ant-design/icons';
import { fetchUsers, suspendUser, activateUser, topupUser, reapproveUser } from '../store/slices/usersSlice';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { useErrorToast } from '../hooks/useErrorToast';
import dayjs from 'dayjs';

const { TextArea } = Input;

const statusColors = {
  APPROVED:  'success',
  PENDING:   'warning',
  REJECTED:  'error',
  SUSPENDED: 'default',
};

const UserManagement = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { list, pagination, isLoading, error } = useSelector((state) => state.users);
  useErrorToast(error, 'Failed to load users');

  // Read ?search= URL param (set by SuspiciousTransactions "View in User Management" link)
  const urlSearch = new URLSearchParams(location.search).get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [filters, setFilters] = useState({
    role: null, status: null, page: 1, search: urlSearch,
  });

  // Unified action modal (suspend / reactivate / re-approve)
  const [actionModal, setActionModal] = useState({
    visible: false, type: null, userId: null, userName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top-up modal state (kept separate — needs extra numeric field)
  const [topupModal, setTopupModal] = useState({ visible: false, userId: null, userName: '' });
  const [topupAmount, setTopupAmount] = useState(null);
  const [topupDesc, setTopupDesc] = useState('');
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false);

  useEffect(() => {
    const params = { page: filters.page, limit: 50 };
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    dispatch(fetchUsers(params));
  }, [dispatch, filters]);

  // Debounce search
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

  const openActionModal = (type, record) => {
    setActionModal({
      visible: true,
      type,
      userId: record.id,
      userName: `${record.first_name} ${record.last_name}`,
    });
  };

  const closeActionModal = () => {
    setActionModal({ visible: false, type: null, userId: null, userName: '' });
  };

  const refreshUsers = useCallback(() => {
    const params = { page: filters.page, limit: 50 };
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    dispatch(fetchUsers(params));
  }, [dispatch, filters]);

  const handleActionConfirm = async (comment) => {
    setIsSubmitting(true);
    try {
      if (actionModal.type === 'suspend') {
        await dispatch(suspendUser({ userId: actionModal.userId, reason: comment })).unwrap();
        message.success('User suspended successfully.');
      } else if (actionModal.type === 'reapprove') {
        // Rejected → Approved: use the dedicated reapprove thunk (logs USER_REAPPROVED)
        await dispatch(reapproveUser({ userId: actionModal.userId, reason: comment })).unwrap();
        message.success('User account re-approved.');
      } else {
        // reactivate: Suspended → Approved (logs USER_REACTIVATED)
        await dispatch(activateUser({ userId: actionModal.userId, reason: comment })).unwrap();
        message.success('User account reactivated.');
      }
      closeActionModal();
      refreshUsers();
    } catch (error) {
      message.error(error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Top-up handlers
  const openTopupModal = (record) => {
    setTopupModal({ visible: true, userId: record.id, userName: `${record.first_name} ${record.last_name}` });
    setTopupAmount(null);
    setTopupDesc('');
  };

  const closeTopupModal = () => {
    setTopupModal({ visible: false, userId: null, userName: '' });
  };

  const handleTopupConfirm = async () => {
    if (!topupAmount || topupAmount < 100) {
      message.error('Minimum top-up amount is 100 TRY.');
      return;
    }
    if (!topupDesc || !topupDesc.trim()) {
      message.error('A description is required for admin top-ups.');
      return;
    }
    setIsTopupSubmitting(true);
    try {
      await dispatch(topupUser({
        userId: topupModal.userId,
        amount: topupAmount,
        description: topupDesc.trim(),
      })).unwrap();
      message.success(`Wallet topped up by ${topupAmount} TRY.`);
      closeTopupModal();
      refreshUsers();
    } catch (error) {
      message.error(error || 'Top-up failed. Please try again.');
    } finally {
      setIsTopupSubmitting(false);
    }
  };

  const isSuspend   = actionModal.type === 'suspend';
  const isReapprove = actionModal.type === 'reapprove';

  const columns = [
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag
          icon={role === 'MERCHANT' ? <ShopOutlined /> : <UserOutlined />}
          color={role === 'MERCHANT' ? 'purple' : 'blue'}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{`${record.first_name} ${record.last_name}`}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '—',
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
      title: 'Business',
      key: 'business',
      render: (_, record) => {
        if (record.role !== 'MERCHANT') return <span style={{ color: '#bbb' }}>—</span>;
        return (
          <div>
            {record.business_name && (
              <div style={{ fontWeight: 500, fontSize: 13 }}>{record.business_name}</div>
            )}
            {record.business_category && (
              <Tag color="purple" style={{ marginTop: 2 }}>{record.business_category}</Tag>
            )}
            {!record.business_name && !record.business_category && (
              <span style={{ color: '#bbb' }}>—</span>
            )}
          </div>
        );
      },
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
        <Space wrap>
          {/* Top-Up — all approved users (customers & merchants) */}
          {record.status === 'APPROVED' && (
            <Tooltip title="Add funds to wallet">
              <Button
                size="small"
                icon={<DollarOutlined />}
                onClick={() => openTopupModal(record)}
              >
                Top-Up
              </Button>
            </Tooltip>
          )}

          {/* Suspend — approved users */}
          {record.status === 'APPROVED' && (
            <Tooltip title="Suspend this account">
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => openActionModal('suspend', record)}
              >
                Suspend
              </Button>
            </Tooltip>
          )}

          {/* Reactivate — suspended users */}
          {record.status === 'SUSPENDED' && (
            <Tooltip title="Restore account access">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => openActionModal('reactivate', record)}
              >
                Reactivate
              </Button>
            </Tooltip>
          )}

          {/* Re-Approve — rejected users */}
          {record.status === 'REJECTED' && (
            <Tooltip title="Approve this previously rejected account">
              <Button
                size="small"
                type="default"
                icon={<CheckCircleOutlined />}
                onClick={() => openActionModal('reapprove', record)}
              >
                Re-Approve
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2 className="page-title">User Management</h2>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={handleSearchChange}
            onPressEnter={(e) => handleSearchSubmit(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            placeholder="All Roles"
            value={filters.role}
            onChange={(value) => setFilters((prev) => ({ ...prev, role: value, page: 1 }))}
            allowClear
            style={{ width: 150 }}
          >
            <Select.Option value="CUSTOMER">Customer</Select.Option>
            <Select.Option value="MERCHANT">Merchant</Select.Option>
          </Select>
          <Select
            placeholder="All Statuses"
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
            allowClear
            style={{ width: 160 }}
          >
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="SUSPENDED">Suspended</Select.Option>
          </Select>
        </Space>
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
            onChange: (page) => setFilters({ ...filters, page }),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>

      {/* Suspend / Reactivate / Re-Approve — ConfirmActionModal */}
      <ConfirmActionModal
        open={actionModal.visible}
        title={
          isSuspend   ? `Suspend ${actionModal.userName}` :
          isReapprove ? `Re-Approve ${actionModal.userName}` :
                        `Reactivate ${actionModal.userName}`
        }
        commentRequired={true}
        isDestructive={isSuspend}
        loading={isSubmitting}
        onConfirm={handleActionConfirm}
        onCancel={closeActionModal}
      />

      {/* Top-Up modal — kept as Ant Design Modal for the custom numeric input */}
      <Modal
        open={topupModal.visible}
        title={`Top-Up Wallet — ${topupModal.userName}`}
        onCancel={closeTopupModal}
        onOk={handleTopupConfirm}
        okText="Fund Wallet"
        confirmLoading={isTopupSubmitting}
        okButtonProps={{ disabled: !topupAmount || topupAmount < 100 || !topupDesc?.trim() }}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Amount (TRY)</div>
          <InputNumber
            min={100}
            max={50000}
            step={100}
            value={topupAmount}
            onChange={setTopupAmount}
            style={{ width: '100%' }}
            placeholder="Minimum 100 TRY"
            prefix="₺"
          />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Min: 100 TRY · Max: 50,000 TRY
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Note (required)</div>
          <TextArea
            rows={3}
            placeholder="Reason for top-up (required)…"
            value={topupDesc}
            onChange={(e) => setTopupDesc(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12, marginBottom: 0 }}>
          This action will be recorded in the admin audit log.
        </p>
      </Modal>
    </div>
  );
};

export default UserManagement;
