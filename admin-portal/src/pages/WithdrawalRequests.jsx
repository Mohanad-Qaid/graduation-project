import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, Modal, Input, message, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import {
  fetchPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from '../store/slices/withdrawalsSlice';
import dayjs from 'dayjs';

const { TextArea } = Input;

const WithdrawalRequests = () => {
  const dispatch = useDispatch();
  const { pending, isLoading } = useSelector((state) => state.withdrawals);
  const [rejectModal, setRejectModal] = useState({ visible: false, withdrawalId: null });
  const [approveModal, setApproveModal] = useState({ visible: false, withdrawalId: null, amount: null });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    dispatch(fetchPendingWithdrawals());
  }, [dispatch]);

  const handleApprove = async () => {
    try {
      await dispatch(approveWithdrawal(approveModal.withdrawalId)).unwrap();
      message.success('Withdrawal approved successfully');
      setApproveModal({ visible: false, withdrawalId: null, amount: null });
    } catch (error) {
      message.error(error);
    }
  };

  const handleReject = async () => {
    try {
      await dispatch(
        rejectWithdrawal({ withdrawalId: rejectModal.withdrawalId, reason: rejectReason })
      ).unwrap();
      message.success('Withdrawal rejected — balance refunded to merchant');
      setRejectModal({ visible: false, withdrawalId: null });
      setRejectReason('');
    } catch (error) {
      message.error(error);
    }
  };

  const columns = [
    {
      title: 'Merchant',
      key: 'merchant',
      render: (_, record) => (
        <div>
          {/* WithdrawalRequest.merchant association: first_name / last_name from eager-load */}
          <div style={{ fontWeight: 500 }}>
            {record.merchant
              ? `${record.merchant.first_name} ${record.merchant.last_name}`
              : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.merchant?.email || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Amount (Gross)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 600, color: '#6200EE' }}>
          <DollarOutlined /> {Number(amount).toFixed(2)} TRY
        </span>
      ),
    },
    {
      title: 'Fee Collected',
      dataIndex: 'fee_amount',
      key: 'fee_amount',
      render: (fee, record) => (
        <span style={{ color: '#999', fontSize: 13 }}>
          {fee != null
            ? `${Number(fee).toFixed(2)} TRY (${(parseFloat(record.fee_rate || 0) * 100).toFixed(0)}%)`
            : '—'}
        </span>
      ),
    },
    {
      title: 'Net Payout',
      dataIndex: 'net_amount',
      key: 'net_amount',
      render: (net) => (
        <span style={{ fontWeight: 700, color: '#388E3C' }}>
          {net != null ? `${Number(net).toFixed(2)} TRY` : '—'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        record.status === 'PENDING' ? (
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => setApproveModal({ visible: true, withdrawalId: record.id, amount: record.amount })}
            >
              Approve
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={() => setRejectModal({ visible: true, withdrawalId: record.id })}
            >
              Reject
            </Button>
          </Space>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2 className="page-title">Withdrawal Requests</h2>
      </div>

      <Card>
        {pending.length === 0 ? (
          <Empty description="No pending withdrawal requests" />
        ) : (
          <Table
            dataSource={pending}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Approve Confirmation Modal */}
      <Modal
        title={<span style={{ fontWeight: 700 }}>Confirm Approval</span>}
        open={approveModal.visible}
        onOk={handleApprove}
        onCancel={() => setApproveModal({ visible: false, withdrawalId: null, amount: null })}
        okText="Yes, Approve"
        cancelText="Cancel"
        okButtonProps={{ type: 'primary' }}
      >
        <p style={{ marginBottom: 8 }}>
          Approve this withdrawal of{' '}
          <strong style={{ color: '#6200EE' }}>
            {Number(approveModal.amount || 0).toFixed(2)} TRY
          </strong>?
        </p>
        <p style={{ color: '#888', fontSize: 13 }}>
          A <strong>WITHDRAWAL</strong> transaction record will be created and
          the net amount will be sent to the merchant's IBAN.
        </p>
      </Modal>

      <Modal
        title="Reject Withdrawal"
        open={rejectModal.visible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal({ visible: false, withdrawalId: null });
          setRejectReason('');
        }}
        okText="Reject & Refund"
        okButtonProps={{ danger: true }}
      >
        <p>
          Rejecting will <strong>refund the locked amount</strong> back to the merchant's wallet.
        </p>
        <TextArea
          placeholder="Rejection reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default WithdrawalRequests;
