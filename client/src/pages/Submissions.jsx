import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import DeclarationTable from '../components/DeclarationTable.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import LedgerEditor from '../components/LedgerEditor.jsx';
import { useDeclarations } from '../hooks/useDeclarations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { today, weekAgo } from '../utils/dateHelpers.js';

export default function Submissions() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ date_from: weekAgo(), date_to: today(), status: '', page: 1, limit: 20 });
  const { data, loading, error, refetch, setParams } = useDeclarations(filters);

  function applyFilters(next) {
    const updated = { ...filters, ...next, page: 1 };
    setFilters(updated);
    setParams(updated);
  }

  function onPage(p) {
    const updated = { ...filters, page: p };
    setFilters(updated);
    setParams(updated);
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">My Submissions</h1>
          <p className="page-subtitle">Declarations you've submitted.</p>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input w-auto" value={filters.date_from} onChange={e => applyFilters({ date_from: e.target.value })} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input w-auto" value={filters.date_to} onChange={e => applyFilters({ date_to: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select w-auto" value={filters.status} onChange={e => applyFilters({ status: e.target.value })}>
              <option value="">All</option>
              {['DRAFT', 'SUBMITTED', 'DEPT_APPROVED', 'IREP_AUTHORIZED', 'COMPLETED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={() => applyFilters({ date_from: '', date_to: '', status: '' })} className="btn-secondary text-xs">Reset</button>
        </div>

        {error && <ErrorAlert message={error} onRetry={refetch} />}

        <DeclarationTable items={data?.items} loading={loading} emptyText="No submissions found for the selected filters." />
        <Pagination page={data?.page || 1} pages={data?.pages || 1} onPage={onPage} />

        {user?.role === 'ADMIN' && <LedgerEditor />}
      </div>
    </Layout>
  );
}
