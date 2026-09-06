import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onMessage, closeMessageStream } from '../utils/messageStream';
import { X, MessageCircle } from 'lucide-react';

/**
 * Global message popup — a small toast that pops up on screen the moment
 * a new message arrives, from anywhere in the app. Clicking it jumps to
 * the conversation. Auto-dismisses after a few seconds.
 */
export default function MessagePopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [popups, setPopups] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onMessage((msg) => {
      // Only pop up for messages addressed to me
      if (!msg || String(msg.receiverId) !== String(user.id)) return;

      // If I'm already looking at that conversation, skip the toast —
      // the message renders inline in the chat.
      if (location.pathname.includes(msg.conversationId)) return;

      const role = user.role === 'FARMER' ? 'farmer' : user.role === 'DRIVER' ? 'driver' : 'business';
      // Drivers have no chat page — skip the toast (messages still reach them via the stream)
      if (role === 'driver') return;
      const popup = {
        id: msg.id || `${Date.now()}-${Math.random()}`,
        conversationId: msg.conversationId,
        senderName: msg.senderName || 'Someone',
        content: msg.content || '',
        to: `/${role}/chat/${msg.conversationId}/${msg.senderId}`,
      };

      setPopups((prev) => {
        const next = [popup, ...prev].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 3);
        return next;
      });

      // Auto-dismiss after 5 seconds
      if (timers.current.has(popup.id)) clearTimeout(timers.current.get(popup.id));
      const t = setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== popup.id));
        timers.current.delete(popup.id);
      }, 5000);
      timers.current.set(popup.id, t);
    });

    return () => { unsubscribe(); };
  }, [user, location.pathname]);

  // Drop the stream on logout
  useEffect(() => {
    if (!user) closeMessageStream();
  }, [user]);

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {popups.map((p) => (
        <button
          key={p.id}
          onClick={() => { navigate(p.to); setPopups((prev) => prev.filter((x) => x.id !== p.id)); }}
          className="bg-navy-900 text-white rounded-2xl shadow-2xl border border-navy-700 p-4 text-left animate-[fadeInUp_0.25s_ease-out] hover:bg-navy-800 transition group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-mustard-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-navy-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-mustard-300 truncate">💬 New message from {p.senderName}</p>
              <p className="text-sm text-gray-100 mt-0.5 line-clamp-2 break-words">{p.content}</p>
            </div>
            <span onClick={(e) => { e.stopPropagation(); setPopups((prev) => prev.filter((x) => x.id !== p.id)); }}
              className="text-gray-400 hover:text-white transition flex-shrink-0 group-hover:opacity-100">
              <X className="w-4 h-4" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}