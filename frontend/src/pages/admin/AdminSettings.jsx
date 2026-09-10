import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
  const { user } = useAuth();

  if (!user) return null;

  const rows = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || 'N/A' },
    { label: 'Role', value: user.role || 'ADMIN' },
    { label: 'Account Status', value: user.status || 'ACTIVE' },
    { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin Settings</h2>
        <p className="text-xs text-gray-500 mt-1">Your administrator account profile.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-slate-900 to-emerald-950 text-white">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-2xl font-bold">
            {(user.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
              Administrator
            </span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-6 py-3.5 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}