import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
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
  WalletOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import { logout } from '../store/slices/authSlice';

const { Header, Sider, Content } = Layout;

// ── Menu structure ────────────────────────────────────────────────────────────
const MENU_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: '/pending-registrations', icon: <UserAddOutlined />, label: 'Pending Approvals' },
      { key: '/withdrawal-requests', icon: <BankOutlined />, label: 'Withdrawals' },
      { key: '/transactions', icon: <TransactionOutlined />, label: 'All Transactions' },
    ],
  },
  {
    label: 'Security',
    items: [
      { key: '/suspicious', icon: <WarningOutlined />, label: 'Suspicious Activity' },
    ],
  },
  {
    label: 'Users',
    items: [
      { key: '/users', icon: <TeamOutlined />, label: 'User Management' },
      { key: '/logs', icon: <FileTextOutlined />, label: 'Admin Logs' },
    ],
  },
];

// Flat list for Ant Menu (needed for selectedKeys logic)
const flatMenuItems = MENU_SECTIONS.flatMap((s) => s.items);

// Current page label for header breadcrumb
function getPageLabel(pathname) {
  const found = flatMenuItems.find((item) => item.key === pathname);
  return found ? { label: found.label, icon: found.icon } : { label: 'Dashboard', icon: <DashboardOutlined /> };
}

// Admin initials for avatar
function initials(admin) {
  const a = (admin?.first_name || '')[0] || '';
  const b = (admin?.last_name || '')[0] || '';
  return (a + b).toUpperCase() || 'A';
}

// ── Component ─────────────────────────────────────────────────────────────────
const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { admin } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'name',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1D35' }}>
            {admin ? `${admin.first_name} ${admin.last_name}` : 'Admin'}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
            {admin?.email || 'Administrator'}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#EF4444' }} />,
      label: <span style={{ color: '#EF4444', fontWeight: 600 }}>Sign Out</span>,
      onClick: handleLogout,
    },
  ];

  const currentPage = getPageLabel(location.pathname);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <Sider
        className="admin-sider"
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
        }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <WalletOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">E-Wallet</span>
            <span className="sidebar-logo-sub">Admin Console</span>
          </div>
        </div>

        {/* Sectioned menu */}
        {MENU_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            <Menu
              className="admin-sider"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={section.items}
              onClick={({ key }) => navigate(key)}
              style={{ background: 'transparent', border: 'none' }}
            />
          </div>
        ))}
      </Sider>

      {/* ── Main area ── */}
      <Layout style={{ marginLeft: 256 }}>
        {/* Header */}
        <Header className="admin-header">
          {/* Breadcrumb */}
          <div className="header-breadcrumb">
            <div className="header-breadcrumb-icon">
              {currentPage.icon}
            </div>
            {currentPage.label}
          </div>

          {/* Right side */}
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="header-admin-chip">
                <Avatar className="header-avatar" size={36}>
                  {initials(admin)}
                </Avatar>
                <span className="header-admin-name">
                  {admin ? admin.first_name : 'Admin'}
                </span>
                <CaretDownOutlined style={{ fontSize: 10, color: '#9CA3AF' }} />
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="admin-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
