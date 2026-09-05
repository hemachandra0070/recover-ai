import React from 'react';

const getRisk = (score) => {
  if (score >= 80) return { cls: 'badge-red',   label: `${score}`, title: 'High' };
  if (score >= 50) return { cls: 'badge-amber', label: `${score}`, title: 'Medium' };
  return              { cls: 'badge-green', label: `${score}`, title: 'Low' };
};

const RiskBadge = ({ score, showLabel = true }) => {
  if (score == null) return null;
  const { cls, label, title } = getRisk(Number(score));
  return (
    <span className={`risk-pill ${cls}`} title={`Risk: ${title}`}>
      {label}
      {showLabel && <span style={{ opacity: 0.7, marginLeft: 2 }}>risk</span>}
    </span>
  );
};

export default RiskBadge;
