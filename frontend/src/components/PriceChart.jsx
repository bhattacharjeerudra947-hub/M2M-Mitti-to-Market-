import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Universal Chart component for Price, Earnings, GMV and Volume Trends.
 * Supports 'line', 'area', or 'bar' chart types with smooth tooltips and defensive fallbacks.
 */
const CustomTooltip = ({ active, payload, label, unit = '₹' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy-900/95 backdrop-blur-sm text-white p-3 rounded-xl border border-navy-700 shadow-xl z-50 text-xs">
        <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
        {payload.map((entry, i) => {
          const val = Number(entry.value || 0).toLocaleString('en-IN');
          const formatted = unit === '₹' ? `₹${val}` : `${val} ${unit}`;
          return (
            <p key={i} className="flex items-center gap-2 py-0.5" style={{ color: entry.color || '#38bdf8' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color || '#38bdf8' }} />
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-bold text-white ml-auto">{formatted}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function PriceChart({
  data = [],
  dataKeys = [],
  title = 'Price Trend',
  subtitle,
  colors = ['#16a34a', '#0f2a4a', '#d4a017'],
  unit = '₹',
  height = 250,
  chartType = 'area', // 'area' | 'line' | 'bar'
  emptyMessage = 'No transaction data yet',
  emptySubtext = 'Charts update in real-time as transactions and market activities occur.',
}) {
  const rows = Array.isArray(data) ? data.filter(Boolean) : [];
  const series = dataKeys.filter(k => k && k.name && !k.xKey);
  const xKey = dataKeys.find(k => k?.xKey)?.name || dataKeys[0]?.name || 'month';

  const hasData = rows.length > 0 && series.length > 0 && rows.some(r =>
    series.some(s => Number.isFinite(Number(r[s.name])) && Number(r[s.name]) >= 0)
  );

  const hasNonZero = rows.some(r =>
    series.some(s => Number(r[s.name]) > 0)
  );

  const formatYAxis = (val) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return String(val);
  };

  const yDomain = [0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 100)];

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
        {hasData && hasNonZero && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Live Analytics
          </span>
        )}
        {hasData && !hasNonZero && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Awaiting Activity
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center text-center py-6 px-4" style={{ minHeight: height, height }}>
          <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-400 mb-2">
            📈
          </div>
          <p className="text-sm font-semibold text-navy-800">{emptyMessage}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{emptySubtext}</p>
        </div>
      ) : (
        <div className="w-full relative" style={{ minHeight: height, height, width: '100%' }}>
          {!hasNonZero && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-gray-200 text-[11px] text-gray-500 shadow-xs pointer-events-none">
              No sales or transactions completed yet — showing baseline
            </div>
          )}
          <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
            {chartType === 'bar' ? (
              <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {series.map((s, i) => (
                  <Bar
                    key={s.name}
                    dataKey={s.name}
                    name={s.label || s.name}
                    fill={colors[i % colors.length]}
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {series.map((s, i) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    name={s.label || s.name}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: colors[i % colors.length] }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {series.map((s, i) => {
                    const color = colors[i % colors.length];
                    return (
                      <linearGradient key={s.name} id={`grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={yDomain} tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {series.map((s, i) => (
                  <Area
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    name={s.label || s.name}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2.5}
                    fill={`url(#grad-${s.name})`}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {hasData && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-navy-500 flex-wrap">
          {series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
              {s.label || s.name} ({unit})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
