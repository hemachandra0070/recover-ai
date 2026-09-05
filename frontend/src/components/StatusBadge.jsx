import React from 'react';

const STATUS_MAP = {
  // Payment statuses
  FAILED:     { cls: 'badge-red',    label: 'Failed' },
  RECOVERED:  { cls: 'badge-green',  label: 'Recovered' },
  SUCCESS:    { cls: 'badge-green',  label: 'Success' },
  PENDING:    { cls: 'badge-amber',  label: 'Pending' },

  // Action types
  RETRY_PAYMENT:       { cls: 'badge-blue',   label: 'Retry Payment' },
  SEND_REMINDER:       { cls: 'badge-amber',  label: 'Send Reminder' },
  GENERATE_PAYMENT_LINK: { cls: 'badge-sky',  label: 'Payment Link' },
  ESCALATE:            { cls: 'badge-red',    label: 'Escalate' },
  NO_ACTION:           { cls: 'badge-neutral',label: 'No Action' },

  // Action statuses
  COMPLETED:  { cls: 'badge-green',  label: 'Completed' },
  EXECUTED:   { cls: 'badge-green',  label: 'Executed' },
  INITIATED:  { cls: 'badge-blue',   label: 'Initiated' },
  PENDING_VERIFY: { cls: 'badge-amber', label: 'Verifying' },

  // Policy
  APPROVED:   { cls: 'badge-green',  label: 'Approved' },
  OVERRIDDEN: { cls: 'badge-amber',  label: 'Overridden' },
  BLOCKED:    { cls: 'badge-red',    label: 'Blocked' },
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const key = String(status).toUpperCase();
  const cfg = STATUS_MAP[key] || { cls: 'badge-neutral', label: status };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
};

export default StatusBadge;
