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


/*async function getPendingUsers() {
    return User.findAll({
        where: { status: 'PENDING' },
        attributes: ['id', 'first_name', 'last_name', 'business_name', 'email', 'phone', 'role', 'status', 'createdAt'],
        order: [['createdAt', 'ASC']],
    });
}
////////////
async function getPendingUsers(req, res, next) {
    try {
        const users = await adminService.getPendingUsers();
        return sendSuccess(res, { message: 'Pending users retrieved.', data: users });
    } catch (err) {
        next(err);
    }
}

/////////////
router.get('/users/pending', controller.getPendingUsers);
///////
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    pending: [],
    pagination: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.users;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchPendingUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPendingUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pending = action.payload;
      })
      .addCase(fetchPendingUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(approveUser.fulfilled, (state, action) => {
        state.pending = state.pending.filter((u) => u.id !== action.payload);
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'APPROVED';
      })
      .addCase(rejectUser.fulfilled, (state, action) => {
        state.pending = state.pending.filter((u) => u.id !== action.payload);
      })
      .addCase(suspendUser.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'SUSPENDED';
      })
      .addCase(activateUser.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'APPROVED';
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;

///////////
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


      ////
      this code part from different files 
      as there is an error and the pending user are not showing 
      if i delete the line "pending.length === 0 ? (
          <Empty description="No pending registrations" />
        )"
Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at WithdrawalRequests (WithdrawalRequests.jsx:127:18)
    at renderWithHooks (chunk-NUMECXU6.js?v=69537d3d:11548:26)
    at updateFunctionComponent (chunk-NUMECXU6.js?v=69537d3d:14582:28)
    at beginWork (chunk-NUMECXU6.js?v=69537d3d:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-NUMECXU6.js?v=69537d3d:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-NUMECXU6.js?v=69537d3d:3699:24)
    at invokeGuardedCallback (chunk-NUMECXU6.js?v=69537d3d:3733:39)
    at beginWork$1 (chunk-NUMECXU6.js?v=69537d3d:19765:15)
    at performUnitOfWork (chunk-NUMECXU6.js?v=69537d3d:19198:20)
    at workLoopSync (chunk-NUMECXU6.js?v=69537d3d:19137:13)
chunk-NUMECXU6.js?v=69537d3d:14032 The above error occurred in the <WithdrawalRequests> component:

    at WithdrawalRequests (http://localhost:5173/src/pages/WithdrawalRequests.jsx:32:20)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:4131:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:4601:5)
    at main
    at http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:66246:16
    at Content
    at div
    at http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:66265:16
    at Layout
    at div
    at http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:66265:16
    at Layout
    at MainLayout (http://localhost:5173/src/components/MainLayout.jsx:35:23)
    at ProtectedRoute (http://localhost:5173/src/App.jsx?t=1776260971055:32:27)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:4131:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:4601:5)
    at App (http://localhost:5173/src/App.jsx?t=1776260971055:61:20)
    at MotionWrapper (http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:6251:32)
    at ProviderChildren (http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:6359:5)
    at ConfigProvider (http://localhost:5173/node_modules/.vite/deps/antd.js?v=69537d3d:6650:27)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:4544:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=69537d3d:5290:5)
    at Provider (http://localhost:5173/node_modules/.vite/deps/react-redux.js?v=69537d3d:923:11)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.

        same goes in withdrawal requests screen with the same line problem 

        the error goes but then the screen show 0 user even tho there are pending  users 
        another question is that the link is http://localhost:5173/pending-registrations 
        how it becomes like that ? i found only user/pending 
      */ 