import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { createDeclaration, submitDeclaration } from '../services/declarations.js';
import {
  GENERAL_WASTE_CATEGORIES,
  HAZARDOUS_CATEGORIES,
  EWASTE_CATEGORIES,
} from '../constants/wasteCategories.js';
import { today } from '../utils/dateHelpers.js';

const PRODUCTION_FUNCTIONS = ['SMT', 'MFT', 'REPAIR', 'RFM', 'FILTER', 'SQ'];

function sourceFromFunction(fn) {
  return ['SMT', 'MFT'].includes(fn) ? 'BAT' : 'SOFT';
}

function buildDefaultRows(categories, waste_type) {
  return categories.map(cat => ({ waste_type, category: cat, pallet_qty: '', weight_kg: '', remarks: '' }));
}

export default function DeclarationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    date: today(),
    shift: 'A',
    time: new Date().toTimeString().slice(0, 5),
    zone: user?.zone || '',
    production_function: user?.production_function || 'SMT',
    description: '',
    reference_no: '',
  });

  const [generalRows, setGeneralRows] = useState(buildDefaultRows(GENERAL_WASTE_CATEGORIES, 'GENERAL'));
  const [hazardousRows, setHazardousRows] = useState(buildDefaultRows(HAZARDOUS_CATEGORIES, 'HAZARDOUS'));
  const [ewasteRows, setEwasteRows] = useState(buildDefaultRows(EWASTE_CATEGORIES, 'EWASTE'));

  const [openPanels, setOpenPanels] = useState({ general: true, hazardous: false, ewaste: false });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePanel = (panel) => setOpenPanels(p => ({ ...p, [panel]: !p[panel] }));

  function updateRow(rows, setRows, idx, field, value) {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: value };
    setRows(next);
  }

  function collectLineItems() {
    return [...generalRows, ...hazardousRows, ...ewasteRows]
      .filter(r => r.weight_kg !== '' && Number(r.weight_kg) > 0)
      .map(r => ({
        waste_type: r.waste_type,
        category: r.category,
        pallet_qty: r.pallet_qty !== '' ? Number(r.pallet_qty) : null,
        weight_kg: Number(r.weight_kg),
        remarks: r.remarks || null,
      }));
  }

  async function handleSave() {
    setError('');
    const line_items = collectLineItems();
    if (!line_items.length) { setError('Enter weight in at least one row.'); return; }
    setSaving(true);
    try {
      const decl = await createDeclaration({ ...header, line_items });
      navigate(`/declaration/${decl.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    setError('');
    const line_items = collectLineItems();
    if (!line_items.length) { setError('Enter weight in at least one row before submitting.'); return; }
    setSubmitting(true);
    try {
      const decl = await createDeclaration({ ...header, line_items });
      await submitDeclaration(decl.id);
      navigate(`/declaration/${decl.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Submit failed');
    } finally { setSubmitting(false); }
  }

  function WasteTable({ rows, setRows, title, panel }) {
    const hasData = rows.some(r => r.weight_kg !== '' && Number(r.weight_kg) > 0);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => togglePanel(panel)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{title}</span>
            {hasData && <span className="bg-nokia-blue text-white text-xs px-2 py-0.5 rounded-full">Has data</span>}
          </div>
          <span className="text-gray-400 text-xs">{openPanels[panel] ? '▲ Collapse' : '▼ Expand'}</span>
        </button>

        {openPanels[panel] && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-80">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-28">Pallet Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-28">Weight (kg)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.category} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                    <td className="px-3 py-2 text-xs text-gray-700">{row.category}</td>
                    <td className="px-3 py-1">
                      <input
                        type="number" min="0" step="0.001"
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-nokia-blue"
                        value={row.pallet_qty}
                        onChange={e => updateRow(rows, setRows, i, 'pallet_qty', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1">
                      <input
                        type="number" min="0" step="0.001"
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-nokia-blue"
                        value={row.weight_kg}
                        onChange={e => updateRow(rows, setRows, i, 'weight_kg', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1">
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-nokia-blue"
                        placeholder="Optional remarks"
                        value={row.remarks}
                        onChange={e => updateRow(rows, setRows, i, 'remarks', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Scrap Declaration</h1>
          <p className="text-sm text-gray-500">Fill in all relevant waste categories and submit for approval.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Header section */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Declaration Header</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Shift *</label>
              <select className="form-select" value={header.shift} onChange={e => setHeader(h => ({ ...h, shift: e.target.value }))}>
                {['A', 'B', 'C', 'G'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Time *</label>
              <input type="time" className="form-input" value={header.time} onChange={e => setHeader(h => ({ ...h, time: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Zone *</label>
              <input type="text" className="form-input" placeholder="e.g. ZONE-A" value={header.zone} onChange={e => setHeader(h => ({ ...h, zone: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Production Function *</label>
              <select className="form-select" value={header.production_function} onChange={e => setHeader(h => ({ ...h, production_function: e.target.value }))}>
                {PRODUCTION_FUNCTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Source (auto)</label>
              <input type="text" className="form-input bg-gray-50" readOnly value={sourceFromFunction(header.production_function)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <input type="text" className="form-input" placeholder="Brief description of waste" value={header.description} onChange={e => setHeader(h => ({ ...h, description: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Reference No.</label>
              <input type="text" className="form-input" placeholder="Internal reference" value={header.reference_no} onChange={e => setHeader(h => ({ ...h, reference_no: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Line item tables */}
        <WasteTable rows={generalRows} setRows={setGeneralRows} title="General Waste" panel="general" />
        <WasteTable rows={hazardousRows} setRows={setHazardousRows} title="Hazardous Waste" panel="hazardous" />
        <WasteTable rows={ewasteRows} setRows={setEwasteRows} title="E-Waste" panel="ewaste" />

        {/* Approval chain preview */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Approval Chain</h2>
          <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
            {['Declared By', 'Zone Manager', 'Dept Head', 'IREP', 'Security', 'Completed'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-xs font-medium">{step}</span>
                {i < arr.length - 1 && <span className="text-gray-300">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button onClick={handleSave} disabled={saving || submitting} className="btn-secondary">
            {saving ? 'Saving…' : 'Save as Draft'}
          </button>
          <button onClick={handleSubmit} disabled={saving || submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
