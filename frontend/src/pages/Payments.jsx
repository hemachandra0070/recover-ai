import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPayments } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Search, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';

const FAILURE_REASONS = [
  'ALL', 'NETWORK_ERROR', 'TIMEOUT', 'INSUFFICIENT_FUNDS',
  'CHECKOUT_ABANDONED', 'CARD_DECLINED', 'EXPIRED_CARD',
];

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [failureFilter, setFailureFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_desc');

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      setPayments(await getPayments(params) || []);
    } catch {
      setError('Failed to load payments from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const STATUS_TABS = ['ALL', 'FAILED', 'RECOVERED', 'SUCCESS'];

  const filtered = payments
    .filter((p) => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        p.transaction_id.toLowerCase().includes(s) ||
        (p.payment_method || '').toLowerCase().includes(s) ||
        (p.failure_reason || '').toLowerCase().includes(s);
      const matchFailure = failureFilter === 'ALL' || p.failure_reason === failureFilter;
      return matchSearch && matchFailure;
    })
    .sort((a, b) => {
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'risk_desc') return b.risk_score - a.risk_score;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Status tabs */}
        <div className="filter-tabs">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => {
                setStatusFilter(s);
                setSearchParams(s === 'ALL' ? {} : { status: s });
              }}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <div className="input-with-icon">
            <Search size={14} className="input-icon" />
            <input
              type="text"
              className="input"
              placeholder="Search by ID, method, reason…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 240 }}
            />
          </div>

          {/* Failure filter */}
          <select
            className="select"
            value={failureFilter}
            onChange={(e) => setFailureFilter(e.target.value)}
          >
            {FAILURE_REASONS.map((r) => (
              <option key={r} value={r}>{r === 'ALL' ? 'All Failures' : r.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Sort */}
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_desc">Latest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="risk_desc">Highest Risk</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={fetch} title="Refresh">
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading payments…" />
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 10, fontSize: '0.875rem' }}>{error}</p>
          <button className="btn btn-secondary" onClick={fetch}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No matching payments"
            description="Try adjusting your filters or search query."
            actionText="Clear Filters"
            onAction={() => { setSearchTerm(''); setStatusFilter('ALL'); setFailureFilter('ALL'); }}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Failure</th>
                  <th>Risk</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        to={`/payments/${p.id}`}
                        style={{ fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: '0.775rem' }}
                      >
                        {p.transaction_id}
                        <ExternalLink size={11} color="#9ca3af" />
                      </Link>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(p.amount)}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 500,
                        background: '#f8fafc', border: '1px solid #e4e8ef',
                        borderRadius: 5, padding: '2px 7px', color: '#4b5563'
                      }}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td>
                      {p.failure_reason
                        ? <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{p.failure_reason}</span>
                        : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                      }
                    </td>
                    <td><RiskBadge score={p.risk_score} showLabel={false} /></td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.775rem', fontWeight: 600,
                        color: p.attempt_count >= 3 ? '#dc2626' : '#4b5563',
                      }}>
                        {p.attempt_count}/3
                      </span>
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/payments/${p.id}`}
                        className={p.status === 'FAILED' ? 'btn btn-recover btn-xs' : 'btn btn-secondary btn-xs'}
                      >
                        {p.status === 'FAILED' ? 'Recover' : 'View'}
                        <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {filtered.length} of {payments.length} transactions</span>
            <span>Live · FastAPI DB</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
