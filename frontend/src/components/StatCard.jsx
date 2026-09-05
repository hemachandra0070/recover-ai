import React from 'react';

const VARIANT_STYLES = {
  default: { iconBg: '#eff6ff', iconColor: '#2563eb' },
  danger:  { iconBg: '#fef2f2', iconColor: '#dc2626' },
  success: { iconBg: '#f0fdf4', iconColor: '#16a34a' },
  warning: { iconBg: '#fffbeb', iconColor: '#d97706' },
  neutral: { iconBg: '#f8fafc', iconColor: '#6b7280' },
};

const StatCard = ({ title, value, meta, icon: Icon, variant = 'default', trend }) => {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{title}</span>
        {Icon && (
          <div className="stat-icon" style={{ background: style.iconBg }}>
            <Icon size={16} color={style.iconColor} strokeWidth={2} />
          </div>
        )}
      </div>

      <div>
        <div className="stat-value">{value}</div>
        {meta && <div className="stat-meta" style={{ marginTop: 4 }}>{meta}</div>}
      </div>
    </div>
  );
};

export default StatCard;
