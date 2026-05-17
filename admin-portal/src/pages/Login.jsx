import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Typography } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { login, clearError } from '../store/slices/authSlice';

const { Title } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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

      {/* ── Centered form card ── */}
      <div className="login-center">
        <div className="login-card-wrapper">
          {/* Brand mark */}
          <div className="login-brand-center">
            <div className="login-brand-icon">
              <WalletOutlined style={{ color: '#fff', fontSize: 26 }} />
            </div>
            <div>
              <div className="login-brand-title">E-Wallet</div>
              <div className="login-brand-sub">Admin Console</div>
            </div>
          </div>

          {/* Glassmorphic card */}
          <div className="login-glass-card">
            <Title level={2} className="login-card-title">Welcome back</Title>
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
                label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>Email Address</span>}
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
                    height: 54,
                    fontSize: 15,
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>Password</span>}
                rules={[{ required: true, message: 'Password is required.' }]}
                style={{ marginBottom: 32 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    height: 54,
                    fontSize: 15,
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
