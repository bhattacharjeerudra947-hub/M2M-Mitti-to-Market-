import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, MessageCircle, ShoppingCart, Package, Truck, Lock, AlertCircle, Sparkles, Handshake, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPut } from '../api';

const NOTIF_ICONS = {
  NEW_MATCH: { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
  MATCH_UPDATED: { icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50' },
  BUYER_REQUIREMENT_MATCHED: { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
  DEAL_STARTED: { icon: Handshake, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  NEW_OFFER: { icon: Handshake, color: 'text-primary-600', bg: 'bg-primary-50' },
  COUNTER_OFFER: { icon: Handshake, color: 'text-amber-600', bg: 'bg-amber-50' },
  OFFER_ACCEPTED: { icon: CheckCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  NEW_MESSAGE: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  BUYER_INTEREST: { icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50' },
  INTEREST_ACCEPTED: { icon: CheckCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  INTEREST_REJECTED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  ORDER_PLACED: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
  ORDER_STATUS_CHANGED: { icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  DEAL_LOCK_REQUESTED: { icon: Lock, color: 'text-amber-500', bg: 'bg-amber-50' },
  DEAL_LOCKED: { icon: Lock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  DEAL_COMPLETED: { icon: CheckCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  DEAL_CANCELLED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  LOGISTICS_SELECTED: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  LOGISTICS_UPDATE: { icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  DELIVERY_CONFIRMED: { icon: CheckCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  RATING_RECEIVED: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
};

function getNotifStyle(type) {
  return NOTIF_ICONS[type] || { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

export default function NotificationPanel({ compact = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    const isFarmer = user?.role === 'FARMER';
    if (n.type === 'NEW_MATCH' || n.type === 'MATCH_UPDATED' || n.type === 'BUYER_REQUIREMENT_MATCHED') {
      navigate('/farmer/matches');
    } else if (n.type === 'DEAL_STARTED') {
      navigate(isFarmer ? '/farmer/chat' : '/business/chat');
    } else if (n.type === 'DEAL_LOCKED' || n.type === 'DEAL_COMPLETED') {
      navigate(isFarmer ? '/farmer/deals' : '/business/deals');
    } else if (n.type === 'RATING_RECEIVED') {
      navigate('/profile');
    }
  };
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [notifs, countData] = await Promise.all([
        apiGet('/api/notifications'),
        apiGet('/api/notifications/unread-count')
      ]);
      setNotifications(notifs || []);
      setUnreadCount(countData?.unreadCount || 0);
    } catch {
      // Session expired or backend unavailable
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await apiPut(`/api/notifications/${id}/read`);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiPut('/api/notifications/mark-read');
    } catch {}
  }, []);

  if (compact) {
    return (
      <div className="relative">
        <Bell className="w-5 h-5 text-navy-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
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

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-3 border-navy-200 border-t-navy-600 rounded-full mx-auto mb-2" />
          <p className="text-xs text-navy-400">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-8 h-8 text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {notifications.map((n) => {
            const style = getNotifStyle(n.type);
            const Icon = style.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-3 hover:bg-mustard-50/50 transition rounded-xl flex gap-3 ${
                  !n.read ? 'bg-mustard-50/30 border border-mustard-100' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${!n.read ? 'text-navy-900' : 'text-navy-700'}`}>{n.title}</p>
                  <p className="text-xs text-navy-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-navy-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
