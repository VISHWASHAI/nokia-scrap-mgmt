import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function WasteBarChart({ data = [], loading }) {
  if (loading) return <div className="h-64 bg-gray-50 rounded animate-pulse" />;
  if (!data.length) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data for selected range</div>;

  // Truncate long category names for X axis
  const formatted = data.map(d => ({ ...d, category: d.category.length > 20 ? d.category.slice(0, 18) + '…' : d.category }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11 }} unit="kg" width={60} />
        <Tooltip formatter={(v) => [`${v.toFixed(2)} kg`]} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
        <Bar dataKey="BAT" name="BAT Production" fill="#0068B3" radius={[2, 2, 0, 0]} />
        <Bar dataKey="SOFT" name="Soft Production" fill="#00B4A0" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
