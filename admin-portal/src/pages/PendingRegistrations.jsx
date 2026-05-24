import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, Typography, message, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { fetchPendingUsers, approveUser, rejectUser } from '../store/slices/usersSlice';
import ConfirmActionModal from '../components/ConfirmActionModal';
import dayjs from 'dayjs';

const { Title } = Typography;

const PendingRegistrations = () => {
  const dispatch = useDispatch();
  const { pending, isLoading } = useSelector((state) => state.users);

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
      title: 'Type',
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
      render: (_, record) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Actions',
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
            pagination={{ pageSize: 10 }}
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