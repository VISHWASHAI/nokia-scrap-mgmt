import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import Layout from '../components/Layout.jsx';
import MetricCard from '../components/MetricCard.jsx';
import WasteBarChart from '../components/WasteBarChart.jsx';
import MaterialBarChart from '../components/MaterialBarChart.jsx';
import TrendChart from '../components/TrendChart.jsx';
import DonutChart from '../components/DonutChart.jsx';
import { useSummary, useTrends, useCircularity, useLedgerData } from '../hooks/useDashboard.js';
import { fmtNum } from '../utils/formatters.js';
import { today, weekAgo } from '../utils/dateHelpers.js';
import MaterialSelect from '../components/MaterialSelect.jsx';
import {
  resolveCategories, materialLabel,
  GENERAL_WASTE_SUBGROUPS, HAZARDOUS_CATEGORIES, EWASTE_CATEGORIES, GROUP_PREFIX,
} from '../constants/wasteCategories.js';

const TREND_RANGES = [
  { label: '30 Days',  shortLabel: '30D', days: 30 },
  { label: '3 Months', shortLabel: '3M',  days: 90 },
  { label: '6 Months', shortLabel: '6M',  days: 180 },
  { label: '1 Year',   shortLabel: '1Y',  days: 365 },
];

export default function Dashboard() {
  const { data: summary, loading: sumLoading } = useSummary();
  const [material, setMaterial] = useState('');

  const [trendDays, setTrendDays] = useState(30);
  const { data: trends, loading: trendLoading } = useTrends(trendDays, material);
  const { data: circularity, loading: circLoading } = useCircularity();
  const trendRange = TREND_RANGES.find(r => r.days === trendDays) ?? TREND_RANGES[0];

  const [dateFrom, setDateFrom] = useState(weekAgo());
  const [dateTo, setDateTo] = useState(today());
  const [source, setSource] = useState('ALL');

  const { data: ledger, loading: ledgerLoading } = useLedgerData({
    date_from: dateFrom,
    date_to: dateTo,
    source: source === 'ALL' ? undefined : source,
  });

  // Resolved category list — works for both single categories and sub-group selections
  const resolvedCategories = useMemo(() => resolveCategories(material), [material]);
  const matLabel = materialLabel(material);

  // Daily BAT/SOFT breakdown for the chosen material/group, derived from raw ledger rows
  const materialChartData = useMemo(() => {
    if (!material || !ledger?.raw) return [];
    const byDate = {};
    ledger.raw
      .filter(l => resolvedCategories.includes(l.category))
      .forEach(l => {
        const d = dayjs(l.date).format('YYYY-MM-DD');
        if (!byDate[d]) byDate[d] = { date: d, BAT: 0, SOFT: 0 };
        byDate[d][l.source] = (byDate[d][l.source] || 0) + Number(l.waste_for_day);
      });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [material, ledger, resolvedCategories]);

  // BAT vs SOFT totals for the chosen material/group across the selected date range, for the donut
  const materialSourceSplit = useMemo(() => {
    if (!material || !ledger?.raw) return null;
    const totals = { BAT: 0, SOFT: 0 };
    ledger.raw
      .filter(l => resolvedCategories.includes(l.category))
      .forEach(l => { totals[l.source] = (totals[l.source] || 0) + Number(l.waste_for_day); });
    return totals;
  }, [material, ledger, resolvedCategories]);

  // No filter: aggregate by_category into sub-group totals for the top-level view
  const subgroupChartData = useMemo(() => {
    if (!ledger?.by_category) return [];
    const rows = ledger.by_category;
    const result = [];

    for (const [group, cats] of Object.entries(GENERAL_WASTE_SUBGROUPS)) {
      const matched = rows.filter(r => cats.includes(r.category));
      const BAT  = matched.reduce((s, r) => s + Number(r.BAT  || 0), 0);
      const SOFT = matched.reduce((s, r) => s + Number(r.SOFT || 0), 0);
      if (BAT > 0 || SOFT > 0) result.push({ category: group, BAT, SOFT });
    }

    const hazMatched = rows.filter(r => HAZARDOUS_CATEGORIES.includes(r.category));
    const hazBAT  = hazMatched.reduce((s, r) => s + Number(r.BAT  || 0), 0);
    const hazSOFT = hazMatched.reduce((s, r) => s + Number(r.SOFT || 0), 0);
    if (hazBAT > 0 || hazSOFT > 0) result.push({ category: 'Hazardous', BAT: hazBAT, SOFT: hazSOFT });

    const ewMatched = rows.filter(r => EWASTE_CATEGORIES.includes(r.category));
    const ewBAT  = ewMatched.reduce((s, r) => s + Number(r.BAT  || 0), 0);
    const ewSOFT = ewMatched.reduce((s, r) => s + Number(r.SOFT || 0), 0);
    if (ewBAT > 0 || ewSOFT > 0) result.push({ category: 'E-Waste', BAT: ewBAT, SOFT: ewSOFT });

    return result;
  }, [ledger]);

  // Group selected: show individual categories within that group (per-category bars, not timeline)
  const groupCategoryData = useMemo(() => {
    if (!material?.startsWith(GROUP_PREFIX) || !ledger?.by_category) return [];
    return ledger.by_category.filter(r => resolvedCategories.includes(r.category));
  }, [material, ledger, resolvedCategories]);

  const isGroup = material.startsWith(GROUP_PREFIX);

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 max-w-screen-xl mx-auto">

        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-subtitle hidden sm:block">Real-time scrap & waste overview · Nokia Manufacturing</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-nokia-green animate-pulse" />
            <span className="hidden sm:inline">Live data</span>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">
                {!material
                  ? 'Waste by Sub-division'
                  : isGroup
                    ? `${matLabel} — by Category`
                    : `Material Trend — ${matLabel}`}
              </h2>
              <p className="text-xs text-nokia-muted mt-0.5">
                {!material
                  ? 'BAT vs SOFT — grouped by sub-division'
                  : isGroup
                    ? `Individual categories within "${matLabel}"`
                    : `Daily BAT vs SOFT generation for "${matLabel}"`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input
                  type="date" className="form-input text-xs py-1.5 w-[130px] sm:w-auto"
                  value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date" className="form-input text-xs py-1.5 w-[130px] sm:w-auto"
                  value={dateTo} onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <select
                className="form-select w-auto text-xs py-1.5"
                value={source} onChange={e => setSource(e.target.value)}
              >
                <option value="ALL">All Sources</option>
                <option value="BAT">BAT only</option>
                <option value="SOFT">SOFT only</option>
              </select>
              <MaterialSelect value={material} onChange={setMaterial} />
              {material && (
                <button onClick={() => setMaterial('')} className="btn-secondary text-xs py-1.5">✕ Clear</button>
              )}
            </div>
          </div>
          {!material
            ? <WasteBarChart data={subgroupChartData} loading={ledgerLoading} />
            : isGroup
              ? <WasteBarChart data={groupCategoryData} loading={ledgerLoading} />
              : <MaterialBarChart data={materialChartData} loading={ledgerLoading} materialName={matLabel} />}
        </div>

        {/* Trend + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="card lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="font-semibold text-gray-900">{trendRange.label} Trend{material ? ` — ${matLabel}` : ''}</h2>
                <p className="text-xs text-nokia-muted mt-0.5">
                  {material ? `Daily BAT vs SOFT generation for "${matLabel}"` : 'Daily waste generation — BAT vs SOFT'}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {TREND_RANGES.map(r => (
                  <button
                    key={r.days}
                    onClick={() => setTrendDays(r.days)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendDays === r.days ? 'bg-white text-nokia-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {r.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end mb-3">
              <MaterialSelect value={material} onChange={setMaterial} />
            </div>
            <TrendChart data={trends} loading={trendLoading} />
          </div>
          <div className="card lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="font-semibold text-gray-900">{material ? `Source Split — ${matLabel}` : 'By Waste Type'}</h2>
                <p className="text-xs text-nokia-muted mt-0.5">{material ? `${dateFrom} to ${dateTo}` : 'Distribution this week'}</p>
              </div>
            </div>
            <div className="flex justify-end mb-3">
              <MaterialSelect value={material} onChange={setMaterial} />
            </div>
            <DonutChart
              data={circularity?.by_type}
              byCategory={circularity?.by_function}
              loading={circLoading || (!!material && ledgerLoading)}
              materialView={material ? { label: matLabel, totals: materialSourceSplit } : null}
            />
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
