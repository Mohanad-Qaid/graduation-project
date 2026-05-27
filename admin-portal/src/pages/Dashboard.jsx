import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Tag, Avatar, Badge } from 'antd';
import {
  TeamOutlined, TransactionOutlined, BankOutlined,
  WarningOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleOutlined, UserAddOutlined,
  RightOutlined, FireOutlined,
} from '@ant-design/icons';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { useErrorToast } from '../hooks/useErrorToast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ── Mini sparkline rendered with SVG ─────────────────────────────────────────
// Guard: requires at least 2 data points with valid numbers to render.
function Sparkline({ data, color = '#6200EE', height = 40, width = 120 }) {
  const validData = (data || []).filter((v) => typeof v === 'number' && !isNaN(v));
  if (validData.length < 2) {
    // Not enough data — show a flat placeholder line instead of NaN SVG errors
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2}
          stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.4" />
      </svg>
    );
  }
  const max = Math.max(...validData);
  const min = Math.min(...validData);
  const range = max - min || 1;
  const pts = validData.map((v, i) => {
    const x = (i / (validData.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const areaPath = `M${pts[0]} ${pts.slice(1).map(p => 'L' + p).join(' ')} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={pts[pts.length - 1].split(',')[0]}
        cy={pts[pts.length - 1].split(',')[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, color, trend, sparkData, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '22px 24px',
        cursor: 'pointer',
        transition: 'transform 0.18s, box-shadow 0.18s',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)';
      }}
    >
      {/* Background decoration circle */}
      <div style={{
        position: 'absolute', right: -24, top: -24,
        width: 100, height: 100, borderRadius: '50%',
        background: `${color}18`,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: color, lineHeight: 1, marginBottom: 6 }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{sub}</div>
          {trend !== undefined && trend !== null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 12, fontWeight: 600,
              color: trend >= 0 ? '#10B981' : '#EF4444',
              background: trend >= 0 ? '#D1FAE5' : '#FEE2E2',
              borderRadius: 20, padding: '2px 8px',
            }}>
              {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(trend)}% vs last month
            </span>
          )}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {sparkData && (
        <div style={{ marginTop: 16 }}>
          <Sparkline data={sparkData} color={color} width={180} height={38} />
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { stats, isLoading, error } = useSelector((state) => state.dashboard);
  const { admin } = useSelector((state) => state.auth);
  useErrorToast(error, 'Failed to load dashboard data');

  // Live data from Redux — all with safe fallbacks
  const volumeData = stats?.volumeBreakdown?.length ? stats.volumeBreakdown : [];
  const volumeTotal = stats?.volumeTotal ?? 0;
  const merchantList = stats?.topMerchants?.length ? stats.topMerchants : [];
  // Only pass sparkline data to Sparkline if we have valid numbers; the component guards against < 2 points
  const sparkline = stats?.revenueSparkline?.length ? stats.revenueSparkline : [];
  const sparkLabels = stats?.revenueSparklineLabels?.length ? stats.revenueSparklineLabels : [];
  // recentActivity: array of AdminLog objects from the backend
  const recentLogs = stats?.recentActivity?.length ? stats.recentActivity : [];
  // Real trend data from backend (% change vs last month)
  const trends = stats?.trends ?? {};

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const greet = () => {
    const h = dayjs().hour();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ maxWidth: 1280 }}>

      {/* ── Hero Welcome Strip ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0A0F2E 0%, #1A2146 50%, #6200EE 100%)',
        borderRadius: 24,
        padding: '28px 36px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 40px rgba(98,0,238,0.25)',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', right: 120, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 40, top: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: '0.5px' }}>
            {greet()},
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            {admin ? `${admin.first_name} ${admin.last_name}` : 'Administrator'}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Tag style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#C4B5FD', borderRadius: 20, padding: '3px 12px' }}>
              {dayjs().format('dddd, DD MMM YYYY')}
            </Tag>
          </div>
        </div>

        <div style={{ zIndex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Platform Revenue (MTD)
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            ₺{(stats?.totalRevenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: '#A78BFA', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <ArrowUpOutlined /> +12.4% from last month
          </div>
        </div>
      </div>

      {/* ── KPI Cards Row ───────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          {
            title: 'Total Users',
            value: (stats?.totalUsers ?? 0).toLocaleString(),
            sub: stats?.customerCount != null
              ? `${stats.customerCount} customers · ${stats.merchantCount} merchants`
              : 'Registered accounts on the platform',
            icon: <TeamOutlined />,
            color: '#6200EE',
            trend: trends.totalUsers,
            sparkData: null,
            route: '/users',
          },
          {
            title: 'Transactions',
            value: (stats?.totalTransactions ?? 0).toLocaleString(),
            sub: 'Payments processed across the platform',
            icon: <TransactionOutlined />,
            color: '#2196F3',
            trend: trends.totalTransactions,
            sparkData: null,
            route: '/transactions',
          },
          {
            title: 'Pending Withdrawals',
            value: (stats?.pendingWithdrawals ?? 0).toLocaleString(),
            sub: 'Awaiting admin approval',
            icon: <BankOutlined />,
            color: '#F59E0B',
            trend: undefined,
            sparkData: null,
            route: '/withdrawal-requests',
          },
          {
            title: 'Fraud Flags',
            value: (stats?.unreviewedFraudFlags ?? 0).toLocaleString(),
            sub: 'Unreviewed suspicious activity',
            icon: <WarningOutlined />,
            color: '#EF4444',
            trend: undefined,
            sparkData: null,
            route: '/suspicious',
          },
        ].map(card => (
          <Col xs={24} sm={12} xl={6} key={card.title}>
            <KpiCard {...card} onClick={() => navigate(card.route)} />
          </Col>
        ))}
      </Row>

      {/* ── Middle Row: Cash Flow + User Demographics ───────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>

        {/* Cash Flow Breakdown */}
        <Col xs={24} md={12}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35', marginBottom: 4 }}>Volume Breakdown</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Last 7 days — total ₺{volumeTotal.toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1D35' }}>₺{volumeTotal.toLocaleString()}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {volumeData.map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1D35' }}>₺{item.amount.toLocaleString()}</div>
                  </div>
                  <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/transactions')}
              style={{ marginTop: 24, width: '100%', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px', cursor: 'pointer', color: '#6B7280', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B7280'; }}
            >
              View All Transactions
            </button>
          </div>
        </Col>

        {/* User Demographics */}
        <Col xs={24} md={12}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35', marginBottom: 4 }}>User Breakdown</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Who is using the platform</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', fontSize: 18 }}>
                <TeamOutlined />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {/* Customers Box */}
              <div style={{ padding: '16px 20px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6200EE' }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Customers</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1D35' }}>{stats?.customerCount ?? 0}</div>
              </div>

              {/* Merchants Box */}
              <div style={{ padding: '16px 20px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Merchants</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1D35' }}>{stats?.merchantCount ?? 0}</div>
              </div>

              {/* Active Today Box */}
              <div style={{ padding: '16px 20px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Active Today</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1D35' }}>0</div>
              </div>

              {/* New This Week Box */}
              <div style={{ padding: '16px 20px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>New This Week</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowUpOutlined style={{ fontSize: 14 }} /> {stats?.newThisWeek ?? 0}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/users')}
              style={{ width: '100%', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px', cursor: 'pointer', color: '#6B7280', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B7280'; }}
            >
              Go to User Management
            </button>
          </div>
        </Col>
      </Row>

      {/* ── Bottom Row: Activity + Merchants ───────────────────────────────── */}
      <Row gutter={[16, 16]}>

        {/* Recent Activity Timeline */}
        <Col xs={24} lg={14}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35' }}>Recent Activity</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Latest admin actions on the platform</div>
              </div>
              <button
                onClick={() => navigate('/logs')}
                style={{ background: '#F5F3FF', border: 'none', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: '#6200EE', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View Audit Logs <RightOutlined style={{ fontSize: 10 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentLogs.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  No recent admin activity to display.
                </div>
              ) : recentLogs.map((item, idx) => {
                // Backend shape: { id, action_type, description, createdAt, admin: { first_name, last_name }, targetUser: {...} }
                const adminName = item.admin ? `${item.admin.first_name} ${item.admin.last_name}` : 'Admin';
                const actionLabel = (item.action_type || '').replace(/_/g, ' ');
                const dotColor = item.action_type?.includes('APPROVED') || item.action_type?.includes('REACTIVATED')
                  ? '#10B981'
                  : item.action_type?.includes('REJECTED') || item.action_type?.includes('SUSPENDED')
                    ? '#EF4444'
                    : '#6200EE';
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 16, paddingBottom: idx < recentLogs.length - 1 ? 16 : 0, position: 'relative' }}>
                    {idx < recentLogs.length - 1 && (
                      <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: '#F3F4F6', zIndex: 0 }} />
                    )}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${dotColor}18`,
                      border: `2px solid ${dotColor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, zIndex: 1,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>
                        {adminName} — {actionLabel}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, lineHeight: 1.4 }}>{item.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        {dayjs(item.createdAt).fromNow()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>

        {/* Top Merchants */}
        <Col xs={24} lg={10}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35' }}>Top Merchants</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Highest revenue earned this month</div>
              </div>
              <FireOutlined style={{ color: '#F59E0B', fontSize: 18 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {merchantList.map((m, i) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#D1D5DB', width: 18 }}>#{i + 1}</div>
                  <Avatar size={40} style={{ background: m.color, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1D35' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{m.category}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#6200EE' }}>{m.revenue}</div>
                </div>
              ))}
            </div>

            {/* Revenue trend mini-chart */}
            <div style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Platform fee revenue — last 6 months</div>
              <Sparkline data={sparkline} color="#6200EE" width={280} height={48} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {sparkLabels.map(l => (
                  <span key={l} style={{ fontSize: 10, color: '#D1D5DB' }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
