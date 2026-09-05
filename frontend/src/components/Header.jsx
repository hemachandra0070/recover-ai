import React, { useState, useEffect } from 'react';
import { checkHealth } from '../api/client';
import { ShieldCheck, Bot, RefreshCw, Radio } from 'lucide-react';

const Header = ({ title, subtitle }) => {
  const [health, setHealth] = useState({ status: 'checking', service: 'RecoverAI' });
  const [checking, setChecking] = useState(false);

  const pollHealth = async () => {
    setChecking(true);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setHealth({ status: 'offline', service: 'RecoverAI' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = health.status === 'ok';

  return (
    <header style={{
      height: '74px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
    }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1px' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Backend Health Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '9999px',
          backgroundColor: isOnline ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
        }}>
          <Radio size={14} color={isOnline ? '#059669' : '#dc2626'} className={isOnline ? 'animate-pulse' : ''} />
          <span style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: isOnline ? '#065f46' : '#991b1b'
          }}>
            {isOnline ? 'Backend Online (Port 8000)' : 'Backend Disconnected'}
          </span>
          <button
            onClick={pollHealth}
            title="Refresh Health"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: isOnline ? '#059669' : '#dc2626',
              padding: 0
            }}
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Gemini + Policy Tag */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#475569'
        }}>
          <Bot size={14} color="#8b5cf6" />
          <span>Gemini Advisory</span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <ShieldCheck size={14} color="#10b981" />
          <span>Policy Authoritative</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
