import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardStats,
  getPayments,
  getRecoveryActions,
  getAgentLogs,
} from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  AlertCircle, TrendingUp, BarChart2, ShieldAlert,
  RefreshCw, ArrowRight, ExternalLink, ChevronRight,
  Cpu, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1f2e', borderRadius: 8, padding: '8px 12px',
      fontSize: '0.75rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{fmt(payload[0].value)}</div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [failedPayments, setFailedPayments] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, fp, ra, rl] = await Promise.all([
        getDashboardStats(),
        getPayments({ status: 'FAILED', limit: 5 }),
        getRecoveryActions({ limit: 5 }),
        getAgentLogs({ limit: 5 }),
      ]);
      setStats(s);
      setFailedPayments(fp || []);
      setRecentActions(ra || []);
      setRecentLogs(rl || []);
    } catch {
      setError('Unable to connect to the backend. Make sure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard data..." />;

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
        <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 10px' }} />
        <p style={{ fontWeight: 600, color: '#b91c1c', marginBottom: 6, fontSize: '0.875rem' }}>Backend Connection Failed</p>
        <p style={{ fontSize: '0.775rem', color: '#dc2626', marginBottom: 16 }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchAll}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const recoveryRate = ((stats?.recovery_rate || 0) * 100).toFixed(1);

  const barData = [
    { name: 'At Risk', amount: stats?.revenue_at_risk || 0, fill: '#ef4444' },
    { name: 'Recovered', amount: stats?.total_recovered || 0, fill: '#16a34a' },
  ];

  const pieData = [
    { name: 'Recovered / OK', value: stats?.successful_payments || 0, color: '#16a34a' },
    { name: 'Failed', value: stats?.failed_payments || 0, color: '#ef4444' },
  ];

  return (
    <div>
      {/* Stat grid */}
      <div className="stat-grid mb-5">
        <StatCard
          title="Revenue at Risk"
          value={fmt(stats?.revenue_at_risk)}
          meta={`${stats?.failed_payments || 0} failed payments`}
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="Revenue Recovered"
          value={fmt(stats?.total_recovered)}
          meta={`${stats?.recovery_actions || 0} automated actions`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Recovery Rate"
          value={`${recoveryRate}%`}
          meta={`${stats?.total_payments || 0} total transactions`}
          icon={BarChart2}
          variant="default"
        />
        <StatCard
          title="Escalations"
          value={stats?.escalated_cases || 0}
          meta="Routed to human ops"
          icon={ShieldAlert}
          variant="warning"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>
        {/* Bar chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={15} color="#2563eb" />
                Revenue Recovery
              </div>
              <div className="card-subtitle">Revenue at risk vs. autonomously recovered</div>
            </div>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={48} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Donut */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Payment Status</div>
              <div className="card-subtitle">Distribution</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} payments`, n]}
                    contentStyle={{ background: '#1a1f2e', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Failed payments */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <AlertCircle size={14} color="#dc2626" />
                Failed Payments
              </div>
              <div className="card-subtitle">Pending recovery</div>
            </div>
            <Link to="/payments?status=FAILED" className="btn btn-secondary btn-sm">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {failedPayments.length === 0 ? (
            <EmptyState title="No failed payments" description="All payments are cleared." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Risk</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedPayments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
                            {p.transaction_id.slice(0, 12)}…
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 1 }}>{p.payment_method}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{fmt(p.amount)}</td>
                        <td>
                          <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                            {p.failure_reason || '—'}
                          </span>
                        </td>
                        <td><RiskBadge score={p.risk_score} showLabel={false} /></td>
                        <td>
                          <Link to={`/payments/${p.id}`} className="btn btn-recover btn-xs">
                            Recover
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Recent actions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Activity size={14} color="#16a34a" />
                Recovery Actions
              </div>
              <div className="card-subtitle">Automated actions executed</div>
            </div>
            <Link to="/agent" className="btn btn-secondary btn-sm">
              Audit log <ChevronRight size={13} />
            </Link>
          </div>
          {recentActions.length === 0 ? (
            <EmptyState title="No actions yet" description="Trigger recovery on a failed payment to start." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Payment</th>
                    <th>Recovered</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActions.map((act) => (
                    <tr key={act.id}>
                      <td><StatusBadge status={act.action_type} /></td>
                      <td>
                        <Link to={`/payments/${act.payment_id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                          #{act.payment_id} <ExternalLink size={10} />
                        </Link>
                      </td>
                      <td style={{ fontWeight: 700, color: act.amount_recovered > 0 ? '#16a34a' : '#9ca3af' }}>
                        {fmt(act.amount_recovered)}
                      </td>
                      <td><StatusBadge status={act.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Live agent logs */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Cpu size={14} color="#7c3aed" />
              Agent Activity
            </div>
            <div className="card-subtitle">Recent pipeline step events</div>
          </div>
          <Link to="/agent" className="btn btn-secondary btn-sm">
            Full log <ChevronRight size={13} />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <EmptyState title="No agent logs yet" description="Logs appear here when recoveries are triggered." />
        ) : (
          <div>
            {recentLogs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 20px',
                  borderBottom: i < recentLogs.length - 1 ? '1px solid #edf0f5' : 'none',
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <span className="badge badge-violet" style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)' }}>
                    {log.agent_step}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{log.decision || 'Step executed'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2, lineHeight: 1.4 }} className="truncate">
                    {log.reasoning}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <Link to={`/payments/${log.payment_id}`} style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                    #{log.payment_id}
                  </Link>
                  <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
