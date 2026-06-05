import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  GENERAL:   '#0050FF',
  HAZARDOUS: '#F97316',
  EWASTE:    '#00CC44',
};

const LABELS = {
  GENERAL: 'General',
  HAZARDOUS: 'Hazardous',
  EWASTE: 'E-Waste',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: d.payload.fill }} />
        <span className="font-semibold text-gray-900">{LABELS[d.name] || d.name}</span>
      </div>
      <p className="text-gray-600 text-xs mt-1">{Number(d.value).toFixed(2)} kg · {(d.payload.percent * 100).toFixed(1)}%</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DonutChart({ data, loading }) {
  if (loading) return <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />;
  if (!data) return null;

  const entries = Object.entries(data)
    .map(([name, value]) => ({ name, value: Number(value), fill: COLORS[name] || '#6B7280' }))
    .filter(e => e.value > 0);

  if (!entries.length) return (
    <div className="h-56 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl text-sm">
      No waste recorded this week
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie
          data={entries}
          cx="50%" cy="50%"
          innerRadius={58} outerRadius={88}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {entries.map((e, i) => <Cell key={i} fill={e.fill} stroke="white" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(v) => <span style={{ color: '#374151', fontSize: 12, fontWeight: 500 }}>{LABELS[v] || v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
