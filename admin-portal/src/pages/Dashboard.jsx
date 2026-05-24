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
import dayjs from 'dayjs';

// ── Hardcoded demo data for UI preview ────────────────────────────────────────
const SPARKLINE_REVENUE = [18, 32, 27, 45, 38, 55, 62, 48, 70, 85, 74, 92];
const RECENT_ACTIVITY = [
  { id: 1, type: 'approval', text: 'Ahmed Al-Rashidi registration approved',  time: '2 min ago',  color: '#10B981' },
  { id: 2, type: 'fraud',    text: 'High-risk transaction flagged — TXN-8842', time: '14 min ago', color: '#EF4444' },
  { id: 3, type: 'withdraw', text: 'Withdrawal ₺12,500 pending review',        time: '31 min ago', color: '#F59E0B' },
  { id: 4, type: 'topup',   text: 'Admin top-up ₺5,000 for user #2291',        time: '1 hr ago',  color: '#6200EE' },
  { id: 5, type: 'suspend', text: 'User Sara Yilmaz suspended',                time: '2 hr ago',  color: '#EF4444' },
  { id: 6, type: 'approval', text: 'Spice Garden merchant account approved',   time: '3 hr ago',  color: '#10B981' },
];
const TOP_MERCHANTS = [
  { name: 'Spice Garden',   category: 'Restaurant',  revenue: '₺48,200', avatar: 'S', color: '#6200EE' },
  { name: 'TechMart Store', category: 'Electronics', revenue: '₺31,750', avatar: 'T', color: '#2196F3' },
  { name: 'Fresh Bazar',    category: 'Grocery',     revenue: '₺22,100', avatar: 'F', color: '#10B981' },
  { name: 'Urban Cuts',     category: 'Services',    revenue: '₺14,890', avatar: 'U', color: '#F59E0B' },
];

