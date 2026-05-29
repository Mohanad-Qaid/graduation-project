import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, Typography, message, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { fetchPendingUsers, approveUser, rejectUser } from '../store/slices/usersSlice';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { useErrorToast } from '../hooks/useErrorToast';
import dayjs from 'dayjs';

const { Title } = Typography;

const PendingRegistrations = () => {
  const dispatch = useDispatch();
  const { pending, isLoading, error } = useSelector((state) => state.users);
  const reload = () => dispatch(fetchPendingUsers());
  useErrorToast(error, 'Failed to load pending registrations');


  // Single unified modal state: { visible, type ('approve'|'reject'), userId }
  const [modal, setModal] = useState({ visible: false, type: null, userId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchPendingUsers());
  }, [dispatch]);

  const openModal = (type, userId) => {
    setModal({ visible: true, type, userId });
  };

  const closeModal = () => {
    setModal({ visible: false, type: null, userId: null });
  };

  const handleConfirm = async (comment) => {
    setIsSubmitting(true);
    try {
      if (modal.type === 'approve') {
        await dispatch(approveUser(modal.userId)).unwrap();
        message.success('Registration approved successfully.');
      } else {
        await dispatch(rejectUser({ userId: modal.userId, reason: comment })).unwrap();
        message.success('Registration rejected.');
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
      title: 'ROLE',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => (
        <Tag
          icon={role === 'MERCHANT' ? <ShopOutlined /> : <UserOutlined />}
          color={role === 'MERCHANT' ? 'purple' : 'blue'}
          style={{ fontWeight: 600, letterSpacing: 0.5 }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: 'NAME',
      key: 'name',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#1a1a2e' }}>
            {record.first_name} {record.last_name}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: 'PHONE',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'BUSINESS',
      key: 'business',
      render: (_, record) => {
        if (!record.business_name && !record.business_category) {
          return <span style={{ color: '#bbb' }}>—</span>;
        }
        return (
          <div>
            {record.business_name && (
              <div style={{ fontWeight: 500, color: '#1a1a2e' }}>
                {record.business_name}
              </div>
            )}
            {record.business_category && (
              <Tag
                color="purple"
                style={{ marginTop: 4, fontWeight: 600, letterSpacing: 0.5, fontSize: 11 }}
              >
                {record.business_category.toUpperCase()}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'LOCATION',
      key: 'location',
      render: (_, record) => {
        const city = record.registration_city;
        const country = record.registration_country;
        if (!city && !country) return <span style={{ color: '#bbb' }}>—</span>;
        return <span>{[city, country].filter(Boolean).join(', ')}</span>;
      },
    },
    {
      title: 'JOINED',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => openModal('approve', record.id)}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            size="small"
            onClick={() => openModal('reject', record.id)}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];


  const isReject = modal.type === 'reject';

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Pending Registrations</Title>

      <Card>
        {(pending ?? []).length === 0 ? (
          <Empty description="No pending registrations" />
        ) : (
          <Table
            dataSource={pending}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total) => `${total} pending requests`
            }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>

      <ConfirmActionModal
        open={modal.visible}
        title={isReject ? 'Confirm Rejection' : 'Approve Registration'}
        commentRequired={isReject}
        isDestructive={isReject}
        loading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={closeModal}
      />
    </div>
  );
};

export default PendingRegistrations;