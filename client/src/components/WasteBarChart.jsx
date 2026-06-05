import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2 truncate max-w-[200px]">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{Number(p.value).toFixed(2)} kg</span>
        </div>
      ))}
    </div>
  );
};

export default function WasteBarChart({ data = [], loading }) {
  if (loading) return (
    <div className="h-72 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center text-gray-400 text-sm">
      Loading chart…
    </div>
  );
  if (!data.length) return (
    <div className="h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
      <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-sm">No data for selected range</span>
    </div>
  );

  const formatted = data.map(d => ({
    ...d,
    category: d.category.length > 22 ? d.category.slice(0, 20) + '…' : d.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={288}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: '#6B7A99' }}
          angle={-40}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7A99' }}
          unit=" kg"
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFF' }} />
        <Legend
          wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
          formatter={(v) => <span style={{ color: '#374151', fontWeight: 500 }}>{v}</span>}
        />
        <Bar dataKey="BAT" name="BAT Production" fill="#0050FF" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="SOFT" name="Soft Production" fill="#00CC44" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
