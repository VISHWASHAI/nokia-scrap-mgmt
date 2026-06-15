import { useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { previewLedgerImport, commitLedgerImport } from '../services/ledgerImport.js';

const TYPE_BADGE = {
  GENERAL: 'bg-blue-100 text-blue-700',
  HAZARDOUS: 'bg-amber-100 text-amber-700',
  EWASTE: 'bg-green-100 text-green-700',
};

export default function LedgerImport() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('BAT');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function pickFile(e) {
    setError(''); setPreview(null); setResult(null);
    setFile(e.target.files?.[0] || null);
  }

  async function handlePreview() {
    if (!file) { setError('Choose an Excel file first.'); return; }
    setError(''); setResult(null); setLoading(true);
    try {
      setPreview(await previewLedgerImport(file));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not read the file');
    } finally { setLoading(false); }
  }

  async function handleCommit() {
    setError(''); setCommitting(true);
    try {
      const res = await commitLedgerImport(file, source);
      setResult(res);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Import failed');
    } finally { setCommitting(false); }
  }

  const totalRows = preview?.reduce((s, p) => s + p.row_count, 0) ?? 0;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="page-title">Import Ledger</h1>
          <p className="page-subtitle">Upload a monthly generation &amp; disposal sheet to load it straight into the ledger.</p>
        </div>

        {error && <div className="text-red-700 text-sm bg-red-50 border border-red-300 rounded p-3">{error}</div>}

        {result && (
          <div className="text-green-800 text-sm bg-green-50 border border-green-300 rounded p-3">
            ✓ Imported <strong>{result.written}</strong> ledger rows ({result.sheets.map(s => s.sheetName).join(', ')}) as <strong>{source}</strong>.
          </div>
        )}

        {/* Upload + source */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Upload Sheet</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="form-label">Excel file (.xlsx)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={pickFile}
                className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-nokia-blue file:text-white hover:file:bg-blue-700 file:cursor-pointer" />
            </div>
            <div>
              <label className="form-label">Source</label>
              <select className="form-select w-auto" value={source} onChange={e => setSource(e.target.value)}>
                <option value="BAT">BAT</option>
                <option value="SOFT">SOFT</option>
              </select>
            </div>
            <button onClick={handlePreview} disabled={loading || !file} className="btn-secondary">
              {loading ? 'Reading…' : 'Preview'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Reads every sheet (dates × materials × Opening/Waste/Disposal/Closing). Materials are imported as named in your sheet; waste type is auto-classified. Re-importing the same month updates existing rows.
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="card space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold text-gray-900">Review — {totalRows} rows across {preview.length} sheet(s)</h2>
              <button onClick={handleCommit} disabled={committing} className="btn-primary">
                {committing ? 'Importing…' : `Confirm Import as ${source}`}
              </button>
            </div>
            {preview.map(sheet => (
              <div key={sheet.sheetName} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-medium text-sm text-gray-900">{sheet.sheetName}</span>
                  <span className="text-xs text-gray-500">{sheet.date_from} → {sheet.date_to} · {sheet.row_count} rows · {sheet.materials.length} materials</span>
                </div>
                <div className="flex flex-wrap gap-2 p-3">
                  {sheet.materials.map((m, i) => (
                    <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${TYPE_BADGE[m.waste_type] || 'bg-gray-100 text-gray-600'}`}>
                      {m.category}
                      <span className="opacity-70">· {m.waste_type}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">Check the materials and their waste types above, then confirm to write them into the ledger.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
