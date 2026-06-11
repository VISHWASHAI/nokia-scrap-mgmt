import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Layout from '../components/Layout.jsx';
import ApprovalChain from '../components/ApprovalChain.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { useDeclaration } from '../hooks/useDeclarations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { approveDeclaration, submitDeclaration, deleteDeclaration, updateStorageLocation, downloadExcel } from '../services/declarations.js';
import { PRODUCTION_FUNCTION_LABELS } from '../constants/productionFunctions.js';
import { DISPOSAL_ROUTE_LABELS } from '../constants/disposalRoute.js';
import { STORAGE_LOCATIONS, STORAGE_LOCATION_LABELS } from '../constants/storageLocations.js';
import { hasMinRole } from '../constants/roles.js';
import { formatDate, formatDateTime } from '../utils/dateHelpers.js';
import { fmtKg } from '../utils/formatters.js';
import { useState, useEffect } from 'react';

const APPROVER_FOR = {
  SUBMITTED:          ['ZONE_MANAGER', 'DEPT_HEAD', 'IREP', 'SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  ZONE_APPROVED:      ['DEPT_HEAD', 'IREP', 'SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  DEPT_APPROVED:      ['IREP', 'FACILITY_MANAGER', 'ADMIN'],
  IREP_AUTHORIZED:    ['SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  SECURITY_AUTHORIZED:['FACILITY_MANAGER', 'ADMIN'],
};

export default function DeclarationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: decl, loading, error, refetch } = useDeclaration(id);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canEdit    = decl?.status === 'DRAFT' && (decl?.employee_id === user?.id || user?.role === 'ADMIN');
  const canSubmit  = canEdit;
  const canApprove = decl && (APPROVER_FOR[decl.status] || []).includes(user?.role);
  const canDelete  = decl && (decl.employee_id === user?.id || user?.role === 'ADMIN');
  const canSetStorage = ['IREP', 'ADMIN'].includes(user?.role);

  const [storageEdit, setStorageEdit] = useState('');
  const [storageSaving, setStorageSaving] = useState(false);

  useEffect(() => {
    if (!decl) return;
    setStorageEdit(decl.storage_location || '');
  }, [decl]);

  async function handleSaveStorageLocation() {
    setActionError('');
    setStorageSaving(true);
    try {
      await updateStorageLocation(decl.id, storageEdit || null);
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to save storage location');
    } finally { setStorageSaving(false); }
  }

  async function handleApprove() {
    setActionError('');
    setActionLoading(true);
    try {
      await approveDeclaration(decl.id);
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Approval failed');
    } finally { setActionLoading(false); }
  }

  async function handleDelete() {
    const warning = decl.status === 'COMPLETED'
      ? `Delete declaration ${decl.declaration_no}? This is COMPLETED and its ledger entries will also be removed. This cannot be undone.`
      : `Delete declaration ${decl.declaration_no}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    setActionError('');
    setActionLoading(true);
    try {
      await deleteDeclaration(decl.id);
      navigate('/submissions');
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Delete failed');
      setActionLoading(false);
    }
  }

  async function handleSubmitAction() {
    setActionError('');
    setActionLoading(true);
    try {
      await submitDeclaration(decl.id);
      refetch();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Submit failed');
    } finally { setActionLoading(false); }
  }

  async function handleDownload() {
    try {
      const blob = await downloadExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nokia_Scrap_Report_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError('Download failed');
    }
  }

  if (loading) return <Layout><LoadingSpinner /></Layout>;
  if (error) return <Layout><ErrorAlert message={error} onRetry={refetch} /></Layout>;
  if (!decl) return null;

  const totalWeight = decl.line_items?.reduce((s, li) => s + Number(li.weight_kg ?? 0), 0) ?? 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold font-mono text-white">{decl.declaration_no}</h1>
            <p className="text-sm text-white/60 mt-0.5">
              {formatDate(decl.date)} · Shift {decl.shift} · {decl.time}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={decl.status} />
            {hasMinRole(user?.role, 'ZONE_MANAGER') && (
              <button onClick={handleDownload} className="btn-secondary text-xs">⬇ Excel</button>
            )}
          </div>
        </div>

        {actionError && <ErrorAlert message={actionError} />}

        {/* Info card */}
        <div className="card grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-500 text-xs">Declared By</p><p className="font-medium">{decl.employee?.name} ({decl.employee?.emp_no})</p></div>
          <div><p className="text-gray-500 text-xs">Zone</p><p className="font-medium">{decl.zone}</p></div>
          <div><p className="text-gray-500 text-xs">Function</p><p className="font-medium">{PRODUCTION_FUNCTION_LABELS[decl.production_function] || decl.production_function}</p></div>
          <div><p className="text-gray-500 text-xs">Source</p><p className={`font-semibold ${decl.source === 'BAT' ? 'text-nokia-blue' : 'text-nokia-teal'}`}>{decl.source}</p></div>
          <div><p className="text-gray-500 text-xs">Reference No</p><p className="font-medium">{decl.reference_no || '—'}</p></div>
          <div><p className="text-gray-500 text-xs">Disposal Route</p><p className={`font-semibold ${decl.disposal_route === 'AUTHORIZED_AGENCY' ? 'text-amber-600' : 'text-emerald-600'}`}>{DISPOSAL_ROUTE_LABELS[decl.disposal_route] || '—'}</p></div>
          <div><p className="text-gray-500 text-xs">Total Weight</p><p className="font-semibold text-nokia-blue">{fmtKg(totalWeight)}</p></div>
          <div>
            <p className="text-gray-500 text-xs">Storage Location</p>
            {canSetStorage ? (
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  className="form-select text-xs py-1 w-auto"
                  value={storageEdit}
                  onChange={e => setStorageEdit(e.target.value)}
                >
                  <option value="">—</option>
                  {STORAGE_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{STORAGE_LOCATION_LABELS[loc]}</option>
                  ))}
                </select>
                {storageEdit !== (decl.storage_location || '') && (
                  <button onClick={handleSaveStorageLocation} disabled={storageSaving} className="btn-secondary text-xs">
                    {storageSaving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            ) : (
              <p className="font-medium">{STORAGE_LOCATION_LABELS[decl.storage_location] || '—'}</p>
            )}
          </div>
          {decl.description && <div className="col-span-full"><p className="text-gray-500 text-xs">Description</p><p className="font-medium">{decl.description}</p></div>}
        </div>

        {/* Approval chain */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Approval Chain</h2>
          <ApprovalChain declaration={decl} />
        </div>

        {/* Line items */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Line Items</h2>
          {['GENERAL', 'HAZARDOUS', 'EWASTE'].map(wt => {
            const rows = decl.line_items?.filter(li => li.waste_type === wt) ?? [];
            if (!rows.length) return null;
            return (
              <div key={wt} className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{wt}</h3>
                <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr>
                      <th className="table-header">Category</th>
                      <th className="table-header">Pallets</th>
                      <th className="table-header">Weight (kg)</th>
                      <th className="table-header">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((li, i) => (
                      <tr key={li.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="table-cell">{li.category}</td>
                        <td className="table-cell">{li.pallet_qty ?? '—'}</td>
                        <td className="table-cell font-medium">{li.weight_kg ?? '—'}</td>
                        <td className="table-cell text-gray-500">{li.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {(canEdit || canSubmit || canApprove || canDelete) && (
          <div className="flex gap-3 justify-end">
            {canEdit && (
              <button onClick={() => navigate(`/declaration/${id}/edit`)} className="btn-secondary">
                ✏ Edit Draft
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} disabled={actionLoading} className="btn-secondary text-red-600 hover:bg-red-50 border-red-200">
                🗑 Delete
              </button>
            )}
            {canSubmit && (
              <button onClick={handleSubmitAction} disabled={actionLoading} className="btn-primary">
                {actionLoading ? 'Submitting…' : 'Submit for Approval'}
              </button>
            )}
            {canApprove && (
              <button onClick={handleApprove} disabled={actionLoading} className="btn-primary">
                {actionLoading ? 'Processing…' : `Approve → ${
                  { SUBMITTED: 'Zone Approve', ZONE_APPROVED: 'Dept Approve', DEPT_APPROVED: 'IREP Authorize', IREP_AUTHORIZED: 'Security Authorize', SECURITY_AUTHORIZED: 'Complete' }[decl.status]
                }`}
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
