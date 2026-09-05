import React from 'react';
import { 
  Radar, 
  Sparkles, 
  GitBranch, 
  ShieldCheck, 
  PlayCircle, 
  CheckCircle, 
  FileText,
  ArrowRight
} from 'lucide-react';

const stages = [
  { id: 'detect', label: 'Detect', desc: 'Ingests failed gateway signals & risk parameters', icon: Radar, color: '#3b82f6' },
  { id: 'diagnose', label: 'Diagnose', desc: 'Gemini AI analyzes root cause & probability', icon: Sparkles, color: '#8b5cf6' },
  { id: 'decide', label: 'Decide', desc: 'Proposes bounded recovery action', icon: GitBranch, color: '#6366f1' },
  { id: 'policy', label: 'Policy Check', desc: 'Authoritative policy guardrails validate safety', icon: ShieldCheck, color: '#10b981' },
  { id: 'recover', label: 'Recover', desc: 'Executes retry / link / reminder dispatch', icon: PlayCircle, color: '#f59e0b' },
  { id: 'verify', label: 'Verify', desc: 'Verifies state transition & revenue recovered', icon: CheckCircle, color: '#059669' },
];

const LifecycleBanner = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      borderRadius: '16px',
      padding: '24px 28px',
      color: '#ffffff',
      border: '1px solid #312e81',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
      marginBottom: '28px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow decoration */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Autonomous Engine Lifecycle
            </span>
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(129, 140, 248, 0.4)',
              color: '#c7d2fe',
              fontWeight: '700'
            }}>
              Production Pipeline
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginTop: '4px', letterSpacing: '-0.02em' }}>
            Detect → Diagnose → Decide → Recover → Verify
          </h2>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '380px', textAlign: 'right' }}>
          Autonomous 7-step revenue recovery with Gemini AI advisory diagnosis and strict deterministic policy guardrails.
        </div>
      </div>

      {/* Pipeline Step Visualizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        position: 'relative',
        zIndex: 10
      }}>
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(51, 65, 85, 0.8)',
                borderRadius: '12px',
                padding: '14px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: `${stage.color}22`,
                  border: `1px solid ${stage.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={16} color={stage.color} />
                </div>
                <span style={{ fontSize: '0.675rem', fontWeight: '700', color: '#64748b' }}>
                  0{idx + 1}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f1f5f9' }}>
                {stage.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.3 }}>
                {stage.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LifecycleBanner;
