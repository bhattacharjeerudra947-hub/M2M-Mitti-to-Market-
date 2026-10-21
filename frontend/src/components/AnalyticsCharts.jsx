import { CheckCircle2, ArrowRight, TrendingUp, Package, Users, ShieldCheck, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/**
 * Custom Tooltip for Group Comparison
 */
const GroupTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isPct = label.includes('%') || label.includes('Rate');
    const isTons = label.includes('Tons') || label.includes('Volume');
    const unit = isPct ? '%' : isTons ? ' tons' : '';
    return (
      <div className="bg-navy-900/95 backdrop-blur-sm text-white p-3 rounded-xl border border-navy-700 shadow-xl text-xs z-50">
        <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-2 py-0.5" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-bold text-white ml-auto">{entry.value}{unit}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Cross-Group Progress Comparison Bar Chart
 * Compares Farmers Group vs Businessman Group metrics side-by-side.
 */
export function GroupComparisonBarChart({
  data = [],
  title = 'Group Progress Comparison',
  subtitle = 'Farmers Group (Supply) vs Businessman Group (Procurement)',
  height = 260,
}) {
  const rows = Array.isArray(data) && data.length > 0 ? data : [
    { name: 'Active Members', farmers: 20, businesses: 15 },
    { name: 'Verified Rate %', farmers: 65, businesses: 53 },
    { name: 'Total Volume (Tons)', farmers: 86, businesses: 63 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Farmers Group
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Businessman Group
          </span>
        </div>
      </div>

      <div className="w-full" style={{ width: '100%', height, minHeight: height }}>
        <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
          <BarChart data={rows} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<GroupTooltip />} />
            <Bar dataKey="farmers" name="Farmers Group" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="businesses" name="Businessman Group" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Visual Funnel / Pipeline Component for Deals and Orders.
 * Displays stage counts, completion flow, and percentage conversion.
 */
export function ProgressFunnel({ title = 'Transaction Pipeline Progress', stages = [], subtitle }) {
  const total = stages.reduce((s, st) => s + (st.count || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-50 text-navy-700">
          Total: {total} transactions
        </span>
      </div>

      <div className="space-y-3">
        {stages.map((st, i) => {
          const pct = total > 0 ? Math.round(((st.count || 0) / total) * 100) : 0;
          return (
            <div key={st.stage || i} className="group p-3 rounded-xl hover:bg-navy-50/50 transition border border-transparent hover:border-navy-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.color || '#3b82f6' }} />
                  {st.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy-900">{st.count || 0}</span>
                  <span className="text-gray-400 font-mono text-[11px]">({pct}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, st.count > 0 ? 5 : 0)}%`,
                    backgroundColor: st.color || '#3b82f6',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Category Breakdown Component.
 * Displays volume/spend distributions across produce categories.
 */
export function CategoryDistribution({ title = 'Category Distribution', data = {}, unit = 'kg' }) {
  const entries = Object.entries(data || {}).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0);

  const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
        <span className="text-xs text-navy-500 font-medium">
          {total.toLocaleString('en-IN')} {unit} total
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          No categories recorded yet
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(([category, amount], idx) => {
            const pct = total > 0 ? Math.round((Number(amount) / total) * 100) : 0;
            const color = colors[idx % colors.length];
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-navy-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy-900">
                      {unit === '₹' ? `₹${Number(amount).toLocaleString('en-IN')}` : `${Number(amount).toLocaleString('en-IN')} ${unit}`}
                    </span>
                    <span className="text-gray-400 text-[11px] w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Group Progress Comparison Cards
 * Compares Farmers vs Businessmen progress metrics.
 */
export function GroupProgressComparison({ farmerGroup = {}, businessGroup = {} }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Farmer Group Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white rounded-2xl border border-emerald-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white text-base">🌾</span>
            <div>
              <h4 className="text-sm font-bold text-navy-900">Farmers Group Progress</h4>
              <p className="text-xs text-navy-500">Supply & producer metrics</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            {farmerGroup.totalFarmers || 0} Members
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-emerald-100 text-center">
          <div>
            <p className="text-[11px] text-gray-500">Verified</p>
            <p className="text-base font-bold text-emerald-700">{farmerGroup.verifiedFarmers || 0}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500">Listed (kg)</p>
            <p className="text-base font-bold text-navy-900">
              {((farmerGroup.totalProduceListedKg || 0) / 1000).toFixed(1)}t
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500">Sold (kg)</p>
            <p className="text-base font-bold text-navy-900">
              {((farmerGroup.soldProduceKg || 0) / 1000).toFixed(1)}t
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-navy-700">
          <span>Verification Completion:</span>
          <span className="font-bold text-emerald-800">
            {farmerGroup.totalFarmers > 0
              ? Math.round(((farmerGroup.verifiedFarmers || 0) / farmerGroup.totalFarmers) * 100)
              : 0}%
          </span>
        </div>
      </div>

      {/* Business Group Card */}
      <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white rounded-2xl border border-blue-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white text-base">🏢</span>
            <div>
              <h4 className="text-sm font-bold text-navy-900">Businessman Group Progress</h4>
              <p className="text-xs text-navy-500">Buyer procurement & requirements</p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
            {businessGroup.totalBusinesses || 0} Members
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-blue-100 text-center">
          <div>
            <p className="text-[11px] text-gray-500">Verified</p>
            <p className="text-base font-bold text-blue-700">{businessGroup.verifiedBusinesses || 0}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500">Requirements</p>
            <p className="text-base font-bold text-navy-900">{businessGroup.requirementsCount || 0}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500">Fulfilled Rate</p>
            <p className="text-base font-bold text-blue-700">{businessGroup.fulfillmentRatePct || 0}%</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-navy-700">
          <span>Demand Fulfillment:</span>
          <span className="font-bold text-blue-800">
            {businessGroup.fulfilledKg ? `${(businessGroup.fulfilledKg / 1000).toFixed(1)}t fulfilled` : 'Ongoing'}
          </span>
        </div>
      </div>
    </div>
  );
}