// ── Mini sparkline rendered with SVG ─────────────────────────────────────────
function Sparkline({ data, color = '#6200EE', height = 40, width = 120 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
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
          {trend !== undefined && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 12, fontWeight: 600,
              color: trend >= 0 ? '#10B981' : '#EF4444',
              background: trend >= 0 ? '#D1FAE5' : '#FEE2E2',
              borderRadius: 20, padding: '2px 8px',
            }}>
              {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(trend)}% vs last week
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
  const { stats } = useSelector((state) => state.dashboard);
  const { admin } = useSelector((state) => state.auth);

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
        <div style={{ position: 'absolute', right: 40,  top: 20,  width: 80,  height: 80,  borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: '0.5px' }}>
            {greet()},
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            {admin ? `${admin.first_name} ${admin.last_name}` : 'Administrator'} 👋
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Tag style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#C4B5FD', borderRadius: 20, padding: '3px 12px' }}>
              {dayjs().format('dddd, DD MMM YYYY')}
            </Tag>
            <Tag
              icon={<Badge status="processing" color="#10B981" />}
              style={{ background: 'rgba(16,185,129,0.15)', border: 'none', color: '#6EE7B7', borderRadius: 20, padding: '3px 12px' }}
            >
              All systems operational
            </Tag>
          </div>
        </div>

        <div style={{ zIndex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Platform Revenue (MTD)
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            ₺{(stats?.totalRevenue ?? 24800).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
            value: (stats?.totalUsers ?? 1248).toLocaleString(),
            sub: '842 customers · 406 merchants',
            icon: <TeamOutlined />,
            color: '#6200EE',
            trend: 8,
            sparkData: [30, 45, 38, 60, 55, 70, 65, 80, 74, 90, 85, 98],
            route: '/users',
          },
          {
            title: 'Transactions',
            value: (stats?.totalTransactions ?? 18340).toLocaleString(),
            sub: 'Total processed to date',
            icon: <TransactionOutlined />,
            color: '#2196F3',
            trend: 14,
            sparkData: [40, 55, 48, 72, 65, 88, 76, 95, 82, 110, 98, 125],
            route: '/transactions',
          },
          {
            title: 'Pending Withdrawals',
            value: (stats?.pendingWithdrawals ?? 7).toLocaleString(),
            sub: 'Awaiting admin approval',
            icon: <BankOutlined />,
            color: '#F59E0B',
            trend: -3,
            sparkData: [5, 8, 6, 12, 9, 7, 11, 8, 10, 6, 9, 7],
            route: '/withdrawal-requests',
          },
          {
            title: 'Fraud Flags',
            value: (stats?.unreviewedFraudFlags ?? 3).toLocaleString(),
            sub: 'Unreviewed suspicious activity',
            icon: <WarningOutlined />,
            color: '#EF4444',
            trend: -18,
            sparkData: [8, 12, 7, 15, 10, 9, 14, 8, 11, 6, 5, 3],
            route: '/suspicious',
          },
        ].map(card => (
          <Col xs={24} sm={12} xl={6} key={card.title}>
            <KpiCard {...card} onClick={() => navigate(card.route)} />
          </Col>
        ))}
      </Row>

      {/* ── Middle Row: Activity + Merchants ───────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>

        {/* Recent Activity Timeline */}
        <Col xs={24} lg={14}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35' }}>Recent Activity</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Live admin action feed</div>
              </div>
              <button
                onClick={() => navigate('/logs')}
                style={{ background: '#F5F3FF', border: 'none', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: '#6200EE', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View All <RightOutlined style={{ fontSize: 10 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT_ACTIVITY.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', gap: 16, paddingBottom: idx < RECENT_ACTIVITY.length - 1 ? 16 : 0, position: 'relative' }}>
                  {/* Timeline connector line */}
                  {idx < RECENT_ACTIVITY.length - 1 && (
                    <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: '#F3F4F6', zIndex: 0 }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${item.color}18`,
                    border: `2px solid ${item.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* Top Merchants */}
        <Col xs={24} lg={10}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35' }}>Top Merchants</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>By transaction volume this month</div>
              </div>
              <FireOutlined style={{ color: '#F59E0B', fontSize: 18 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP_MERCHANTS.map((m, i) => (
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
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Monthly revenue trend</div>
              <Sparkline data={SPARKLINE_REVENUE} color="#6200EE" width={280} height={48} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Now'].map(l => (
                  <span key={l} style={{ fontSize: 10, color: '#D1D5DB' }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Bottom Row: Quick Actions + System Health ───────────────────────── */}
      <Row gutter={[16, 16]}>

        {/* Quick Actions */}
        <Col xs={24} md={12}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35', marginBottom: 4 }}>Quick Actions</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>Jump to the most common workflows</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Review Registrations', icon: <UserAddOutlined />, color: '#6200EE', route: '/pending-registrations', count: 4 },
                { label: 'Approve Withdrawals',  icon: <BankOutlined />,    color: '#F59E0B', route: '/withdrawal-requests',   count: 7 },
                { label: 'Fraud Flags',          icon: <WarningOutlined />, color: '#EF4444', route: '/suspicious',           count: 3 },
                { label: 'User Management',      icon: <TeamOutlined />,    color: '#2196F3', route: '/users',                count: null },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.route)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: `${a.color}0d`, border: `1.5px solid ${a.color}25`,
                    borderRadius: 14, padding: '14px 16px',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${a.color}1a`; e.currentTarget.style.borderColor = `${a.color}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${a.color}0d`; e.currentTarget.style.borderColor = `${a.color}25`; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, fontSize: 16, flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1D35' }}>{a.label}</div>
                    {a.count != null && (
                      <div style={{ fontSize: 11, color: a.color, marginTop: 1 }}>{a.count} pending</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Col>

        {/* System Health */}
        <Col xs={24} md={12}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D35', marginBottom: 4 }}>System Health</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>Current platform status</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'API Server',      status: 'Operational', uptime: '99.98%', color: '#10B981' },
                { label: 'Database',        status: 'Operational', uptime: '99.99%', color: '#10B981' },
                { label: 'Redis Cache',     status: 'Operational', uptime: '100%',   color: '#10B981' },
                { label: 'Stripe Payments', status: 'Operational', uptime: '99.95%', color: '#10B981' },
                { label: 'Email Service',   status: 'Degraded',    uptime: '97.20%', color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{s.label}</div>
                  <Tag color={s.color === '#10B981' ? 'success' : 'warning'} style={{ borderRadius: 20, fontSize: 11 }}>
                    {s.status}
                  </Tag>
                  <div style={{ fontSize: 12, color: '#9CA3AF', width: 48, textAlign: 'right' }}>{s.uptime}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', background: '#F0FDF4', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircleOutlined style={{ color: '#10B981', fontSize: 16 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>4 / 5 services fully operational</div>
                <div style={{ fontSize: 11, color: '#6EE7B7', marginTop: 1 }}>Last checked: {dayjs().format('HH:mm:ss')}</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
