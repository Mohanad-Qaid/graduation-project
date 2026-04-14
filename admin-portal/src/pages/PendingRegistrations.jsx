import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Tag, Space, Card, Typography, Modal, Input, message, Empty } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { fetchPendingUsers, approveUser, rejectUser } from '../store/slices/usersSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const PendingRegistrations = () => {
  const dispatch = useDispatch();
  const { pending, isLoading } = useSelector((state) => state.users);
  const [rejectModal, setRejectModal] = useState({ visible: false, userId: null });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    dispatch(fetchPendingUsers());
  }, [dispatch]);

  const handleApprove = async (userId) => {
    try {
      await dispatch(approveUser(userId)).unwrap();
      message.success('User approved successfully');
    } catch (error) {
      message.error(error);
    }
  };

  const handleReject = async () => {
    try {
      await dispatch(rejectUser({ userId: rejectModal.userId, reason: rejectReason })).unwrap();
      message.success('Registration rejected');
      setRejectModal({ visible: false, userId: null });
      setRejectReason('');
    } catch (error) {
      message.error(error);
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
      dataIndex: 'full_name',   // Backend returns snake_case
      key: 'full_name',
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
            onClick={() => handleApprove(record.id)}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            size="small"
            onClick={() => setRejectModal({ visible: true, userId: record.id })}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Pending Registrations</Title>

      <Card>
        {pending.length === 0 ? (
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

      <Modal
        title="Reject Registration"
        open={rejectModal.visible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal({ visible: false, userId: null });
          setRejectReason('');
        }}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to reject this registration?</p>
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

export default PendingRegistrations;
