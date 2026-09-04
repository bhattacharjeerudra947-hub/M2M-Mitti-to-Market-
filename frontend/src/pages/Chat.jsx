import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Send, ArrowLeft, MessageCircle, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId, otherUserId } = useParams();
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeConv, setActiveConv] = useState(null);

  const role = user?.role?.toLowerCase() || 'farmer';
  const sidebarRole = role === 'farmer' ? 'farmer' : 'business';

  // Load conversations list
  useEffect(() => {
    if (!user) return;
    apiGet('/api/messages/conversations')
      .then(data => setConversations(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!conversationId || !user) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [conversationId, user]);

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const data = await apiGet(`/api/messages/${conversationId}`);
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const produceId = activeConv?.produceId || null;
      await apiPost('/api/messages', {
        receiverId: Number(otherUserId),
        content: newMessage.trim(),
        produceId,
      });
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Conversation list view
  if (!conversationId) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role={sidebarRole} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-navy-900 mb-1">Messages</h1>
            <p className="text-navy-500 mb-6">Chat with your {role === 'farmer' ? 'buyers' : 'farmers'}</p>

            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">No conversations yet</p>
                <p className="text-sm text-gray-500">
                  {role === 'farmer'
                    ? 'When a buyer contacts you about your produce, the conversation will appear here.'
                    : 'Start a conversation from a farmer\'s product page or order.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.conversationId}
                    onClick={() => navigate(`/chat/${conv.conversationId}/${conv.otherUserId}`)}
                    className="w-full bg-white rounded-xl border border-navy-100 p-4 flex items-center gap-4 hover:shadow-md transition text-left"
                  >
                    <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center text-lg font-bold text-navy-700 flex-shrink-0">
                      {conv.otherUserName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-navy-900 text-sm">{conv.otherUserName}</p>
                        <span className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</span>
                      </div>
                      {conv.produceName && (
                        <div className="flex items-center gap-1 mb-1">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{conv.produceName}</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-6 h-6 bg-navy-900 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
          {/* Chat header */}
          <div className="bg-white rounded-t-2xl border border-navy-100 p-4 flex items-center gap-3 mb-0">
            <button onClick={() => navigate('/chat')} className="p-1 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center font-bold text-navy-700">
              {conversations.find(c => c.conversationId === conversationId)?.otherUserName?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">
                {conversations.find(c => c.conversationId === conversationId)?.otherUserName || 'Chat'}
              </p>
              {conversations.find(c => c.conversationId === conversationId)?.produceName && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {conversations.find(c => c.conversationId === conversationId)?.produceName}
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-white border-x border-navy-100 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        isMine
                          ? 'bg-navy-900 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-gray-300' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message input */}
          <form onSubmit={handleSend} className="bg-white rounded-b-2xl border border-navy-100 p-3 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2.5 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
