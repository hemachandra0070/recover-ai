import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ title = 'No data', description = '', actionText, onAction }) => (
  <div className="empty-state">
    <div className="empty-state-icon">
      <Inbox size={20} color="#9ca3af" strokeWidth={1.5} />
    </div>
    <div className="empty-state-title">{title}</div>
    {description && <p className="empty-state-desc">{description}</p>}
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="btn btn-secondary btn-sm"
        style={{ marginTop: 12 }}
      >
        {actionText}
      </button>
    )}
  </div>
);

export default EmptyState;
