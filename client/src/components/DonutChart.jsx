import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = { GENERAL: '#0068B3', HAZARDOUS: '#F59E0B', EWASTE: '#00B4A0' };

export default function DonutChart({ data, loading }) {
  if (loading) return <div className="h-56 bg-gray-50 rounded animate-pulse" />;
  if (!data) return null;

  const entries = Object.entries(data).map(([name, value]) => ({ name, value: Number(value) })).filter(e => e.value > 0);

  if (!entries.length) return <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie data={entries} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {entries.map((e) => <Cell key={e.name} fill={COLORS[e.name] || '#6B7280'} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} kg`]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
