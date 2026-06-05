import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { useExportLog } from '../hooks/useLiveExcel.js';
import { pushToOneDrive } from '../services/liveExcel.js';
import { formatDateTime } from '../utils/dateHelpers.js';

// Power Query endpoints use port 4000 (the API server), not the React dev server
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api/v1'
  : window.location.origin + '/api/v1';

const ENDPOINTS = [
  { key: 'ledger', label: 'Ledger', url: `${API_BASE}/live/ledger`, desc: 'Full generation & disposal ledger' },
  { key: 'declarations', label: 'Declarations', url: `${API_BASE}/live/declarations`, desc: 'All declarations with totals' },
  { key: 'summary', label: 'Summary', url: `${API_BASE}/live/summary`, desc: 'Daily & weekly KPI summary' },
  { key: 'vendor-pickups', label: 'Vendor Pickups', url: `${API_BASE}/live/vendor-pickups`, desc: 'Vendor pickup log' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={copy} className="text-xs bg-nokia-blue/10 hover:bg-nokia-blue/20 text-nokia-blue px-2 py-1 rounded transition-colors ml-2 flex-shrink-0">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function StatusDot({ status }) {
  const isOk = status === 'SUCCESS';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}

function OneDriveSetupGuide() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-amber-500 text-xl mt-0.5">⚠</span>
        <div>
          <p className="font-semibold text-amber-900">Microsoft Graph API not configured</p>
          <p className="text-sm text-amber-800 mt-1">
            OneDrive auto-upload requires Microsoft Azure app credentials. Add them to <code className="bg-amber-100 px-1 rounded">server/.env</code> and restart the server.
          </p>
        </div>
      </div>

      <div className="bg-white border border-amber-200 rounded-lg p-4 text-sm space-y-2">
        <p className="font-semibold text-gray-800">Steps to set up:</p>
        <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
          <li>Go to <strong>portal.azure.com</strong> → Azure Active Directory → App registrations → New registration</li>
          <li>Name it "Nokia Scrap App", choose <em>Accounts in this org only</em>, click Register</li>
          <li>Note the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong></li>
          <li>Go to Certificates & secrets → New client secret → copy the <strong>Value</strong></li>
          <li>Go to API permissions → Add → Microsoft Graph → Application → <code>Files.ReadWrite.All</code>, <code>Sites.ReadWrite.All</code> → Grant admin consent</li>
          <li>Find your SharePoint site ID and drive ID via: <code>GET https://graph.microsoft.com/v1.0/sites?search=nokia</code></li>
        </ol>

        <p className="font-semibold text-gray-800 mt-3">Then add to <code>server/.env</code>:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto font-mono">{`GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_SHAREPOINT_SITE_ID=your-site-id
GRAPH_DRIVE_ID=your-drive-id
GRAPH_FOLDER_PATH=/Nokia Scrap Reports`}</pre>

        <p className="text-xs text-gray-500 mt-2">
          Without OneDrive, the system works fully — declarations, approvals, dashboard, and Excel download all work. OneDrive is an optional auto-sync feature.
        </p>
      </div>
    </div>
  );
}

export default function LiveExcel() {
  const { data: exportLog, loading: logLoading, error: logError, refetch: refetchLog } = useExportLog();
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [pushError, setPushError] = useState('');

  const latestExport = exportLog?.items?.[0];
  const graphNotConfigured = latestExport?.error_message?.includes('not configured') ||
    (latestExport?.status === 'FAILED' && latestExport?.error_message?.includes('GRAPH_'));

  async function handlePush() {
    setPushError('');
    setPushResult(null);
    setPushing(true);
    try {
      const result = await pushToOneDrive();
      if (!result.fileId && !result.shareUrl) {
        setPushError('Upload failed — Microsoft Graph credentials are not configured in server/.env. See setup guide below.');
      } else {
        setPushResult(result);
      }
      refetchLog();
    } catch (err) {
      setPushError(err.response?.data?.error?.message || 'Push failed');
    } finally { setPushing(false); }
  }

  const showSetupGuide = !logLoading && (
    graphNotConfigured ||
    (exportLog?.items?.length === 0) ||
    exportLog?.items?.every(i => i.status === 'FAILED')
  );

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Excel Connection</h1>
          <p className="text-sm text-gray-500">Connect Excel via Power Query or push the latest report to OneDrive.</p>
        </div>

        {/* Section 1 — Power Query endpoints */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Power Query Endpoints</h2>
          <p className="text-xs text-gray-500 mb-4">Use these URLs in Excel → Data → Get Data → From Web (Advanced mode). Add the Authorization header with your Bearer token.</p>

          <div className="space-y-3">
            {ENDPOINTS.map(ep => (
              <div key={ep.key} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900">{ep.label}</p>
                    <p className="text-xs text-gray-500 truncate font-mono">{ep.url}</p>
                    <p className="text-xs text-gray-400">{ep.desc}</p>
                  </div>
                </div>
                <CopyButton text={ep.url} />
              </div>
            ))}
          </div>

          {/* Excel step-by-step */}
          <div className="mt-5 border-t border-gray-100 pt-5">
            <h3 className="font-medium text-sm text-gray-900 mb-3">How to connect in Excel (step by step)</h3>
            <ol className="space-y-2">
              {[
                <>Open Excel → <strong>Data</strong> tab → <strong>Get Data</strong> → <strong>From Other Sources</strong> → <strong>From Web</strong></>,
                <>Select <strong>Advanced</strong> radio button</>,
                <>In <strong>URL parts</strong>, paste the endpoint URL above (use port 4000, not 5173)</>,
                <>In <strong>HTTP request header parameters</strong>: left box type <code className="bg-gray-100 px-1 rounded">Authorization</code>, right box paste <code className="bg-gray-100 px-1 rounded">Bearer &lt;your-token&gt;</code></>,
                <>Click <strong>Add header</strong> if you need to add it, then click <strong>OK</strong></>,
                <>Power Query Editor opens — click <strong>Close &amp; Load</strong> to sheet</>,
                <>To auto-refresh: right-click the query → <strong>Properties</strong> → set Refresh interval</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-nokia-blue text-white text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>Get your token:</strong> Run in PowerShell:
              <pre className="mt-1 font-mono bg-blue-100 rounded p-2 text-xs overflow-x-auto">{`$r = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body '{"emp_no":"EMP001","password":"nokia@123"}' -ContentType "application/json"
Write-Host "Bearer $($r.data.access_token)"`}</pre>
              Token is valid for 8 hours. Full guide: <a href="http://localhost:4000/powerquery-setup" target="_blank" rel="noreferrer" className="underline font-medium">localhost:4000/powerquery-setup</a>
            </div>
          </div>
        </div>

        {/* Section 2 — OneDrive */}
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">OneDrive / SharePoint Auto-Export</h2>
              <p className="text-sm text-gray-500 mt-0.5">Auto-uploads when a declaration completes. Requires Microsoft Graph API credentials.</p>
            </div>
            <button onClick={handlePush} disabled={pushing} className="btn-primary text-sm">
              {pushing ? 'Uploading…' : '↑ Push to OneDrive Now'}
            </button>
          </div>

          {pushError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3 mb-4">
              {pushError}
            </div>
          )}

          {pushResult?.shareUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
              ✓ Uploaded!&nbsp;
              <a href={pushResult.shareUrl} target="_blank" rel="noreferrer" className="underline font-medium">
                Open in Excel Online →
              </a>
            </div>
          )}

          {/* Setup guide shown when Graph isn't configured */}
          {showSetupGuide && <OneDriveSetupGuide />}

          {/* Latest export */}
          {latestExport && !showSetupGuide && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
              <p className="text-gray-500 text-xs mb-1">Latest Export</p>
              <p className="font-medium">{latestExport.filename || 'Nokia_Scrap_Report.xlsx'}</p>
              <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(latestExport.created_at)}</p>
              <div className="flex items-center gap-3 mt-2">
                <StatusDot status={latestExport.status} />
                {latestExport.onedrive_url && (
                  <a href={latestExport.onedrive_url} target="_blank" rel="noreferrer" className="text-nokia-blue text-xs underline">
                    Open in Excel Online →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Export log table */}
          {!showSetupGuide && (
            <>
              <h3 className="font-medium text-sm text-gray-900 mb-3 mt-4">Export History</h3>
              {logLoading ? <LoadingSpinner /> : logError ? <ErrorAlert message={logError} onRetry={refetchLog} /> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        {['Triggered By', 'Timestamp', 'Filename', 'Status', 'Link'].map(h => <th key={h} className="table-header">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(exportLog?.items || []).map((row, i) => (
                        <tr key={row.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="table-cell text-xs font-medium">{row.triggered_by.replace(/_/g, ' ')}</td>
                          <td className="table-cell text-xs">{formatDateTime(row.created_at)}</td>
                          <td className="table-cell text-xs font-mono">{row.filename || '—'}</td>
                          <td className="table-cell"><StatusDot status={row.status} /></td>
                          <td className="table-cell">
                            {row.onedrive_url
                              ? <a href={row.onedrive_url} target="_blank" rel="noreferrer" className="text-nokia-blue text-xs underline">Open →</a>
                              : '—'}
                          </td>
                        </tr>
                      ))}
                      {!exportLog?.items?.length && <tr><td colSpan={5} className="table-cell text-center text-gray-400">No exports yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
