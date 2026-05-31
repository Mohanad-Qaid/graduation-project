import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Typography } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  WalletOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  DisconnectOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { login, clearError } from '../store/slices/authSlice';

const { Title } = Typography;

// ─── Error config: maps error.code → { icon, variant, title } ────────────────
const ERROR_CONFIG = {
  OFFLINE: {
    icon: <DisconnectOutlined />,
    variant: 'warning',
    title: 'No Connection',
  },
  INVALID_CREDENTIALS: {
    icon: <ExclamationCircleOutlined />,
    variant: 'error',
    title: 'Incorrect Credentials',
  },
  RATE_LIMITED: {
    icon: <ClockCircleOutlined />,
    variant: 'warning',
    title: 'Too Many Attempts',
  },
  FORBIDDEN: {
    icon: <CloseCircleOutlined />,
    variant: 'error',
    title: 'Access Denied',
  },
  VALIDATION: {
    icon: <WarningOutlined />,
    variant: 'warning',
    title: 'Invalid Input',
  },
  SERVER_ERROR: {
    icon: <ToolOutlined />,
    variant: 'warning',
    title: 'Server Error',
  },
  UNKNOWN: {
    icon: <ExclamationCircleOutlined />,
    variant: 'error',
    title: 'Login Failed',
  },
};

// ─── Inline error alert banner ────────────────────────────────────────────────
function LoginAlert({ code, message }) {
  if (!message) return null;
  const cfg = ERROR_CONFIG[code] ?? ERROR_CONFIG.UNKNOWN;
  const isWarning = cfg.variant === 'warning';

  return (
    <div
      className={`login-alert login-alert--${cfg.variant}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="login-alert__icon">{cfg.icon}</span>
      <div className="login-alert__body">
        <div className="login-alert__title">{cfg.title}</div>
        <div className="login-alert__message">{message}</div>
      </div>
    </div>
  );
}

// ─── Attempt counter warning (admin portal only) ──────────────────────────────
// count 1-2 → show remaining attempts left
// count >= 3 → show 1-hour lockout message (the backend sets the lock on the
//              3rd failure and returns 429 on the *next* attempt; we show the
//              lockout immediately from the frontend so the user isn't confused)
function AttemptsWarning({ count }) {
  if (count < 3) return null;

  return (
    <div className="login-alert login-alert--warning" role="alert">
      <span className="login-alert__icon"><ClockCircleOutlined /></span>
      <div className="login-alert__body">
        <div className="login-alert__title">Too Many Attempts</div>
        <div className="login-alert__message">Too many failed attempts. Please try again in an hour.</div>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  // Local failed-attempt counter (resets on successful login or page refresh)
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // When an error arrives, increment attempt count
  useEffect(() => {
    if (!error) return;
    if (error.code === 'INVALID_CREDENTIALS' || error.code === 'VALIDATION') {
      setFailedAttempts((n) => n + 1);
    }
  }, [error]);


  const onFinish = useCallback(
    (values) => {
      // Clear previous errors on a new attempt
      dispatch(clearError());
      dispatch(login(values));
    },
    [dispatch]
  );

  // Lock form when access explicitly denied (wrong role / suspended) OR after 3 local failed attempts
  const isLocked = error?.code === 'FORBIDDEN' || failedAttempts >= 3;

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

            {/* ── Error / status banners ── */}
            {/* When locally locked (3 fails), AttemptsWarning shows the lockout — suppress the
                redundant INVALID_CREDENTIALS banner that still comes from the 3rd failed request */}
            <AttemptsWarning count={failedAttempts} />
            {error && failedAttempts < 3 && <LoginAlert code={error.code} message={error.message} />}


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
                  { type: 'email', message: 'Enter a valid email address.' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={isLocked}
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
                rules={[
                  { required: true, message: 'Password is required.' },
                  { min: 8, message: 'Admin password must be at least 8 characters.' },
                ]}
                style={{ marginBottom: 28 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLocked}
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

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  disabled={isLocked}
                  block
                  className="login-submit-btn"
                >
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            {/* Security footnote */}
            <p className="login-hint">
              Secure access to the E-Wallet management platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
