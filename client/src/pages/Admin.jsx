import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import api from '../services/api.js';
import { ROLE_LABELS } from '../constants/roles.js';
import { PRODUCTION_FUNCTION_GROUPS, PRODUCTION_FUNCTION_LABELS } from '../constants/productionFunctions.js';
import { formatDate, today, weekAgo } from '../utils/dateHelpers.js';
import dayjs from 'dayjs';

// ─── Action metadata ────────────────────────────────────────────────────────
const ACTION_META = {
  LOGIN:                  { label: 'Signed in',          color: 'green'  },
  LOGOUT:                 { label: 'Signed out',          color: 'gray'   },
  DECLARATION_CREATED:    { label: 'Created declaration', color: 'blue'   },
  DECLARATION_UPDATED:    { label: 'Edited declaration',  color: 'yellow' },
  DECLARATION_DELETED:    { label: 'Deleted declaration', color: 'red'    },
  DECLARATION_SUBMITTED:  { label: 'Submitted declaration', color: 'blue' },
  DECLARATION_APPROVED:   { label: 'Approved declaration', color: 'teal' },
  VENDOR_PICKUP_CREATED:  { label: 'Logged vendor pickup', color: 'purple' },
  EMPLOYEE_CREATED:       { label: 'Created employee',    color: 'blue'   },
  EMPLOYEE_UPDATED:       { label: 'Updated employee',    color: 'yellow' },
  EMPLOYEE_ACTIVATED:     { label: 'Activated employee',  color: 'green'  },
  EMPLOYEE_DEACTIVATED:   { label: 'Deactivated employee', color: 'red'   },
};

