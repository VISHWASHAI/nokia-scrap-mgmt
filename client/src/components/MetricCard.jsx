export default function MetricCard({ title, value, unit = '', subtitle, color = 'nokia-blue', loading }) {
  const colorMap = {
    'nokia-blue': 'border-t-nokia-blue',
    'nokia-teal': 'border-t-nokia-teal',
    'green': 'border-t-green-500',
    'orange': 'border-t-orange-500',
  };

  return (
    <div className={`card border-t-4 ${colorMap[color] || 'border-t-nokia-blue'}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      {loading ? (
        <div className="h-8 bg-gray-100 rounded animate-pulse w-2/3" />
      ) : (
        <p className="text-3xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
      )}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
