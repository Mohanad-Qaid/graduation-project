import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Tag, Tooltip, Button, Badge, message,
  Select, Drawer, Descriptions, Divider, Space, Typography,
} from 'antd';
import {
  WarningOutlined, CheckCircleOutlined, UserOutlined,
  CopyOutlined, LinkOutlined, StopOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useErrorToast } from '../hooks/useErrorToast';
import { fetchFraudFlags, reviewFraudFlag } from '../store/slices/transactionsSlice';
import { suspendUser } from '../store/slices/usersSlice';
import ConfirmActionModal from '../components/ConfirmActionModal';
import dayjs from 'dayjs';

const SuspiciousTransactions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { fraudFlags, fraudFlagsMeta, isLoading, loadingFlagId, error } = useSelector(
    (state) => state.transactions
  );
  const reload = (reviewed = showReviewed) => load(fraudFlagsMeta?.page || 1, reviewed);
  useErrorToast(error, 'Failed to load suspicious activity');

  const [showReviewed, setShowReviewed] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState(null);

  // Suspend modal state
  const [suspendModal, setSuspendModal] = useState({ visible: false, userId: null });
  const [isSuspending, setIsSuspending] = useState(false);

  const load = (page = 1, reviewed = showReviewed) => {
    dispatch(fetchFraudFlags({ page, reviewed }));
  };

  useEffect(() => {
    load(1, showReviewed);
  }, [dispatch, showReviewed]);

  const openDrawer = (record) => {
    setSelectedFlag(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedFlag(null), 300);
  };

  const handleReview = async (flagId) => {
    try {
      await dispatch(reviewFraudFlag(flagId)).unwrap();
      message.success('Flag marked as reviewed.');
      closeDrawer();
    } catch (error) {
      message.error(error || 'Failed to mark flag as reviewed.');
    }
  };

  const handleSuspendConfirm = async (reason) => {
    setIsSuspending(true);
    try {
      await dispatch(suspendUser({ userId: suspendModal.userId, reason })).unwrap();
      message.success('User suspended successfully.');
      setSuspendModal({ visible: false, userId: null });
      closeDrawer();
      load(fraudFlagsMeta?.page || 1, showReviewed);
    } catch (error) {
      message.error(error || 'Failed to suspend user. Please try again.');
    } finally {
      setIsSuspending(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => message.success('Reference code copied to clipboard.'))
      .catch(() => message.error('Failed to copy. Please copy manually.'));
  };

  const goToTransactions = (refCode) => {
    navigate(`/transactions?ref=${encodeURIComponent(refCode)}`);
    closeDrawer();
  };

  const goToUser = (email) => {
    navigate(`/users?search=${encodeURIComponent(email)}`);
    closeDrawer();
  };

  const columns = [
    {
      title: 'Transaction Ref',
      key: 'txn',
      render: (_, record) => (
        <Tooltip title="Click to view details">
          <Typography.Link
            onClick={() => openDrawer(record)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          >
            {record.transaction?.reference_code || record.transaction_id}
          </Typography.Link>
        </Tooltip>
      ),
    },
    {
      title: 'Risk Score',
      dataIndex: 'risk_score',
      key: 'risk_score',
      render: (score) => {
        const color = score >= 70 ? 'red' : score >= 40 ? 'orange' : 'green';
        return (
          <Badge
            count={score}
            style={{ backgroundColor: color, boxShadow: 'none', fontSize: 12 }}
          />
        );
      },
    },
    {
      title: 'Reasons',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => {
        const parts = (reason || '').split('; ').filter(Boolean);
        return (
          <div>
            {parts.map((r, i) => (
              <Tag key={i} color="red" style={{ marginBottom: 2 }}>
                {r.trim()}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Suspect',
      key: 'sender',
      render: (_, record) => {
        const txnType = record.transaction?.transaction_type;
        const senderOwner = record.transaction?.senderWallet?.owner;
        const receiverOwner = record.transaction?.receiverWallet?.owner;
        // For TOPUP, the suspect is the receiver (the customer), not Stripe
        const suspect = txnType === 'TOPUP' ? receiverOwner : senderOwner;
        if (!suspect) return <span style={{ color: '#bbb' }}>—</span>;
        return (
          <Tooltip title="View in User Management">
            <Typography.Link onClick={() => goToUser(suspect.email)}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                {`${suspect.first_name} ${suspect.last_name}`}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>{suspect.email}</div>
              {txnType === 'TOPUP' && <Tag color="purple" style={{ marginTop: 2, fontSize: 10 }}>RECEIVER</Tag>}
            </Typography.Link>
          </Tooltip>
        );
      },
    },
    {
      title: 'Flagged At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) =>
        !record.reviewed ? (
          <Tooltip title="Open flag details">
            <Button
              size="small"
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => openDrawer(record)}
              loading={loadingFlagId === record.id}
              disabled={loadingFlagId !== null && loadingFlagId !== record.id}
            >
              View Details
            </Button>
          </Tooltip>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>Reviewed</Tag>
        ),
    },
  ];

  const txn = selectedFlag?.transaction;
  const sender = txn?.senderWallet?.owner;
  const receiver = txn?.receiverWallet?.owner;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2 className="page-title">Suspicious Activity</h2>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Select
            value={showReviewed}
            onChange={(v) => setShowReviewed(v)}
            style={{ width: 180 }}
          >
            <Select.Option value={false}>Unreviewed</Select.Option>
            <Select.Option value={true}>Reviewed</Select.Option>
          </Select>
        </div>

        <Table
          dataSource={fraudFlags}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: fraudFlagsMeta?.page || 1,
            pageSize: fraudFlagsMeta?.limit || 50,
            total: fraudFlagsMeta?.total || 0,
            onChange: (page) => load(page, showReviewed),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} flags`,
          }}
          locale={{ emptyText: 'No fraud flags found' }}
        />
      </Card>

      {/* Fraud Flag Detail Drawer */}
      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#ef4444' }} />
            Fraud Flag Details
          </span>
        }
        placement="right"
        width={440}
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          selectedFlag && !selectedFlag.reviewed ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {/* For TOPUP, the suspect is the receiver; for other types it's the sender */}
              {txn?.transaction_type === 'TOPUP' ? (
                receiver && (
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => setSuspendModal({ visible: true, userId: receiver.id })}
                  >
                    Suspend Receiver
                  </Button>
                )
              ) : (
                sender && (
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => setSuspendModal({ visible: true, userId: sender.id })}
                  >
                    Suspend Sender
                  </Button>
                )
              )}
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={loadingFlagId === selectedFlag?.id}
                onClick={() => handleReview(selectedFlag.id)}
              >
                Mark Reviewed
              </Button>
            </div>
          ) : null
        }
      >
        {selectedFlag && txn && (
          <>
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#dc2626', marginBottom: 6 }}>
                Risk Score: {selectedFlag.risk_score}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(selectedFlag.reason || '').split('; ').filter(Boolean).map((r, i) => (
                  <Tag key={i} color="red">{r.trim()}</Tag>
                ))}
              </div>
            </div>

            <Divider orientation="left" plain style={{ fontSize: 12, color: '#9ca3af' }}>Transaction</Divider>
            <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
              <Descriptions.Item label="Reference">
                <Space>
                  <code style={{ fontSize: 12 }}>{txn.reference_code}</code>
                  <Tooltip title="Copy reference">
                    <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(txn.reference_code)} />
                  </Tooltip>
                  <Tooltip title="View in Transactions">
                    <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => goToTransactions(txn.reference_code)} />
                  </Tooltip>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <strong style={{ color: '#6200EE' }}>₺{Number(txn.amount).toFixed(2)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{txn.transaction_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={txn.status === 'COMPLETED' ? 'success' : 'warning'}>{txn.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(txn.createdAt).format('DD MMM YYYY, HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain style={{ fontSize: 12, color: '#9ca3af' }}>Sender (From)</Divider>
            {sender ? (
              <div>
                <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="Name"><strong>{`${sender.first_name} ${sender.last_name}`}</strong></Descriptions.Item>
                  <Descriptions.Item label="Email">{sender.email}</Descriptions.Item>
                  <Descriptions.Item label="Role">
                    <Tag color={sender.role === 'MERCHANT' ? 'purple' : 'blue'}>{sender.role}</Tag>
                  </Descriptions.Item>
                </Descriptions>
                <Button type="link" size="small" icon={<UserOutlined />} style={{ padding: 0, marginTop: 4 }} onClick={() => goToUser(sender.email)}>
                  View in User Management
                </Button>
              </div>
            ) : (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 600, color: '#0369a1', fontSize: 13 }}> External Top-Up via Stripe</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>funds came from an external Stripe payment.</div>
              </div>
            )}

            <Divider orientation="left" plain style={{ fontSize: 12, color: '#9ca3af' }}>Receiver (To)</Divider>
            {receiver ? (
              <div>
                <Descriptions column={1} size="small" style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="Name"><strong>{`${receiver.first_name} ${receiver.last_name}`}</strong></Descriptions.Item>
                  <Descriptions.Item label="Email">{receiver.email}</Descriptions.Item>
                  <Descriptions.Item label="Role">
                    <Tag color={receiver.role === 'MERCHANT' ? 'purple' : 'blue'}>{receiver.role}</Tag>
                  </Descriptions.Item>
                </Descriptions>
                <Button type="link" size="small" icon={<UserOutlined />} style={{ padding: 0, marginTop: 4 }} onClick={() => goToUser(receiver.email)}>
                  View in User Management
                </Button>
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No receiver data (withdrawal).</p>
            )}

            {selectedFlag.reviewed && (
              <>
                <Divider />
                <p style={{ color: '#52c41a', fontWeight: 600 }}>✔ This flag has been reviewed.</p>
              </>
            )}
          </>
        )}
      </Drawer>

      <ConfirmActionModal
        open={suspendModal.visible}
        title="Suspend Sender"
        commentRequired
        isDestructive
        loading={isSuspending}
        onConfirm={handleSuspendConfirm}
        onCancel={() => setSuspendModal({ visible: false, userId: null })}
      />
    </div>
  );
};

export default SuspiciousTransactions;
