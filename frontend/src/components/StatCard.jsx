import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon, label, value, change, changeType, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-navy-50 text-navy-700',
    accent: 'bg-mustard-50 text-mustard-700',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-primary-50 text-primary-700',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1.5">
          {changeType === 'up' ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-500" />
          )}
          <span className={`text-sm font-medium ${changeType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {change}
          </span>
          <span className="text-sm text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}
