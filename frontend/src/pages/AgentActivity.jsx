import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAgentLogs } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  Search, RefreshCw, ExternalLink, Clock,
  Radar, Cpu, GitBranch, ShieldCheck, Zap, CheckCircle2, FileText, BrainCircuit
} from 'lucide-react';

const STEPS = ['ALL', 'DETECT', 'GEMINI_DIAGNOSE', 'DIAGNOSE', 'DECIDE', 'POLICY_CHECK', 'EXECUTE', 'VERIFY', 'AUDIT'];

const STEP_CONFIG = {
  DETECT:          { icon: Radar,        color: '#2563eb', bg: '#eff6ff', label: 'Detect' },
  GEMINI_DIAGNOSE: { icon: Cpu,          color: '#7c3aed', bg: '#f5f3ff', label: 'AI Diagnose' },
  DIAGNOSE:        { icon: BrainCircuit, color: '#0284c7', bg: '#f0f9ff', label: 'Diagnose' },
  DECIDE:          { icon: GitBranch,    color: '#0284c7', bg: '#f0f9ff', label: 'Decide' },
  POLICY_CHECK:    { icon: ShieldCheck,  color: '#16a34a', bg: '#f0fdf4', label: 'Policy Check' },
  EXECUTE:         { icon: Zap,          color: '#d97706', bg: '#fffbeb', label: 'Execute' },
  VERIFY:          { icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', label: 'Verify' },
  AUDIT:           { icon: FileText,     color: '#6b7280', bg: '#f9fafb', label: 'Audit' },
};

const StepChip = ({ step }) => {
  const cfg = STEP_CONFIG[step] || STEP_CONFIG.AUDIT;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: '0.6875rem', fontWeight: 700,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      border: `1px solid ${cfg.bg === '#f9fafb' ? '#e4e8ef' : 'transparent'}`,
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
};

const AgentActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState('ALL');

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await getAgentLogs({ limit: 150 }) || []);
    } catch {
      setError('Unable to fetch agent logs from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = logs.filter((log) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (log.reasoning || '').toLowerCase().includes(s) ||
      (log.decision || '').toLowerCase().includes(s) ||
      String(log.payment_id).includes(s);
    const matchStep = stepFilter === 'ALL' || log.agent_step === stepFilter;
    return matchSearch && matchStep;
  });

  // Compute summary counts
  const stepCounts = {};
  logs.forEach((l) => { stepCounts[l.agent_step] = (stepCounts[l.agent_step] || 0) + 1; });
  const geminiCount = logs.filter((l) => l.reasoning?.includes('[AI')).length;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Events', value: logs.length },
          { label: 'Gemini Diagnoses', value: geminiCount },
          { label: 'Policy Checks', value: stepCounts['POLICY_CHECK'] || 0 },
          { label: 'Executions', value: stepCounts['EXECUTE'] || 0 },
        ].map((s) => (
          <div key={s.label} style={{
            flex: '1 1 140px',
            background: '#fff', border: '1px solid #e4e8ef', borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Step filter tabs */}
        <div className="filter-tabs" style={{ flex: 1 }}>
          {STEPS.map((s) => (
            <button
              key={s}
              className={`filter-tab${stepFilter === s ? ' active' : ''}`}
              onClick={() => setStepFilter(s)}
            >
              {s === 'ALL' ? 'All' : (STEP_CONFIG[s]?.label || s)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input-with-icon">
            <Search size={14} className="input-icon" />
            <input
              type="text"
              className="input"
              placeholder="Search reasoning, decisions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetch}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Log feed */}
      {loading ? (
        <LoadingSpinner message="Fetching agent audit logs…" />
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 10, fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-secondary" onClick={fetch}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No logs found"
            description="Try adjusting your filter or search query."
            actionText="Clear"
            onAction={() => { setSearch(''); setStepFilter('ALL'); }}
          />
        </div>
      ) : (
        <div className="card">
          <div>
            {filtered.map((log, i) => {
              const isGemini = log.reasoning?.includes('[AI') || log.agent_step === 'GEMINI_DIAGNOSE';
              const isFallback = log.reasoning?.includes('[FALLBACK');
              return (
                <div
                  key={log.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid #edf0f5' : 'none',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                  className="fade-in"
                >
                  {/* Step chip */}
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <StepChip step={log.agent_step} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8375rem', color: '#111827' }}>
                        {log.decision || 'Step Completed'}
                      </span>
                      {isGemini && <span className="badge badge-violet" style={{ fontSize: '0.6rem' }}>Gemini AI</span>}
                      {isFallback && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>Fallback</span>}
                    </div>

                    {log.reasoning && (
                      <p style={{
                        fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.55,
                        background: '#f8fafc', border: '1px solid #edf0f5',
                        borderRadius: 6, padding: '8px 10px', margin: 0,
                      }}>
                        {log.reasoning}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <Link
                      to={`/payments/${log.payment_id}`}
                      style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      #{log.payment_id} <ExternalLink size={10} />
                    </Link>
                    <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="table-footer">
            <span>Showing {filtered.length} of {logs.length} events</span>
            <span>Live · FastAPI</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentActivity;
