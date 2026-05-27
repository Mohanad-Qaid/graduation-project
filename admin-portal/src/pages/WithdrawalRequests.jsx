import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, message, Empty, Typography, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, DollarOutlined, BankOutlined } from '@ant-design/icons';
import {
  fetchPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from '../store/slices/withdrawalsSlice';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { useErrorToast } from '../hooks/useErrorToast';
import dayjs from 'dayjs';

const { Text } = Typography;

// Fee rate is a known platform constant (5%) — stored as a config, not in the DB row
const FEE_RATE_DISPLAY = '5.0%';

const WithdrawalRequests = () => {
  const dispatch = useDispatch();
  const { pending, pagination, isLoading, error } = useSelector((state) => state.withdrawals);
  const [currentPage, setCurrentPage] = useState(1);
  const reload = (page = currentPage) => dispatch(fetchPendingWithdrawals(page));
  useErrorToast(error, 'Failed to load withdrawal requests');

  const [modal, setModal] = useState({
    visible: false,
    type: null,       // 'approve' | 'reject'
    withdrawalId: null,
    amount: null,
    netAmount: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchPendingWithdrawals(currentPage));
  }, [dispatch, currentPage]);

  const openModal = (type, record) => {
    setModal({
      visible: true,
      type,
      withdrawalId: record.id,
      amount: record.amount,
      netAmount: record.net_amount,
    });
  };

  const closeModal = () => {
    setModal({ visible: false, type: null, withdrawalId: null, amount: null, netAmount: null });
  };

  const handleConfirm = async (comment) => {
    setIsSubmitting(true);
    try {
      if (modal.type === 'approve') {
        await dispatch(approveWithdrawal(modal.withdrawalId)).unwrap();
        message.success("Withdrawal approved — net amount will be sent to the merchant's IBAN.");
      } else {
        await dispatch(
          rejectWithdrawal({ withdrawalId: modal.withdrawalId, reason: comment })
        ).unwrap();
        message.success('Withdrawal rejected — balance refunded to merchant.');
      }
      closeModal();
    } catch (error) {
      message.error(error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Merchant',
      key: 'merchant',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.merchant
              ? `${record.merchant.first_name} ${record.merchant.last_name}`
              : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.merchant?.email || '—'}</div>
          {record.merchant?.business_name && (
            <div style={{ fontSize: 11, color: '#bbb' }}>{record.merchant.business_name}</div>
          )}
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
      render: (fee) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {fee != null ? `${Number(fee).toFixed(2)} TRY (${FEE_RATE_DISPLAY})` : '—'}
        </Text>
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
      title: 'Destination Bank',
      key: 'bank',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BankOutlined style={{ color: '#6B7280', fontSize: 12 }} />
            <span style={{ fontWeight: 500, fontSize: 13 }}>
              {record.bank_name || '—'}
            </span>
          </div>
          {record.bank_account_name && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {record.bank_account_name}
            </div>
          )}
          {record.bank_account && (
            <Tooltip title="Full IBAN — copy for manual transfer">
              <code style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.5px', cursor: 'default', display: 'block', marginTop: 2 }}>
                {record.bank_account}
              </code>
            </Tooltip>
          )}
        </div>
      ),
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
      render: (_, record) =>
        record.status === 'PENDING' ? (
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => openModal('approve', record)}
            >
              Approve
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={() => openModal('reject', record)}
            >
              Reject
            </Button>
          </Space>
        ) : null,
    },
  ];

  const isReject = modal.type === 'reject';

  const approveExtraContent = modal.type === 'approve' && modal.amount != null && (
    <div style={{ background: '#f9f7ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Gross amount</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#6200EE' }}>
        {Number(modal.amount).toFixed(2)} TRY
      </div>
      {modal.netAmount != null && (
        <>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 2 }}>Net payout to merchant</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#388E3C' }}>
            {Number(modal.netAmount).toFixed(2)} TRY
          </div>
        </>
      )}
      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
        Platform fee: {FEE_RATE_DISPLAY}. The net amount will be transferred to the merchant's IBAN.
      </p>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2 className="page-title">Withdrawal Requests</h2>
      </div>

      <Card>
        {(pending ?? []).length === 0 ? (
          <Empty description="No pending withdrawal requests" />
        ) : (
          <Table
            dataSource={pending}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: currentPage,
              pageSize: 50,
              total: pagination?.total ?? pending.length,
              showTotal: (total) => `${total} pending requests`,
              onChange: (page) => setCurrentPage(page),
            }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      <ConfirmActionModal
        open={modal.visible}
        title={isReject ? 'Reject Withdrawal' : 'Approve Withdrawal'}
        commentRequired={isReject}
        isDestructive={isReject}
        loading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={closeModal}
        extraContent={approveExtraContent}
      />
    </div>
  );
};

export default WithdrawalRequests;
