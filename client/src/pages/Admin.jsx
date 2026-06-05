import { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import api from '../services/api.js';
import { ROLE_LABELS } from '../constants/roles.js';
import { formatDate } from '../utils/dateHelpers.js';

function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ emp_no: '', name: '', email: '', password: '', role: 'EMPLOYEE', production_function: '', zone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/employees', form);
      onSave();
      onClose();
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
                {['SMT', 'MFT', 'REPAIR', 'RFM', 'FILTER', 'SQ'].map(f => <option key={f}>{f}</option>)}
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

export default function Admin() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Manage employees and system settings.</p>
        </div>

        {showModal && <EmployeeModal onClose={() => setShowModal(false)} onSave={() => fetchEmployees()} />}

        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">Employees ({employees.length})</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="form-input w-48 text-sm"
                placeholder="Search name or emp no…"
                value={search}
                onChange={e => { setSearch(e.target.value); fetchEmployees(1, e.target.value); }}
              />
              <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Add Employee</button>
            </div>
          </div>

          {error && <ErrorAlert message={error} />}
          {loading ? <LoadingSpinner /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
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
                      <td className="table-cell text-xs">{emp.production_function || '—'}</td>
                      <td className="table-cell text-xs">{emp.zone || '—'}</td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold ${emp.is_active ? 'text-green-600' : 'text-red-500'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => toggleActive(emp.id, emp.is_active)}
                          className="text-xs text-nokia-blue hover:underline"
                        >
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
      </div>
    </Layout>
  );
}
