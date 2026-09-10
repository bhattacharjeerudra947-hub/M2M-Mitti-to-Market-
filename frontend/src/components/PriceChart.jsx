import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Price/Trend chart — renders whatever real series the page passes in.
 * Defensive by design: missing/undefined/empty data renders an explicit
 * empty state, never a crash and never fabricated values.
 *
 * Props:
 *  - data:     array of row objects, e.g. [{ month: 'Apr', tomato: 22, onion: 18 }]
 *  - dataKeys: [{ name: 'month', xKey: 'month' }, { name: 'tomato', label: 'Tomato' }]
 *              first entry = x-axis key, remaining = plotted series
 *  - colors:   stroke colors per plotted series
 *  - unit:     y-axis unit label (default '₹/kg')
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl border border-navy-100 shadow-lg">
        <p className="text-xs font-semibold text-navy-900 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ₹{entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PriceChart({
  data,
  dataKeys = [],
  title = 'Price Trend',
  colors = ['#0f2a4a', '#16a34a', '#d4a017'],
  unit = '₹/kg',
  height = 220,
}) {
  // Normalize — never assume the API/parent always sent a clean array
  const rows = Array.isArray(data) ? data.filter(Boolean) : [];
  const series = dataKeys.filter(k => k && k.name && !k.xKey);
  const xKey = dataKeys.find(k => k?.xKey)?.name || dataKeys[0]?.name || 'month';

  const hasData = rows.length > 0 && series.length > 0
    && rows.some(r => series.some(s => Number.isFinite(Number(r[s.name]))));

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-navy-900 mb-4">{title}</h3>
      {!hasData ? (
        <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
          <p className="text-sm font-medium text-navy-700">No price data yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Charts appear once real market or transaction data is available. We don't display sample numbers.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#5979b5' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5979b5' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              {series.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  name={s.label || s.name}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: colors[i % colors.length] }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-navy-500 flex-wrap">
            {series.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                {s.label || s.name} ({unit})
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
