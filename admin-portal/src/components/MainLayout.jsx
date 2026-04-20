import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TransactionOutlined,
  BankOutlined,
  WarningOutlined,
  TeamOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { logout } from '../store/slices/authSlice';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { admin } = useSelector((state) => state.auth);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/pending-registrations',
      icon: <UserAddOutlined />,
      label: 'Pending Registrations',
    },
    {
      key: '/withdrawal-requests',
      icon: <BankOutlined />,
      label: 'Withdrawal Requests',
    },
    {
      key: '/transactions',
      icon: <TransactionOutlined />,
      label: 'All Transactions',
    },
    {
      key: '/suspicious',
      icon: <WarningOutlined />,
      label: 'Suspicious Activity',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: 'Admin Logs',
    },
  ];

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: admin ? `${admin.first_name} ${admin.last_name}` : 'Admin',   // first_name / last_name from backend
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="logo">E-Wallet Admin</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: 250 }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6200EE' }} />
              {/* first_name / last_name from backend User model */}
              <span>{admin ? `${admin.first_name} ${admin.last_name}` : 'Admin'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
