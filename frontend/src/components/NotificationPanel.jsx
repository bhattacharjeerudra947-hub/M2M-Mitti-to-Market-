import { Bell } from 'lucide-react';

const mockNotifications = [
  { id: 1, text: 'FreshMart placed an order for 500 kg Tomato', time: '2h ago', read: false },
  { id: 2, text: 'Payment of ₹14,500 received', time: '5h ago', read: false },
  { id: 3, text: 'AI Price Advisor: Tomato prices expected to rise', time: '1d ago', read: true },
];

export default function NotificationPanel() {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-navy-700" />
          <h3 className="text-sm font-bold text-navy-900">Notifications</h3>
        </div>
        <span className="text-xs text-navy-500 font-medium cursor-pointer hover:underline">
          Mark all read
        </span>
      </div>
      <div className="space-y-1">
        {mockNotifications.map((n) => (
          <div key={n.id} className={`p-4 hover:bg-mustard-50/50 transition rounded-xl ${!n.read ? 'bg-mustard-50/30 border border-mustard-100' : ''}`}>
            <div className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-transparent'}`} />
              <div>
                <p className="text-sm text-navy-800">{n.text}</p>
                <p className="text-xs text-navy-400 mt-1">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
