import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const data = [
  { month: 'Jan', market: 22, predicted: null },
  { month: 'Feb', market: 24, predicted: null },
  { month: 'Mar', market: 21, predicted: null },
  { month: 'Apr', market: 25, predicted: null },
  { month: 'May', market: 27, predicted: null },
  { month: 'Jun', market: 28, predicted: null },
  { month: 'Jul', market: 26, predicted: 27 },
  { month: 'Aug', market: null, predicted: 29 },
  { month: 'Sep', market: null, predicted: 30 },
  { month: 'Oct', market: null, predicted: 31 },
  { month: 'Nov', market: null, predicted: 29 },
  { month: 'Dec', market: null, predicted: 28 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl border border-navy-100 shadow-lg">
        <p className="text-xs font-semibold text-navy-900 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ₹{entry.value}/kg
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PriceChart({ title = 'Price Trend' }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-navy-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f2a4a" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0f2a4a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5979b5' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#5979b5' }} axisLine={false} tickLine={false} domain={[18, 35]} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="market" stroke="#0f2a4a" fill="url(#colorMarket)" strokeWidth={2.5} dot={{ r: 3, fill: '#0f2a4a' }} name="Market" />
          <Area type="monotone" dataKey="predicted" stroke="#16a34a" fill="url(#colorPredicted)" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, fill: '#16a34a' }} name="AI Predicted" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 text-xs text-navy-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-navy-900 rounded-full" /> Market Price</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary-500 rounded-full border-dashed" /> AI Predicted</span>
      </div>
    </div>
  );
}
