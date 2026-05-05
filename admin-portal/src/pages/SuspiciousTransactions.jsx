import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Card, Typography, Tag, Alert, Tooltip, Button, Badge, message, Select, Row, Col } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { fetchFraudFlags, reviewFraudFlag } from '../store/slices/transactionsSlice';
import dayjs from 'dayjs';

const { Title } = Typography;

const SuspiciousTransactions = () => {
  const dispatch = useDispatch();
  const { fraudFlags, fraudFlagsMeta, isLoading, loadingFlagId } = useSelector((state) => state.transactions);
  const [showReviewed, setShowReviewed] = useState(false);

  const load = (page = 1, reviewed = showReviewed) => {
    dispatch(fetchFraudFlags({ page, reviewed }));
  };

  useEffect(() => {
    load(1, showReviewed);
  }, [dispatch, showReviewed]);

  const handleReview = async (flagId) => {
    try {
      await dispatch(reviewFraudFlag(flagId)).unwrap();
      message.success('Flag marked as reviewed');
    } catch (error) {
      message.error(error);
    }
  };

  const columns = [
    {
      title: 'Transaction Ref',
      key: 'txn',
      render: (_, record) => (
        <code style={{ fontSize: 12 }}>
          {record.transaction?.reference_code || record.transaction_id}
        </code>
      ),
    },
    {
      title: 'Risk Score',
      dataIndex: 'risk_score',
      key: 'risk_score',
      render: (score) => {
        const color = score >= 70 ? 'red' : score >= 40 ? 'orange' : 'green';
        return (
          <Badge
            count={score}
            style={{ backgroundColor: color, boxShadow: 'none', fontSize: 12 }}
          />
        );
      },
    },
    {
      title: 'Reasons',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => {
        // Backend stores semicolon-separated reasons (joined with '; ')
        const parts = (reason || '').split('; ').filter(Boolean);
        return (
          <div>
            {parts.map((r, i) => (
              <Tag key={i} color="red" style={{ marginBottom: 2 }}>
                {r.trim()}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Reviewed',
      dataIndex: 'reviewed',
      key: 'reviewed',
      render: (reviewed) =>
        reviewed ? (
          <Tag color="success">Yes</Tag>
        ) : (
          <Tag color="warning">No</Tag>
        ),
    },
    {
      title: 'Flagged At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) =>
        !record.reviewed ? (
          <Tooltip title="Mark this fraud flag as reviewed">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReview(record.id)}
              loading={loadingFlagId === record.id}
              disabled={loadingFlagId !== null && loadingFlagId !== record.id}
            >
              Mark Reviewed
            </Button>
          </Tooltip>
        ) : (
          <span style={{ color: '#52c41a' }}>✔ Done</span>
        ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <WarningOutlined style={{ color: '#F44336', marginRight: 8 }} />
        Suspicious Activity / Fraud Flags
      </Title>

      <Alert
        message="Fraud Detection"
        description="Transactions are scored 0–100 by Gemini AI (Pro → Flash fallback) or heuristic rules. Flags are created when the score ≥ 50. Heuristic triggers: large amount ≥5000 TRY (+30), velocity >5 txn/hr (+40), unusual hours 00–05 UTC (+30)."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Row style={{ marginBottom: 16 }}>
          <Col>
            <Select
              value={showReviewed}
              onChange={(v) => setShowReviewed(v)}
              style={{ width: 180 }}
            >
              <Select.Option value={false}>Unreviewed Only</Select.Option>
              <Select.Option value={true}>Reviewed Only</Select.Option>
            </Select>
          </Col>
        </Row>

        <Table
          dataSource={fraudFlags}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: fraudFlagsMeta?.page || 1,
            pageSize: fraudFlagsMeta?.limit || 20,
            total: fraudFlagsMeta?.total || 0,
            onChange: (page) => load(page, showReviewed),
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} flags`,
          }}
          locale={{ emptyText: 'No fraud flags found' }}
        />
      </Card>
    </div>
  );
};

export default SuspiciousTransactions;
