import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Activity,
  ShieldCheck,
  Cpu,
  Circle
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/agent', label: 'Agent Logs', icon: Activity },
];

const Sidebar = () => {
  return (
    <aside className="sidebar-wrapper">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Cpu size={16} color="#ffffff" strokeWidth={2} />
        </div>
        <div>
          <div className="brand-name">RecoverAI</div>
          <div className="brand-tagline">Payment Recovery</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="section-label" style={{ marginTop: 8 }}>Operations</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </NavLink>
        ))}

        <div className="section-label">System</div>

        {/* Policy status */}
        <div style={{
          margin: '4px 0',
          padding: '10px 10px',
          borderRadius: '8px',
          background: 'rgba(34,197,94,0.07)',
          border: '1px solid rgba(34,197,94,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <ShieldCheck size={13} color="#22c55e" strokeWidth={2.5} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              Policy Engine
            </span>
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>
            Authoritative · Fraud limits enforced
          </p>
        </div>

        {/* AI status */}
        <div style={{
          margin: '6px 0 0',
          padding: '10px 10px',
          borderRadius: '8px',
          background: 'rgba(96,165,250,0.06)',
          border: '1px solid rgba(96,165,250,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <Cpu size={13} color="#60a5fa" strokeWidth={2} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              Gemini Advisory
            </span>
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>
            Diagnosis · Advisory only
          </p>
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="status-dot" />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
            Agent Engine Active
          </span>
        </div>
        <div style={{ marginTop: 3, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.25)' }}>
          FastAPI · port 8000
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
