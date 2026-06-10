import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { formatDate } from '../utils/dateHelpers.js';
import { fmtKg } from '../utils/formatters.js';
import { PRODUCTION_FUNCTION_LABELS } from '../constants/productionFunctions.js';
import { DISPOSAL_ROUTE_LABELS } from '../constants/disposalRoute.js';

export default function DeclarationTable({ items = [], loading, emptyText = 'No declarations found.' }) {
  if (loading) return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
    </div>
  );

  if (!items.length) return (
    <div className="text-center py-12 text-gray-400 text-sm">{emptyText}</div>
  );

  const totalWeight = (line_items) =>
    (line_items || []).reduce((s, li) => s + Number(li.weight_kg ?? 0), 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 -mx-3 sm:mx-0">
      <table className="min-w-[640px] w-full">
        <thead>
          <tr>
            {['Declaration No', 'Date', 'Zone', 'Function', 'Source', 'Route', 'Total Weight', 'Status', 'Actions'].map(h => (
              <th key={h} className="table-header">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((d, i) => (
            <tr key={d.id} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
              <td className="table-cell font-mono text-xs">{d.declaration_no}</td>
              <td className="table-cell">{formatDate(d.date)}</td>
              <td className="table-cell">{d.zone}</td>
              <td className="table-cell">{PRODUCTION_FUNCTION_LABELS[d.production_function] || d.production_function}</td>
              <td className="table-cell">
                <span className={`font-semibold text-xs ${d.source === 'BAT' ? 'text-nokia-blue' : 'text-nokia-teal'}`}>
                  {d.source}
                </span>
              </td>
              <td className="table-cell">
                <span className={`text-xs font-medium ${d.disposal_route === 'AUTHORIZED_AGENCY' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {DISPOSAL_ROUTE_LABELS[d.disposal_route] || '—'}
                </span>
              </td>
              <td className="table-cell">{fmtKg(totalWeight(d.line_items))}</td>
              <td className="table-cell"><StatusBadge status={d.status} /></td>
              <td className="table-cell">
                <Link to={`/declaration/${d.id}`} className="text-nokia-blue text-xs font-medium hover:underline">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
