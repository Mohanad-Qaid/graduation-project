import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Alert } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      // Backend endpoint: GET /admin/logs?page&limit
      const response = await api.get('/admin/logs', { params: { page, limit: 50 } });
      const data = response.data.data;
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0 });
    } catch (error) {
      console.error('Failed to fetch admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action) => {
    if (!action) return 'default';
    if (action.includes('APPROVED')) return 'success';
    if (action.includes('REJECTED') || action.includes('SUSPENDED')) return 'error';
    if (action.includes('TOPUP')) return 'processing';
    return 'default';
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm:ss'),
    },
    {
      title: 'Admin',
      key: 'admin',
      width: 200,
      render: (_, record) => (
        <div>
          {/* Backend: AdminLog has admin_id FK → User; returned as admin association */}
          <div style={{ fontWeight: 500 }}>{record.admin?.full_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.admin?.email || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action_type',   // backend field name
      key: 'action_type',
      width: 200,
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {(action || '').replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Target User',
      key: 'target',
      width: 160,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.targetUser?.full_name || '—'}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.targetUser?.email || ''}</div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',   // backend field name (not "details")
      key: 'description',
      render: (desc) => (
        <span style={{ fontSize: 12, color: '#666' }}>{desc || '—'}</span>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Admin Activity Logs
      </Title>

      <Alert
        message="Read-Only Audit Trail"
        description="All administrative actions are logged here for security and compliance. Logs cannot be modified or deleted."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: (page) => fetchLogs(page),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} log entries`,
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No activity logs found' }}
        />
      </Card>
    </div>
  );
};

export default AdminLogs;
