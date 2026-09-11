import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onNotification } from '../utils/messageStream';
import { X, Sparkles, Handshake, Lock, CheckCircle2, ShoppingBag, Star } from 'lucide-react';

/**
 * Real-time floating toast for system notifications (matches, deal initiation, deal lock, ratings).
 * Works in harmony with the persistent Notification Centre.
 */
export default function LiveNotificationToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onNotification((notif) => {
      if (!notif) return;

      let meta = {};
      try {
        if (typeof notif.metadata === 'string') {
          meta = JSON.parse(notif.metadata);
        } else if (typeof notif.metadata === 'object' && notif.metadata !== null) {
          meta = notif.metadata;
        }
      } catch {}

      const isFarmer = user.role === 'FARMER';
      const isAdmin = user.role === 'ADMIN';
      let targetUrl = isFarmer ? '/farmer/matches' : isAdmin ? '/admin' : '/business/requirements';

      if (notif.type === 'NEW_MATCH' || notif.type === 'BUYER_REQUIREMENT_MATCHED') {
        targetUrl = isFarmer ? '/farmer/matches' : '/business/requirements';
      } else if (notif.type === 'DEAL_STARTED' && meta.conversationId) {
        const otherId = isFarmer ? meta.buyerId : meta.farmerId;
        const rolePrefix = isFarmer ? 'farmer' : 'business';
        targetUrl = `/${rolePrefix}/chat/${meta.conversationId}/${otherId || ''}`;
      } else if (notif.type === 'DEAL_LOCKED' || notif.type === 'DEAL_COMPLETED') {
        targetUrl = isFarmer ? '/farmer/deals' : '/business/deals';
      } else if (notif.type === 'RATING_RECEIVED') {
        targetUrl = '/profile';
      } else if (notif.type === 'NEW_APPEAL' || notif.type === 'APPEAL_UNDER_REVIEW') {
        targetUrl = isAdmin ? '/admin/appeals' : '/';
      } else if (notif.type === 'APPEAL_APPROVED' || notif.type === 'APPEAL_REJECTED') {
        targetUrl = isAdmin ? '/admin/appeals' : '/';
      } else if (notif.type === 'VERIFICATION_APPROVED' || notif.type === 'VERIFICATION_REJECTED' || notif.type === 'RESUBMISSION_REQUESTED') {
        targetUrl = isAdmin ? '/admin/verifications' : '/profile';
      } else if (notif.type === 'REPORT_UPDATE') {
        targetUrl = isAdmin ? '/admin/reports' : '/';
      } else if (notif.type === 'DISPUTE_UPDATE') {
        targetUrl = isAdmin ? '/admin/disputes' : (isFarmer ? '/farmer/deals' : '/business/deals');
      } else if (notif.type === 'FEEDBACK_RESPONSE' || notif.type === 'NEW_FEEDBACK') {
        targetUrl = isAdmin ? '/admin/feedback' : '/';
      } else if (notif.type === 'SYSTEM_ALERT' && isAdmin) {
        targetUrl = notif.referenceType === 'USER' ? '/admin/verifications' : '/admin';
      }

      const toast = {
        id: notif.id || `${Date.now()}-${Math.random()}`,
        type: notif.type,
        title: notif.title || 'Notification',
        body: notif.body || '',
        meta,
        targetUrl,
        createdAt: notif.createdAt || new Date().toISOString(),
      };

      setToasts((prev) => [toast, ...prev.filter(t => t.id !== toast.id)].slice(0, 3));

      // Auto-dismiss after 7 seconds
      if (timers.current.has(toast.id)) {
        clearTimeout(timers.current.get(toast.id));
      }
      const tId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        timers.current.delete(toast.id);
      }, 7000);
      timers.current.set(toast.id, tId);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((tId) => clearTimeout(tId));
      timers.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 w-96 max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((toast) => {
        const isMatch = toast.type === 'NEW_MATCH' || toast.type === 'BUYER_REQUIREMENT_MATCHED';
        const isDeal = toast.type === 'DEAL_STARTED';
        const isLocked = toast.type === 'DEAL_LOCKED';
        const isRating = toast.type === 'RATING_RECEIVED';
        const isAppeal = toast.type?.includes('APPEAL');
        const isVerification = toast.type?.includes('VERIFICATION') || toast.type === 'RESUBMISSION_REQUESTED';
        const isAlert = toast.type === 'SYSTEM_ALERT' || toast.type?.includes('REPORT') || toast.type?.includes('DISPUTE');

        return (
          <div
            key={toast.id}
            onClick={() => {
              navigate(toast.targetUrl);
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            className={`pointer-events-auto cursor-pointer rounded-2xl shadow-2xl p-4.5 border transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
              isRating
                ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 text-white border-amber-400/60 shadow-amber-500/30 ring-1 ring-amber-400/40'
                : isAppeal
                ? 'bg-gradient-to-r from-amber-950 via-gray-900 to-slate-900 text-white border-amber-500/50 shadow-amber-500/20 ring-1 ring-amber-400/30'
                : isVerification
                ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white border-emerald-500/50 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                : isAlert
                ? 'bg-gradient-to-r from-rose-950 via-gray-900 to-slate-900 text-white border-rose-500/50 shadow-rose-500/20 ring-1 ring-rose-400/30'
                : isMatch
                ? 'bg-gradient-to-r from-navy-950 via-navy-900 to-primary-950 text-white border-mustard-400/50 shadow-mustard-500/20 ring-1 ring-mustard-400/30'
                : isDeal
                ? 'bg-gradient-to-r from-emerald-950 to-navy-900 text-white border-emerald-500/40 shadow-emerald-500/20'
                : isLocked
                ? 'bg-gradient-to-r from-blue-950 to-navy-900 text-white border-blue-500/40 shadow-blue-500/20'
                : 'bg-navy-900 text-white border-navy-700 shadow-xl'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                  isRating
                    ? 'bg-amber-400 text-navy-950 font-bold'
                    : isAppeal
                    ? 'bg-amber-500 text-gray-950 font-bold'
                    : isVerification
                    ? 'bg-emerald-500 text-white font-bold'
                    : isAlert
                    ? 'bg-rose-500 text-white font-bold'
                    : isMatch
                    ? 'bg-mustard-400 text-navy-950 font-bold'
                    : isDeal
                    ? 'bg-emerald-500 text-white'
                    : isLocked
                    ? 'bg-blue-500 text-white'
                    : 'bg-navy-700 text-white'
                }`}
              >
                {isRating ? (
                  <Star className="w-5 h-5 fill-amber-950" />
                ) : isAppeal ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isVerification ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isMatch ? (
                  <Sparkles className="w-5 h-5 animate-pulse" />
                ) : isDeal ? (
                  <Handshake className="w-5 h-5" />
                ) : isLocked ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isAppeal ? 'text-amber-300' : isVerification ? 'text-emerald-300' : isAlert ? 'text-rose-300' : 'text-mustard-300'
                  }`}>
                    {toast.title}
                  </span>
                  <span className="text-[10px] text-gray-400">just now</span>
                </div>

                <p className="text-sm font-medium text-gray-100 mt-1 line-clamp-3 whitespace-pre-line leading-relaxed">
                  {toast.body}
                </p>

                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    isAppeal ? 'text-amber-400 hover:text-amber-300' : isVerification ? 'text-emerald-400 hover:text-emerald-300' : isAlert ? 'text-rose-400 hover:text-rose-300' : 'text-mustard-400 hover:text-mustard-300'
                  }`}>
                    {isAppeal ? 'Review Appeal →' : isVerification ? 'Review Verification →' : isMatch ? 'Review Match →' : isDeal ? 'Open Chat →' : 'View Details →'}
                  </span>
                  <span className="text-[10px] text-gray-400">Click to open</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
