import React, { useState } from 'react';
import { Modal, Button, Input } from 'antd';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

const { TextArea } = Input;

/**
 * Reusable confirmation modal for all sensitive admin actions.
 *
 * Props:
 *  open            – boolean: visibility
 *  title           – string: modal header (e.g. "Confirm Rejection")
 *  commentRequired – boolean: if true the textarea is mandatory and Confirm is disabled until filled
 *  isDestructive   – boolean: if true the Confirm button is red
 *  loading         – boolean: shows spinner on Confirm button
 *  onConfirm(comment) – called with the textarea value when admin clicks Confirm
 *  onCancel        – called when admin clicks Cancel or closes
 *  extraContent    – optional ReactNode rendered above the textarea (e.g. amount context block)
 */
const ConfirmActionModal = ({
  open,
  title = 'Confirm Action',
  commentRequired = false,
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
  extraContent,
}) => {
  const [comment, setComment] = useState('');
  const { admin } = useSelector((state) => state.auth);

  const handleConfirm = () => {
    onConfirm(comment.trim());
  };

  const handleCancel = () => {
    setComment('');
    onCancel();
  };

  const isConfirmDisabled = commentRequired && comment.trim().length === 0;
  const placeholder = commentRequired
    ? 'Reason is required for this action…'
    : 'Add a comment (optional)…';

  const auditName = admin
    ? `${admin.first_name} ${admin.last_name}`
    : 'Administrator';
  const auditTimestamp = dayjs().format('DD MMM YYYY, HH:mm');

  return (
    <Modal
      open={open}
      title={<span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={isDestructive}
          disabled={isConfirmDisabled}
          loading={loading}
          onClick={handleConfirm}
        >
          Confirm
        </Button>,
      ]}
      maskClosable={!loading}
      closable={!loading}
      destroyOnHidden
    >
      {/* Optional context slot (e.g. withdrawal amount) */}
      {extraContent && (
        <div style={{ marginBottom: 16 }}>{extraContent}</div>
      )}

      {/* Comment textarea */}
      <TextArea
        rows={4}
        placeholder={placeholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ resize: 'none', borderRadius: 10 }}
      />

      {/* Audit footer — plain text, no input boxes */}
      <p style={{
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 12,
        marginBottom: 0,
        lineHeight: 1.6,
      }}>
        Action will be recorded as: <strong>{auditName}</strong> at {auditTimestamp}
      </p>
    </Modal>
  );
};

export default ConfirmActionModal;