const BADGE_COLORS = {
  green:  'bg-green-100 text-green-700',
  gray:   'bg-gray-100 text-gray-600',
  blue:   'bg-blue-100 text-nokia-blue',
  yellow: 'bg-yellow-100 text-yellow-700',
  teal:   'bg-cyan-100 text-nokia-teal',
  purple: 'bg-purple-100 text-purple-700',
  red:    'bg-red-100 text-red-600',
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action, color: 'gray' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${BADGE_COLORS[meta.color] || BADGE_COLORS.gray}`}>
      {meta.label}
    </span>
  );
}

function logDetails(log) {
  const nv = log.new_value;
  const ov = log.old_value;

  if (log.action === 'DECLARATION_CREATED') return nv?.declaration_no || '—';
  if (log.action === 'DECLARATION_APPROVED' && ov?.status && nv?.status) {
    return `${ov.status} → ${nv.status}`;
  }
  if (log.action === 'DECLARATION_SUBMITTED') return 'DRAFT → SUBMITTED';
  if (log.action === 'DECLARATION_UPDATED') return nv?.declaration_no || 'Draft updated';
  if (log.action === 'DECLARATION_DELETED') return ov?.declaration_no || 'Draft deleted';
  if (log.action === 'VENDOR_PICKUP_CREATED') {
    return nv?.vendor_name ? `${nv.vendor_name}${nv.category ? ` · ${nv.category}` : ''}` : '—';
  }
  if (log.action === 'EMPLOYEE_CREATED') return nv?.emp_no ? `${nv.emp_no} — ${nv.name}` : '—';
  if (log.action === 'EMPLOYEE_ACTIVATED' || log.action === 'EMPLOYEE_DEACTIVATED') {
    return nv?.emp_no ? `${nv.emp_no} — ${nv.name}` : '—';
  }
  if (log.action === 'EMPLOYEE_UPDATED') return nv?.emp_no || '—';
  return '—';
}

// ─── Employee modal ──────────────────────────────────────────────────────────
function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ emp_no: '', name: '', email: '', password: '', role: 'EMPLOYEE', production_function: '', zone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/employees', form);
      onSave(); onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Add Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded mb-4">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Emp No *</label><input className="form-input" required value={form.emp_no} onChange={e => set('emp_no', e.target.value)} /></div>
            <div><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label className="form-label">Email *</label><input type="email" className="form-input" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className="form-label">Password *</label><input type="password" className="form-input" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} /></div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Function</label>
              <select className="form-select" value={form.production_function} onChange={e => set('production_function', e.target.value)}>
                <option value="">— None —</option>
                {PRODUCTION_FUNCTION_GROUPS.map(group => group.flat
                  ? group.options.map(f => <option key={f} value={f}>{PRODUCTION_FUNCTION_LABELS[f]}</option>)
                  : (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(f => <option key={f} value={f}>{PRODUCTION_FUNCTION_LABELS[f]}</option>)}
                    </optgroup>
                  )
                )}
              </select>
            </div>
            <div><label className="form-label">Zone</label><input className="form-input" value={form.zone} onChange={e => set('zone', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Employee'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employees tab ───────────────────────────────────────────────────────────
function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);

  async function fetchEmployees(p = 1, q = search) {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { page: p, limit: 20, search: q } });
      setEmployees(res.data.data.employees);
      setPages(res.data.data.pages);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function toggleActive(id, current) {
    try {
      await api.patch(`/employees/${id}`, { is_active: !current });
      fetchEmployees(page);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Update failed');
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-semibold text-gray-900">Employees ({employees.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text" className="form-input w-48 text-sm"
            placeholder="Search name or emp no…"
            value={search}
            onChange={e => { setSearch(e.target.value); fetchEmployees(1, e.target.value); }}
          />
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Add Employee</button>
        </div>
      </div>

      {showModal && <EmployeeModal onClose={() => setShowModal(false)} onSave={() => fetchEmployees()} />}
      {error && <ErrorAlert message={error} />}

      {loading ? <LoadingSpinner /> : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr>
                {['Emp No', 'Name', 'Email', 'Role', 'Function', 'Zone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="table-cell font-mono text-xs">{emp.emp_no}</td>
                  <td className="table-cell font-medium">{emp.name}</td>
                  <td className="table-cell text-xs">{emp.email}</td>
                  <td className="table-cell text-xs">{ROLE_LABELS[emp.role]}</td>
                  <td className="table-cell text-xs">{PRODUCTION_FUNCTION_LABELS[emp.production_function] || emp.production_function || '—'}</td>
                  <td className="table-cell text-xs">{emp.zone || '—'}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${emp.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => toggleActive(emp.id, emp.is_active)} className="text-xs text-nokia-blue hover:underline">
                      {emp.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {!employees.length && (
                <tr><td colSpan={8} className="table-cell text-center text-gray-400">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetchEmployees(page - 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40">← Prev</button>
            <button disabled={page >= pages} onClick={() => fetchEmployees(page + 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit log tab ───────────────────────────────────────────────────────────
function AuditLogTab() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [actions, setActions]   = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filters, setFilters] = useState({
    date_from: weekAgo(),
    date_to: today(),
    action: '',
    user_id: '',
    search: '',
  });

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const fetchLogs = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50, ...f };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
      setPages(res.data.data.pages);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load audit log');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1, filters);
  }, []);

  useEffect(() => {
    api.get('/admin/audit-logs/actions').then(r => setActions(r.data.data)).catch(() => {});
    api.get('/admin/employees-list').then(r => setEmployees(r.data.data)).catch(() => {});
  }, []);

  function applyFilters(newFilters) {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);
    fetchLogs(1, merged);
  }

  function resetFilters() {
    const def = { date_from: weekAgo(), date_to: today(), action: '', user_id: '', search: '' };
    setFilters(def);
    fetchLogs(1, def);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input w-auto text-xs" value={filters.date_from}
              onChange={e => applyFilters({ date_from: e.target.value })} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input w-auto text-xs" value={filters.date_to}
              onChange={e => applyFilters({ date_to: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Action</label>
            <select className="form-select w-auto text-xs" value={filters.action}
              onChange={e => applyFilters({ action: e.target.value })}>
              <option value="">All actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">User</label>
            <select className="form-select w-auto text-xs" value={filters.user_id}
              onChange={e => applyFilters({ user_id: e.target.value })}>
              <option value="">All users</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.emp_no} — {e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Search name</label>
            <input type="text" className="form-input text-xs w-40" placeholder="Name or emp no…"
              value={filters.search}
              onChange={e => applyFilters({ search: e.target.value })} />
          </div>
          <button onClick={resetFilters} className="btn-secondary text-xs">Reset</button>
        </div>
        <p className="text-xs text-gray-400 mt-3">{total.toLocaleString()} events found</p>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Log table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : !logs.length ? (
          <div className="py-16 text-center text-gray-400 text-sm">No activity found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr>
                  {['Timestamp', 'User', 'Role', 'Action', 'Details', 'IP Address'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className={i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                    <td className="table-cell whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900">
                        {dayjs(log.created_at).format('DD MMM YYYY')}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {dayjs(log.created_at).format('HH:mm:ss')}
                      </p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-900 text-xs">{log.user?.name || '—'}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{log.user?.emp_no}</p>
                    </td>
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">
                      {ROLE_LABELS[log.user?.role] || '—'}
                    </td>
                    <td className="table-cell">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="table-cell text-xs text-gray-600 max-w-[200px] truncate">
                      {logDetails(log)}
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-400">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {pages} · {total} entries</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={page >= pages} onClick={() => fetchLogs(page + 1)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin page ─────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState('employees');

  const tabs = [
    { id: 'employees', label: 'Employees' },
    { id: 'audit',     label: 'Audit Log' },
  ];

  return (
    <Layout>
      <div className="space-y-5 max-w-screen-xl mx-auto">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Manage employees and review system activity.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1 w-fit border border-white/15">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === t.id
                  ? 'bg-white text-nokia-blue shadow-sm'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'audit'     && <AuditLogTab />}
      </div>
    </Layout>
  );
}
