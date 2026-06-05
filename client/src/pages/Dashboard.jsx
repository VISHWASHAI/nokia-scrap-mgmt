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

  const { data: ledger, loading: ledgerLoading } = useLedgerData({ date_from: dateFrom, date_to: dateTo, source: source === 'ALL' ? undefined : source });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Scrap & waste overview for Nokia manufacturing facility</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Waste Today"
            value={sumLoading ? '—' : fmtNum(summary?.today_total_kg)}
            unit="kg"
            color="nokia-blue"
            loading={sumLoading}
          />
          <MetricCard
            title="This Week"
            value={sumLoading ? '—' : fmtNum(summary?.week_total_kg)}
            unit="kg"
            color="nokia-teal"
            loading={sumLoading}
          />
          <MetricCard
            title="Pending Approvals"
            value={sumLoading ? '—' : summary?.pending_approvals ?? 0}
            color="orange"
            loading={sumLoading}
          />
          <MetricCard
            title="Active Declarations"
            value={sumLoading ? '—' : summary?.active_declarations ?? 0}
            color="green"
            loading={sumLoading}
          />
        </div>

        {/* Bar chart with filters */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">Waste by Category</h2>
            <div className="flex gap-2 flex-wrap">
              <input type="date" className="form-input w-auto text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" className="form-input w-auto text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              <select className="form-select w-auto text-xs" value={source} onChange={e => setSource(e.target.value)}>
                <option value="ALL">All Sources</option>
                <option value="BAT">BAT</option>
                <option value="SOFT">SOFT</option>
              </select>
            </div>
          </div>
          <WasteBarChart data={ledger?.by_category} loading={ledgerLoading} />
        </div>

        {/* Trend + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">30-Day Trend</h2>
            <TrendChart data={trends} loading={trendLoading} />
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">By Waste Type (This Week)</h2>
            <DonutChart data={circularity?.by_type} loading={circLoading} />
          </div>
        </div>

        {/* Circularity table */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Circularity by Category</h2>
          {circLoading ? (
            <div className="h-40 bg-gray-50 rounded animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
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
                    <tr key={row.category} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="table-cell font-medium">{row.category}</td>
                      <td className="table-cell">{Number(row.GENERAL ?? 0).toFixed(2)}</td>
                      <td className="table-cell">{Number(row.HAZARDOUS ?? 0).toFixed(2)}</td>
                      <td className="table-cell">{Number(row.EWASTE ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!circularity?.by_function?.length && (
                    <tr><td colSpan={4} className="table-cell text-center text-gray-400">No data this week</td></tr>
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
