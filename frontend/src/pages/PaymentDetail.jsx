import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentDetails, runRecoveryAgent } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import AgentTimeline from '../components/AgentTimeline';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft, Play, RefreshCw, CheckCircle, AlertCircle,
  Copy, Check, Cpu, ShieldCheck, CreditCard, User
} from 'lucide-react';

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const KVRow = ({ label, children }) => (
  <div className="kv-row">
    <span className="kv-key">{label}</span>
    <span className="kv-val">{children}</span>
  </div>
);

const PaymentDetail = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setPayment(await getPaymentDetails(id));
    } catch {
      setError('Unable to load payment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRecovery = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await runRecoveryAgent(id);
      setResult(r);
      setPayment(await getPaymentDetails(id));
    } catch {
      setError('Agent execution failed. Check backend logs.');
    } finally {
      setRunning(false);
    }
  };

  const copyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return <LoadingSpinner message={`Loading payment #${id}…`} />;

  if (!payment) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 32, textAlign: 'center' }}>
        <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 10px' }} />
        <p style={{ fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>Payment Not Found</p>
        <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: 16 }}>{error}</p>
        <Link to="/payments" className="btn btn-secondary"><ArrowLeft size={13} /> Back</Link>
      </div>
    );
  }

  const diagnoseLog = payment?.agent_logs?.find((l) => l.agent_step?.includes('DIAGNOSE'));
  const decideLog = payment?.agent_logs?.find((l) => l.agent_step === 'DECIDE');
  const policyLog = payment?.agent_logs?.find((l) => l.agent_step === 'POLICY_CHECK');
  const latestAction = payment?.recovery_actions?.[0];
  const isFailed = payment.status === 'FAILED';

  return (
    <div>
      {/* Top nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/payments" className="btn btn-secondary btn-sm">
            <ArrowLeft size={13} /> Payments
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                {payment.transaction_id}
              </span>
              <StatusBadge status={payment.status} />
              <RiskBadge score={payment.risk_score} showLabel={false} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 3 }}>
              Payment ID #{payment.id} · {new Date(payment.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          className="btn btn-recover btn-lg"
          onClick={handleRecovery}
          disabled={running}
          style={{ minWidth: 170 }}
        >
          {running ? (
            <><RefreshCw size={14} className="spin" /> Running Agent…</>
          ) : (
            <><Play size={14} /> Run Recovery Agent</>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} color="#dc2626" />
          <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
        }} className="fade-in">
          <CheckCircle size={16} color="#16a34a" flexShrink={0} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>
              Recovery agent completed
            </span>
            <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                ['AI Diagnosis', result.diagnosis],
                ['Proposed', result.proposed_action],
                ['Final Action', result.final_action],
                ['Recovered', fmt(result.amount_recovered)],
              ].map(([k, v]) => v && (
                <div key={k}>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 999 }}>
            {result.source || 'gemini'}
          </span>
        </div>
      )}

      {/* 4-card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>

        {/* Transaction Context */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><CreditCard size={14} color="#4b5563" /> Transaction Context</div>
          </div>
          <div className="card-body">
            <KVRow label="Amount">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(payment.amount)}</span>
            </KVRow>
            <KVRow label="Currency">{payment.currency}</KVRow>
            <KVRow label="Method">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{payment.payment_method}</span>
            </KVRow>
            <KVRow label="Failure Reason">
              {payment.failure_reason
                ? <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{payment.failure_reason}</span>
                : <span style={{ color: '#9ca3af' }}>—</span>
              }
            </KVRow>
            <KVRow label="Attempt Count">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: payment.attempt_count >= 3 ? '#dc2626' : '#111827' }}>
                {payment.attempt_count} / 3
              </span>
            </KVRow>
            <KVRow label="Customer">
              {payment.customer?.name || `Customer #${payment.customer_id}`}
            </KVRow>
            <KVRow label="Customer Type">
              <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                {payment.customer?.customer_type || 'REGULAR'}
              </span>
            </KVRow>
          </div>
        </div>

        {/* AI Diagnosis */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Cpu size={14} color="#7c3aed" /> AI Diagnosis</div>
              <div className="card-subtitle">Gemini advisory layer</div>
            </div>
            <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>Gemini</span>
          </div>
          <div className="card-body">
            {diagnoseLog ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 4 }}>
                    Root Cause
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {diagnoseLog.decision}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 4 }}>
                    Recommended Action
                  </div>
                  <StatusBadge status={decideLog?.decision} />
                </div>
                <div style={{
                  background: '#f8fafc', border: '1px solid #edf0f5',
                  borderRadius: 7, padding: '10px 12px',
                  fontSize: '0.775rem', color: '#4b5563', lineHeight: 1.6
                }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: 3 }}>Reasoning:</div>
                  {diagnoseLog.reasoning}
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                Run the agent to generate AI diagnosis.
              </div>
            )}
          </div>
        </div>

        {/* Policy Guardrail */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><ShieldCheck size={14} color="#16a34a" /> Policy Guardrail</div>
              <div className="card-subtitle">Authoritative rule enforcement</div>
            </div>
            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Active</span>
          </div>
          <div className="card-body">
            {policyLog ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 4 }}>
                    Policy Decision
                  </div>
                  <StatusBadge status={policyLog.decision?.includes('APPROVED') ? 'APPROVED' : 'OVERRIDDEN'} />
                </div>
                <div style={{
                  background: '#f8fafc', border: '1px solid #edf0f5',
                  borderRadius: 7, padding: '10px 12px',
                  fontSize: '0.775rem', color: '#4b5563', lineHeight: 1.6
                }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: 3 }}>Rule Enforcement:</div>
                  {policyLog.reasoning}
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                Awaiting policy validation step.
              </div>
            )}
          </div>
        </div>

        {/* Execution & Outcome */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Play size={14} color="#d97706" /> Execution & Outcome</div>
          </div>
          <div className="card-body">
            {latestAction ? (
              <>
                <KVRow label="Action Dispatched">
                  <StatusBadge status={latestAction.action_type} />
                </KVRow>
                <KVRow label="Execution Status">
                  <StatusBadge status={latestAction.status} />
                </KVRow>
                <KVRow label="Amount Recovered">
                  <span style={{ fontWeight: 700, color: latestAction.amount_recovered > 0 ? '#16a34a' : '#9ca3af', fontSize: '0.9rem' }}>
                    {fmt(latestAction.amount_recovered)}
                  </span>
                </KVRow>

                {latestAction.action_type === 'GENERATE_PAYMENT_LINK' && (
                  <div style={{
                    marginTop: 12, background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 7, padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      Payment Link
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        readOnly
                        value={`https://pay.recoverai.demo/link/${payment.transaction_id}`}
                        style={{
                          flex: 1, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                          padding: '5px 8px', border: '1px solid #fde68a', borderRadius: 5,
                          background: '#fff', color: '#92400e', outline: 'none'
                        }}
                      />
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => copyLink(`https://pay.recoverai.demo/link/${payment.transaction_id}`)}
                      >
                        {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#9ca3af' }}>
                  Executed {new Date(latestAction.executed_at).toLocaleString()}
                </div>
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                No execution record yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7-step agent trace */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title"><Cpu size={14} color="#2563eb" /> Agent Pipeline Trace</div>
            <div className="card-subtitle">
              Immutable 7-step audit: detect → diagnose → decide → policy → execute → verify → audit
            </div>
          </div>
        </div>
        <AgentTimeline logs={payment.agent_logs} isRunning={running} />
      </div>
    </div>
  );
};

export default PaymentDetail;
