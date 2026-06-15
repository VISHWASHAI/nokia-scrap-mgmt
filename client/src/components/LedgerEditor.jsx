import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import Pagination from './Pagination.jsx';
import { listLedger, createLedgerRow, updateLedgerRow, deleteLedgerRow } from '../services/ledger.js';
import { formatDate } from '../utils/dateHelpers.js';

const WASTE_TYPES = ['GENERAL', 'HAZARDOUS', 'EWASTE'];
const SOURCES = ['BAT', 'SOFT'];
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
const closingOf = (r) => num(r.opening_stock) + num(r.waste_for_day) - num(r.disposal);
const blankRow = () => ({ date: '', category: '', source: 'BAT', waste_type: 'GENERAL', opening_stock: '', waste_for_day: '', disposal: '' });

export default function LedgerEditor() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', source: '', waste_type: '', category: '', page: 1, limit: 50 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState(blankRow());

  const load = useCallback(async (f) => {
    setLoading(true); setError('');
    try { setData(await listLedger(f)); }
    catch (err) { setError(err.response?.data?.error?.message || 'Failed to load ledger'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filters); }, [load, filters]);

  const setFilter = (patch) => setFilters(f => ({ ...f, ...patch, page: 1 }));

  function startEdit(row) {
    setAdding(false);
    setEditId(row.id);
    setEditRow({
      date: row.date.slice(0, 10), category: row.category, source: row.source, waste_type: row.waste_type,
      opening_stock: row.opening_stock, waste_for_day: row.waste_for_day, disposal: row.disposal,
    });
  }

  async function saveEdit() {
    setBusy(true); setError('');
    try { await updateLedgerRow(editId, editRow); setEditId(null); await load(filters); }
    catch (err) { setError(err.response?.data?.error?.message || 'Save failed'); }
    finally { setBusy(false); }
  }

  async function remove(row) {
    if (!window.confirm(`Delete ${formatDate(row.date)} · ${row.category} (${row.source})?`)) return;
    setBusy(true); setError('');
    try { await deleteLedgerRow(row.id); await load(filters); }
    catch (err) { setError(err.response?.data?.error?.message || 'Delete failed'); }
    finally { setBusy(false); }
  }

  async function saveNew() {
    if (!newRow.date || !newRow.category) { setError('Date and material are required to add a row.'); return; }
    setBusy(true); setError('');
    try { await createLedgerRow(newRow); setAdding(false); setNewRow(blankRow()); await load(filters); }
    catch (err) { setError(err.response?.data?.error?.message || 'Add failed'); }
    finally { setBusy(false); }
  }

  const cellInput = (row, key, set, w = 'w-24') => (
    <input className={`form-input text-xs py-1 ${w}`} value={row[key] ?? ''} onChange={e => set({ ...row, [key]: e.target.value })} />
  );
  const numInput = (row, key, set) => (
    <input type="number" step="0.001" className="form-input text-xs py-1 w-24" value={row[key] ?? ''} onChange={e => set({ ...row, [key]: e.target.value })} />
  );
  const selInput = (row, key, opts, set) => (
    <select className="form-select text-xs py-1 w-auto" value={row[key]} onChange={e => set({ ...row, [key]: e.target.value })}>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Ledger Data (imported &amp; manual)</h2>
          <p className="text-xs text-gray-500">{data?.total ?? 0} rows · edit, delete, or add stock entries.</p>
        </div>
        <button onClick={() => { setAdding(a => !a); setEditId(null); setNewRow(blankRow()); }} className="btn-primary text-xs">
          {adding ? 'Cancel' : '+ Add Row'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <div><label className="form-label">From</label><input type="date" className="form-input w-auto text-xs py-1" value={filters.date_from} onChange={e => setFilter({ date_from: e.target.value })} /></div>
        <div><label className="form-label">To</label><input type="date" className="form-input w-auto text-xs py-1" value={filters.date_to} onChange={e => setFilter({ date_to: e.target.value })} /></div>
        <div><label className="form-label">Source</label><select className="form-select w-auto text-xs py-1" value={filters.source} onChange={e => setFilter({ source: e.target.value })}><option value="">All</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className="form-label">Type</label><select className="form-select w-auto text-xs py-1" value={filters.waste_type} onChange={e => setFilter({ waste_type: e.target.value })}><option value="">All</option>{WASTE_TYPES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label className="form-label">Material</label><input className="form-input w-40 text-xs py-1" placeholder="search…" value={filters.category} onChange={e => setFilter({ category: e.target.value })} /></div>
        {(filters.date_from || filters.date_to || filters.source || filters.waste_type || filters.category) && (
          <button onClick={() => setFilters({ date_from: '', date_to: '', source: '', waste_type: '', category: '', page: 1, limit: 50 })} className="btn-secondary text-xs">Clear</button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr>
              {['Date', 'Material', 'Source', 'Type', 'Opening', 'Waste', 'Disposal', 'Closing', ''].map(h => <th key={h} className="table-header">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="bg-blue-50/50">
                <td className="table-cell"><input type="date" className="form-input text-xs py-1 w-32" value={newRow.date} onChange={e => setNewRow({ ...newRow, date: e.target.value })} /></td>
                <td className="table-cell">{cellInput(newRow, 'category', setNewRow, 'w-40')}</td>
                <td className="table-cell">{selInput(newRow, 'source', SOURCES, setNewRow)}</td>
                <td className="table-cell">{selInput(newRow, 'waste_type', WASTE_TYPES, setNewRow)}</td>
                <td className="table-cell">{numInput(newRow, 'opening_stock', setNewRow)}</td>
                <td className="table-cell">{numInput(newRow, 'waste_for_day', setNewRow)}</td>
                <td className="table-cell">{numInput(newRow, 'disposal', setNewRow)}</td>
                <td className="table-cell font-medium">{closingOf(newRow).toFixed(3)}</td>
                <td className="table-cell"><button onClick={saveNew} disabled={busy} className="text-nokia-blue text-xs font-medium">Save</button></td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={9} className="py-8"><LoadingSpinner /></td></tr>
            ) : (data?.items || []).map((row, i) => editId === row.id ? (
              <tr key={row.id} className="bg-yellow-50/60">
                <td className="table-cell"><input type="date" className="form-input text-xs py-1 w-32" value={editRow.date} onChange={e => setEditRow({ ...editRow, date: e.target.value })} /></td>
                <td className="table-cell">{cellInput(editRow, 'category', setEditRow, 'w-40')}</td>
                <td className="table-cell">{selInput(editRow, 'source', SOURCES, setEditRow)}</td>
                <td className="table-cell">{selInput(editRow, 'waste_type', WASTE_TYPES, setEditRow)}</td>
                <td className="table-cell">{numInput(editRow, 'opening_stock', setEditRow)}</td>
                <td className="table-cell">{numInput(editRow, 'waste_for_day', setEditRow)}</td>
                <td className="table-cell">{numInput(editRow, 'disposal', setEditRow)}</td>
                <td className="table-cell font-medium">{closingOf(editRow).toFixed(3)}</td>
                <td className="table-cell whitespace-nowrap">
                  <button onClick={saveEdit} disabled={busy} className="text-nokia-blue text-xs font-medium mr-2">Save</button>
                  <button onClick={() => setEditId(null)} className="text-gray-500 text-xs">Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={row.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="table-cell">{formatDate(row.date)}</td>
                <td className="table-cell font-medium">{row.category}</td>
                <td className="table-cell">{row.source}</td>
                <td className="table-cell text-xs text-gray-500">{row.waste_type}</td>
                <td className="table-cell">{Number(row.opening_stock).toFixed(3)}</td>
                <td className="table-cell">{Number(row.waste_for_day).toFixed(3)}</td>
                <td className="table-cell">{Number(row.disposal).toFixed(3)}</td>
                <td className="table-cell font-semibold">{Number(row.closing_stock).toFixed(3)}</td>
                <td className="table-cell whitespace-nowrap">
                  <button onClick={() => startEdit(row)} className="text-nokia-blue text-xs font-medium mr-2">Edit</button>
                  <button onClick={() => remove(row)} className="text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {!loading && !(data?.items || []).length && !adding && (
              <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No ledger rows. Import a sheet or add a row.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={data?.page || 1} pages={data?.pages || 1} onPage={p => setFilters(f => ({ ...f, page: p }))} />
    </div>
  );
}
