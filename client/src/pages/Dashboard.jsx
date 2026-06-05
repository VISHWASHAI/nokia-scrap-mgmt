import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import MetricCard from '../components/MetricCard.jsx';
import WasteBarChart from '../components/WasteBarChart.jsx';
import TrendChart from '../components/TrendChart.jsx';
import DonutChart from '../components/DonutChart.jsx';
import { useSummary, useTrends, useCircularity, useLedgerData } from '../hooks/useDashboard.js';
import { fmtNum } from '../utils/formatters.js';
import { today, weekAgo } from '../utils/dateHelpers.js';

export default function Dashboard() {
  const { data: summary, loading: sumLoading } = useSummary();
  const { data: trends, loading: trendLoading } = useTrends(30);
  const { data: circularity, loading: circLoading } = useCircularity();

  const [dateFrom, setDateFrom] = useState(weekAgo());
  const [dateTo, setDateTo] = useState(today());
  const [source, setSource] = useState('ALL');

  const { data: ledger, loading: ledgerLoading } = useLedgerData({
    date_from: dateFrom,
    date_to: dateTo,
    source: source === 'ALL' ? undefined : source,
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-screen-xl mx-auto">

        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-subtitle">Real-time scrap & waste overview · Nokia Manufacturing</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-nokia-muted bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-card">
            <span className="w-2 h-2 rounded-full bg-nokia-green animate-pulse" />
            Live data
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Total Waste Today"
            value={fmtNum(summary?.today_total_kg ?? 0)}
            unit="kg"
            accent="blue"
            loading={sumLoading}
            icon="⚖️"
            subtitle="Across all categories"
          />
          <MetricCard
            title="This Week"
            value={fmtNum(summary?.week_total_kg ?? 0)}
            unit="kg"
            accent="teal"
            loading={sumLoading}
            icon="📅"
            subtitle="Last 7 days total"
          />
          <MetricCard
            title="Pending Approvals"
            value={summary?.pending_approvals ?? 0}
            accent="orange"
            loading={sumLoading}
            icon="⏳"
            subtitle="Awaiting action"
          />
          <MetricCard
            title="Active Declarations"
            value={summary?.active_declarations ?? 0}
            accent="green"
            loading={sumLoading}
            icon="📋"
            subtitle="In approval flow"
          />
        </div>

        {/* Bar chart */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Waste by Category</h2>
              <p className="text-xs text-nokia-muted mt-0.5">BAT vs SOFT production — grouped by material</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date" className="form-input w-auto text-xs py-1.5"
                value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date" className="form-input w-auto text-xs py-1.5"
                value={dateTo} onChange={e => setDateTo(e.target.value)}
              />
              <select
                className="form-select w-auto text-xs py-1.5"
                value={source} onChange={e => setSource(e.target.value)}
              >
                <option value="ALL">All Sources</option>
                <option value="BAT">BAT only</option>
                <option value="SOFT">SOFT only</option>
              </select>
            </div>
          </div>
          <WasteBarChart data={ledger?.by_category} loading={ledgerLoading} />
        </div>

        {/* Trend + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="card lg:col-span-3">
            <h2 className="font-semibold text-gray-900 mb-1">30-Day Trend</h2>
            <p className="text-xs text-nokia-muted mb-4">Daily waste generation — BAT vs SOFT</p>
            <TrendChart data={trends} loading={trendLoading} />
          </div>
          <div className="card lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-1">By Waste Type</h2>
            <p className="text-xs text-nokia-muted mb-4">Distribution this week</p>
            <DonutChart data={circularity?.by_type} loading={circLoading} />
          </div>
        </div>

        {/* Circularity table */}
        <div className="card">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Weekly Circularity Matrix</h2>
            <p className="text-xs text-nokia-muted mt-0.5">Waste per category × type this week</p>
          </div>
          {circLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-header rounded-tl-lg">Category</th>
                    <th className="table-header">General (kg)</th>
                    <th className="table-header">Hazardous (kg)</th>
                    <th className="table-header rounded-tr-lg">E-Waste (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(circularity?.by_function || []).map((row, i) => (
                    <tr key={row.category} className={i % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}>
                      <td className="table-cell font-medium text-gray-900">{row.category}</td>
                      <td className="table-cell text-nokia-blue font-medium">{Number(row.GENERAL ?? 0).toFixed(3)}</td>
                      <td className="table-cell text-orange-600 font-medium">{Number(row.HAZARDOUS ?? 0).toFixed(3)}</td>
                      <td className="table-cell text-nokia-teal font-medium">{Number(row.EWASTE ?? 0).toFixed(3)}</td>
                    </tr>
                  ))}
                  {!circularity?.by_function?.length && (
                    <tr>
                      <td colSpan={4} className="table-cell text-center text-gray-400 py-8">
                        No waste data recorded this week yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
