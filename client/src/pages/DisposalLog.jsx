import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { parseDisposalInvoice, createDisposalInvoice, getDisposalInvoices, getDisposalStock } from '../services/disposals.js';
import { ALL_CATEGORIES } from '../constants/wasteCategories.js';
import { formatDate, formatDateTime } from '../utils/dateHelpers.js';
import { fmtKg } from '../utils/formatters.js';

export default function DisposalLog() {
  const fileRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [draft, setDraft] = useState(null); // { header, items } pending confirmation
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  async function fetchInvoices() {
    setLoading(true);
    try {
      const result = await getDisposalInvoices({ limit: 50 });
      setInvoices(result.items || []);
    } catch (err) {
      setListError(err.response?.data?.error?.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchInvoices(); }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(''); setSaveError(''); setDraft(null);
    setParsing(true);
    try {
      const result = await parseDisposalInvoice(file);
      setDraft(result);
    } catch (err) {
      setParseError(err.response?.data?.error?.message || 'Could not parse PDF');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function setItemFields(idx, fields) {
    setDraft(d => {
      const items = [...d.items];
      items[idx] = { ...items[idx], ...fields };
      return { ...d, items };
    });
  }
  function setItem(idx, key, value) {
    setItemFields(idx, { [key]: value });
  }
  function setHeader(key, value) {
    setDraft(d => ({ ...d, header: { ...d.header, [key]: value } }));
  }

  // Re-fetch the live available stock for a row whenever its category or the invoice date changes.
  async function refreshStock(idx, category, date) {
    if (!category || !date) {
      setItemFields(idx, { available_stock: null, opening_stock: null, waste_for_day: null, _stockLoading: false });
      return;
    }
    setItemFields(idx, { _stockLoading: true });
    try {
      const s = await getDisposalStock(category, date);
      setItemFields(idx, {
        available_stock: s.available, opening_stock: s.opening, waste_for_day: s.waste,
        waste_type: s.waste_type ?? undefined, stock_source: s.source, _stockLoading: false,
      });
    } catch {
      setItemFields(idx, { _stockLoading: false });
    }
  }

  function handleCategoryChange(idx, category) {
    setItem(idx, 'category', category);
    refreshStock(idx, category, draft.header.invoice_date);
  }

  function handleDateChange(date) {
    setHeader('invoice_date', date);
    draft.items.forEach((it, idx) => { if (it.category) refreshStock(idx, it.category, date); });
  }

  async function handleSave() {
    setSaveError('');
    const unmatched = draft.items.filter(i => !i.category);
    if (unmatched.length) {
      setSaveError(`Assign a category for: ${unmatched.map(i => i.material_description).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft.header,
        items: draft.items.map(i => ({
          material_description: i.material_description,
          category: i.category,
          waste_type: i.waste_type || undefined,
          qty_kg: Number(i.qty_kg),
          unit_price: i.unit_price != null ? Number(i.unit_price) : null,
        })),
      };
      await createDisposalInvoice(payload);
      setDraft(null);
      fetchInvoices();
    } catch (err) {
      setSaveError(err.response?.data?.error?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  const draftTotal = draft?.items.reduce((s, i) => s + Number(i.qty_kg || 0), 0) ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Record Disposal</h1>
          <p className="page-subtitle">Upload a vendor pickup tax invoice (PDF) to subtract the dispatched scrap from stock.</p>
        </div>

        {/* Upload */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Upload Invoice PDF</h2>
          {parseError && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded p-3">{parseError}</div>}
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              disabled={parsing}
              className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-nokia-blue file:text-white hover:file:bg-blue-700 file:cursor-pointer"
            />
            {parsing && <span className="text-sm text-gray-500">Parsing…</span>}
          </div>
        </div>

        {/* Parsed preview */}
        {draft && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Review &amp; Confirm</h2>
            {draft.header.ocr && (
              <div className="text-amber-800 text-sm mb-3 bg-amber-50 border border-amber-300 rounded p-3">
                📸 This was a scanned PDF read via OCR — please double-check every field (especially the date and quantities) before confirming.
              </div>
            )}
            {saveError && (
              <div className="text-red-700 text-sm mb-3 bg-red-50 border border-red-300 rounded p-3">
                <p className="font-semibold mb-0.5">⚠ Disposal not possible</p>
                <p>{saveError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div><label className="form-label">Invoice No.</label><input className="form-input" value={draft.header.invoice_no || ''} onChange={e => setHeader('invoice_no', e.target.value)} /></div>
              <div><label className="form-label">Invoice Date</label><input type="date" className="form-input" value={draft.header.invoice_date || ''} onChange={e => handleDateChange(e.target.value)} /></div>
              <div><label className="form-label">Vendor</label><input className="form-input" value={draft.header.vendor_name || ''} onChange={e => setHeader('vendor_name', e.target.value)} /></div>
              <div><label className="form-label">GSTIN</label><input className="form-input" value={draft.header.vendor_gstin || ''} onChange={e => setHeader('vendor_gstin', e.target.value)} /></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr>
                    <th className="table-header">Material (from invoice)</th>
                    <th className="table-header">Matched Category</th>
                    <th className="table-header">Qty (kg)</th>
                    <th className="table-header">In Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((it, i) => {
                    const short = it.available_stock != null && Number(it.qty_kg) > it.available_stock;
                    return (
                      <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="table-cell">{it.material_description}</td>
                        <td className="table-cell">
                          <select
                            className={`form-select text-xs py-1 ${!it.category ? 'border-red-300 text-red-600' : ''}`}
                            value={it.category || ''}
                            onChange={e => handleCategoryChange(i, e.target.value || null)}
                          >
                            <option value="">— select —</option>
                            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {it.match_confidence != null && it.category && (
                            <span className="ml-2 text-[11px] text-gray-400">{Math.round(it.match_confidence * 100)}% match</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <input type="number" step="0.001" className={`form-input text-xs py-1 w-28 ${short ? 'border-amber-400 text-amber-700' : ''}`} value={it.qty_kg} onChange={e => setItem(i, 'qty_kg', e.target.value)} />
                        </td>
                        <td className="table-cell">
                          {it._stockLoading ? (
                            <span className="text-gray-400 text-xs">checking…</span>
                          ) : it.available_stock == null ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <span className={short ? 'text-amber-700 font-semibold' : 'text-gray-600'}>
                              {fmtKg(it.available_stock)}{short && ' ⚠'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="table-cell text-right" colSpan={2}>Total to subtract</td>
                    <td className="table-cell">{fmtKg(draftTotal)}</td>
                    <td className="table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setDraft(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Recording…' : 'Confirm & Subtract from Stock'}
              </button>
            </div>
          </div>
        )}

        {/* Recorded disposals */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Recorded Disposals</h2>
          {listError && <ErrorAlert message={listError} onRetry={fetchInvoices} />}
          {loading ? <LoadingSpinner /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {['Invoice No.', 'Date', 'Vendor', 'Materials', 'Total Qty', 'Recorded By', 'Recorded At'].map(h => <th key={h} className="table-header">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    const total = (inv.items || []).reduce((s, it) => s + Number(it.qty_kg || 0), 0);
                    return (
                      <tr key={inv.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="table-cell font-mono text-xs">{inv.invoice_no}</td>
                        <td className="table-cell">{formatDate(inv.invoice_date)}</td>
                        <td className="table-cell font-medium">{inv.vendor_name}</td>
                        <td className="table-cell text-xs text-gray-600">{(inv.items || []).map(it => it.category).join(', ')}</td>
                        <td className="table-cell">{fmtKg(total)}</td>
                        <td className="table-cell">{inv.creator?.name || '—'}</td>
                        <td className="table-cell text-xs text-gray-500">{formatDateTime(inv.created_at)}</td>
                      </tr>
                    );
                  })}
                  {!invoices.length && <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No disposals recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
