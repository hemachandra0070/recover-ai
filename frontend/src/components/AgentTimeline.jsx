import React from 'react';
import {
  Radar, Cpu, BrainCircuit, GitBranch, ShieldCheck,
  Zap, CheckCircle2, FileText, Loader2, Circle
} from 'lucide-react';

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

const ALL_STEPS = ['DETECT', 'GEMINI_DIAGNOSE', 'DECIDE', 'POLICY_CHECK', 'EXECUTE', 'VERIFY', 'AUDIT'];

const AgentTimeline = ({ logs = [], isRunning = false }) => {
  if (!logs || logs.length === 0) {
    if (isRunning) {
      return (
        <div className="timeline">
          {ALL_STEPS.map((step, i) => {
            const cfg = STEP_CONFIG[step] || STEP_CONFIG.AUDIT;
            const Icon = cfg.icon;
            return (
              <div key={step} className="timeline-step">
                <div className="timeline-line-col">
                  <div className="timeline-dot" style={{ background: '#f1f5f9' }}>
                    {i === 0
                      ? <Loader2 size={10} color="#2563eb" className="spin" />
                      : <Circle size={6} color="#d1d5db" fill="#d1d5db" />
                    }
                  </div>
                  {i < ALL_STEPS.length - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 1 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: i === 0 ? '#2563eb' : '#d1d5db' }}>
                      {cfg.label}
                    </span>
                    {i === 0 && (
                      <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>Running...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ padding: '24px 20px', color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center' }}>
        No agent steps recorded. Run the recovery agent to see the full pipeline trace.
      </div>
    );
  }

  return (
    <div className="timeline">
      {logs.map((log, i) => {
        const cfg = STEP_CONFIG[log.agent_step] || STEP_CONFIG.AUDIT;
        const Icon = cfg.icon;
        const isGemini = log.reasoning?.includes('[AI') || log.agent_step === 'GEMINI_DIAGNOSE';

        return (
          <div key={log.id || i} className="timeline-step fade-in">
            <div className="timeline-line-col">
              <div className="timeline-dot" style={{ background: cfg.bg }}>
                <Icon size={10} color={cfg.color} strokeWidth={2.5} />
              </div>
              {i < logs.length - 1 && <div className="timeline-connector" />}
            </div>

            <div className="timeline-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 1 }}>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: cfg.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {cfg.label}
                </span>
                {isGemini && (
                  <span className="badge badge-violet" style={{ fontSize: '0.6rem' }}>Gemini</span>
                )}
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#111827' }}>
                  {log.decision || '—'}
                </span>
              </div>

              {log.reasoning && (
                <p style={{
                  marginTop: 5,
                  fontSize: '0.775rem',
                  color: '#4b5563',
                  lineHeight: 1.55,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #edf0f5',
                  borderRadius: 6,
                  padding: '8px 10px',
                  marginBottom: 0,
                }}>
                  {log.reasoning}
                </p>
              )}

              <div style={{ marginTop: 5, fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgentTimeline;
