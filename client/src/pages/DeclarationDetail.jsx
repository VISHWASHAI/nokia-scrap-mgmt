import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ApprovalChain from '../components/ApprovalChain.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { useDeclaration } from '../hooks/useDeclarations.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { approveDeclaration, submitDeclaration, downloadExcel } from '../services/declarations.js';
import { hasMinRole } from '../constants/roles.js';
import { formatDate, formatDateTime } from '../utils/dateHelpers.js';
import { fmtKg } from '../utils/formatters.js';
import { useState } from 'react';

const APPROVER_FOR = {
  SUBMITTED: ['ZONE_MANAGER', 'DEPT_HEAD', 'FACILITY_MANAGER', 'ADMIN'],
  ZONE_APPROVED: ['DEPT_HEAD', 'FACILITY_MANAGER', 'ADMIN'],
  DEPT_APPROVED: ['FACILITY_MANAGER', 'ADMIN'],
  IREP_AUTHORIZED: ['FACILITY_MANAGER', 'ADMIN'],
  SECURITY_AUTHORIZED: ['FACILITY_MANAGER', 'ADMIN'],
};

export default function DeclarationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: decl, loading, error, refetch } = useDeclaration(id);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canSubmit = decl?.status === 'DRAFT' && decl?.employee_id === user?.id;
  const canApprove = decl && (APPROVER_FOR[decl.status] || []).includes(user?.role);

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
      a.download = `Nokia_Scrap_Report.xlsx`;
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
            <h1 className="text-xl font-bold font-mono text-gray-900">{decl.declaration_no}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(decl.date)} · Shift {decl.shift} · {decl.time}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          <div><p className="text-gray-500 text-xs">Function</p><p className="font-medium">{decl.production_function}</p></div>
          <div><p className="text-gray-500 text-xs">Source</p><p className={`font-semibold ${decl.source === 'BAT' ? 'text-nokia-blue' : 'text-nokia-teal'}`}>{decl.source}</p></div>
          <div><p className="text-gray-500 text-xs">Reference No</p><p className="font-medium">{decl.reference_no || '—'}</p></div>
          <div><p className="text-gray-500 text-xs">Total Weight</p><p className="font-semibold text-nokia-blue">{fmtKg(totalWeight)}</p></div>
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
        {(canSubmit || canApprove) && (
          <div className="flex gap-3 justify-end">
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
