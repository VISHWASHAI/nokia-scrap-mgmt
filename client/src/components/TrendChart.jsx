import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

export default function TrendChart({ data = [], loading }) {
  if (loading) return <div className="h-56 bg-gray-50 rounded animate-pulse" />;
  if (!data.length) return <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No trend data</div>;

  const formatted = data.map(d => ({
    ...d,
    date: dayjs(d.date).format('DD MMM'),
  }));

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} unit="kg" width={60} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} kg`]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="BAT" name="BAT" stroke="#0068B3" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="SOFT" name="SOFT" stroke="#00B4A0" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
