import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { checkHealth } from '../api/client';
import { RefreshCw, ChevronRight } from 'lucide-react';

const TITLES = {
  '/': { title: 'Overview', crumbs: ['Dashboard', 'Overview'] },
  '/payments': { title: 'Payments', crumbs: ['Dashboard', 'Payments'] },
  '/agent': { title: 'Agent Logs', crumbs: ['Dashboard', 'Agent Logs'] },
};

const TopBar = () => {
  const location = useLocation();
  const [health, setHealth] = useState({ status: 'checking' });
  const [checking, setChecking] = useState(false);

  const pollHealth = async () => {
    setChecking(true);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    pollHealth();
    const id = setInterval(pollHealth, 30000);
    return () => clearInterval(id);
  }, []);

  const isOnline = health.status === 'ok';

  // Resolve path
  let pathKey = location.pathname;
  if (pathKey.startsWith('/payments/')) pathKey = '/payments/:id';
  const info = TITLES[pathKey] || { crumbs: ['Dashboard'], title: 'RecoverAI' };

  return (
    <header className="top-bar">
      {/* Breadcrumb */}
      <div className="topbar-breadcrumb">
        {info.crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={13} className="text-muted" />}
            <span
              className={`topbar-title${i < info.crumbs.length - 1 ? ' text-muted' : ''}`}
              style={{ fontWeight: i === info.crumbs.length - 1 ? 600 : 400, fontSize: '0.8125rem' }}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
        {pathKey === '/payments/:id' && (
          <>
            <ChevronRight size={13} className="text-muted" />
            <span className="topbar-title" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              Transaction Detail
            </span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="topbar-actions">
        {/* Health pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: '999px',
          backgroundColor: isOnline ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isOnline ? '#16a34a' : '#dc2626',
            flexShrink: 0,
          }} className={isOnline ? 'pulse-dot' : ''} />
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: isOnline ? '#15803d' : '#b91c1c',
            letterSpacing: '0.01em',
          }}>
            {isOnline ? 'API Connected' : 'API Offline'}
          </span>
          <button
            onClick={pollHealth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
          >
            <RefreshCw size={11} color={isOnline ? '#16a34a' : '#dc2626'} className={checking ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
