import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Typography } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  WalletOutlined,
  SafetyOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { login, clearError } from '../store/slices/authSlice';

const { Title } = Typography;

// ── Feature bullets shown on the left panel ───────────────────────────────────
const FEATURES = [
  { icon: <BarChartOutlined />, label: 'Real-time Revenue Dashboard' },
  { icon: <TeamOutlined />,     label: 'User & Merchant Management'  },
  { icon: <SafetyOutlined />,   label: 'Fraud Detection & Review'    },
  { icon: <WalletOutlined />,   label: 'Withdrawal Approvals'        },
];

const Login = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Show error inline — cleared on next submit attempt
  const [form] = Form.useForm();
  useEffect(() => {
    if (error) {
      form.setFields([{ name: 'password', errors: [error] }]);
      dispatch(clearError());
    }
  }, [error, dispatch, form]);

  const onFinish = (values) => {
    form.setFields([{ name: 'password', errors: [] }]);
    dispatch(login(values));
  };

  return (
    <div className="login-root">
      {/* Decorative blobs */}
      <div className="login-blob-1" />
      <div className="login-blob-2" />

      {/* ── Left panel ── */}
      <div className="login-left">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <WalletOutlined style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div>
            <div className="login-brand-title">E-Wallet</div>
            <div className="login-brand-sub">Admin Console</div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="login-headline">
          Manage with<br /><span>full control.</span>
        </h1>
        <p className="login-subline">
          Secure, real-time oversight of every transaction, user, and
          withdrawal in your platform.
        </p>

        {/* Feature list */}
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(98,0,238,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#C4B5FD', fontSize: 15, flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form card) ── */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Glassmorphic card wrapper */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24,
              padding: '44px 40px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            }}
          >
            <Title level={3} className="login-card-title">Welcome back</Title>
            <span className="login-card-sub">Sign in to access your admin dashboard</span>

            <Form
              form={form}
              name="admin-login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Email Address</span>}
                rules={[
                  { required: true, message: 'Email is required.' },
                  { type: 'email', message: 'Enter a valid email.' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="admin@ewallet.com"
                  autoComplete="email"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    borderRadius: 12,
                    height: 48,
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Password</span>}
                rules={[{ required: true, message: 'Password is required.' }]}
                style={{ marginBottom: 28 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    height: 48,
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  block
                  className="login-submit-btn"
                >
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <div className="login-hint">
              Default credentials: admin@ewallet.com / Admin@123456
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
