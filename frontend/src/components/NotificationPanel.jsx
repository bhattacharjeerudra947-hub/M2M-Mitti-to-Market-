import { useState, useCallback } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_NOTIFICATIONS = [
  { id: 1, text: 'FreshMart placed an order for 500 kg Tomato', time: '2h ago', read: false },
  { id: 2, text: 'Payment of ₹14,500 received', time: '5h ago', read: false },
  { id: 3, text: 'AI Price Advisor: Tomato prices expected to rise', time: '1d ago', read: true },
  { id: 4, text: 'New buyer request for Onion from GreenBasket', time: '1d ago', read: true },
  { id: 5, text: 'Payment of ₹32,500 received for Order #AG1018', time: '2d ago', read: true },
];

function getStorageKey(userId) {
  return `m2m_notifications_${userId}`;
}

function loadNotifications(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  // Initialize with defaults for new users
  localStorage.setItem(getStorageKey(userId), JSON.stringify(DEFAULT_NOTIFICATIONS));
  return DEFAULT_NOTIFICATIONS;
}

function saveNotifications(userId, notifs) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(notifs));
}

export default function NotificationPanel({ compact = false }) {
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const [notifications, setNotifications] = useState(() => loadNotifications(userId));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      saveNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  if (compact) {
    return (
      <div className="relative">
        <Bell className="w-5 h-5 text-navy-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-navy-700" />
          <h3 className="text-sm font-bold text-navy-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-navy-500 font-medium hover:text-navy-700 transition">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-8 h-8 text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`w-full text-left p-4 hover:bg-mustard-50/50 transition rounded-xl ${!n.read ? 'bg-mustard-50/30 border border-mustard-100' : ''}`}
            >
              <div className="flex gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'text-navy-900 font-medium' : 'text-navy-600'}`}>{n.text}</p>
                  <p className="text-xs text-navy-400 mt-1">{n.time}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
