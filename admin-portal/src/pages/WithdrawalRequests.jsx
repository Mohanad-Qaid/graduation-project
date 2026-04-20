import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, Typography, Modal, Input, message, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import {
  fetchPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from '../store/slices/withdrawalsSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const WithdrawalRequests = () => {
  const dispatch = useDispatch();
  const { pending, isLoading } = useSelector((state) => state.withdrawals);
  const [rejectModal, setRejectModal] = useState({ visible: false, withdrawalId: null });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    dispatch(fetchPendingWithdrawals());
  }, [dispatch]);

  const handleApprove = async (withdrawalId) => {
    Modal.confirm({
      title: 'Approve Withdrawal',
      content: 'Confirm approval. A WITHDRAWAL transaction record will be created.',
      onOk: async () => {
        try {
          await dispatch(approveWithdrawal(withdrawalId)).unwrap();
          message.success('Withdrawal approved successfully');
        } catch (error) {
          message.error(error);
        }
      },
    });
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
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 600, color: '#6200EE' }}>
          <DollarOutlined /> {Number(amount).toFixed(2)} TRY
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
              onClick={() => handleApprove(record.id)}
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
      <Title level={4} style={{ marginBottom: 24 }}>Withdrawal Requests</Title>

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
