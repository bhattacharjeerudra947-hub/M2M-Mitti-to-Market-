import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Send, ArrowLeft, MessageCircle, Package, Radio, Handshake, Check, X, CornerUpLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api';
import { onMessage } from '../utils/messageStream';
import DealLockPanel from '../components/DealLockPanel';
import { createOffer, getConversationOffers, acceptOffer, counterOffer, rejectOffer } from '../api/dealApi';
import { pollInterval, isLowDataMode, onLowDataModeChange } from '../utils/lowDataMode';

const OFFER_STATUS_LABELS = {
  PENDING: '⏳ Pending', ACCEPTED: '✅ Accepted', COUNTERED: '🔄 Countered',
  REJECTED: '❌ Rejected', EXPIRED: '⏰ Expired', WITHDRAWN: '↩️ Withdrawn'
};

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

  // Structured negotiation offers
  const [offers, setOffers] = useState([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({ price: '', quantity: '', note: '' });
  const [counterFor, setCounterFor] = useState(null); // offer id being countered
  const [counterForm, setCounterForm] = useState({ price: '', quantity: '' });
  const [offerAction, setOfferAction] = useState(null); // loading state
  const [lowData, setLowData] = useState(isLowDataMode());
  useEffect(() => onLowDataModeChange(setLowData), []);

  const role = user?.role?.toLowerCase() || 'farmer';
  const sidebarRole = role === 'farmer' ? 'farmer' : 'business';

  // Load conversations list
  const loadConversations = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const data = await apiGet('/api/messages/conversations');
      setConversations(data || []);
    } catch (err) {
      if (err.message?.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: `/${sidebarRole}/chat` } } });
        return;
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Load conversations on mount and when conversationId changes
  useEffect(() => {
    loadConversations();
  }, [user, conversationId]);

  // Poll conversations list even while in a chat (to show unread badges)
  useEffect(() => {
    const interval = setInterval(() => loadConversations(false), pollInterval(10000, 30000));
    return () => clearInterval(interval);
  }, [user, lowData]);

  // Load messages when conversation is selected — poll for real-time
  useEffect(() => {
    if (!conversationId || !user) return;
    loadMessages();
    loadOffers();
    const interval = setInterval(() => {
      loadMessages();
      loadOffers();
      loadConversations(false); // Also refresh conversation list for unread badges
    }, pollInterval(2000, 10000));
    return () => clearInterval(interval);
  }, [conversationId, user, lowData]);

  // Real-time: SSE push — new messages pop up on screen instantly, no poll wait
  useEffect(() => {
    if (!conversationId || !user) return;
    const unsubscribe = onMessage((msg) => {
      if (!msg || msg.conversationId !== conversationId) return;
      if (String(msg.receiverId) !== String(user.id) && String(msg.senderId) !== String(user.id)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          createdAt: msg.createdAt,
          read: false,
        }];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      loadConversations(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const data = await apiGet(`/api/messages/${conversationId}`);
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      if (err.message?.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: `/${sidebarRole}/chat/${conversationId}/${otherUserId}` } } });
      }
    }
  };

  const loadOffers = async () => {
    if (!conversationId) return;
    try {
      const data = await getConversationOffers(conversationId);
      setOffers(data || []);
    } catch {}
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!offerForm.price || !offerForm.quantity) return;
    setOfferAction('create');
    try {
      const produceId = conversations.find(c => c.conversationId === conversationId)?.produceId || null;
      const produceName = conversations.find(c => c.conversationId === conversationId)?.produceName;
      await createOffer(conversationId, {
        receiverId: Number(otherUserId),
        price: Number(offerForm.price),
        quantity: Number(offerForm.quantity),
        cropName: produceName,
        unit: 'kg',
        note: offerForm.note,
        produceId,
      });
      setOfferForm({ price: '', quantity: '', note: '' });
      setShowOfferForm(false);
      await loadOffers();
      await loadMessages();
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      alert(err.message || 'Failed to send offer');
    } finally {
      setOfferAction(null);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    if (!confirm('Accept this offer? This will create a deal for both parties to confirm.')) return;
    setOfferAction(offerId);
    try {
      await acceptOffer(offerId);
      await loadOffers();
      await loadMessages();
      alert('Offer accepted — a deal is being created!');
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      alert(err.message || 'Could not accept offer');
    } finally {
      setOfferAction(null);
    }
  };

  const handleCounterOffer = async (offerId) => {
    if (!counterForm.price || !counterForm.quantity) return;
    setOfferAction('counter-' + offerId);
    try {
      await counterOffer(offerId, { price: Number(counterForm.price), quantity: Number(counterForm.quantity) });
      setCounterFor(null);
      setCounterForm({ price: '', quantity: '' });
      await loadOffers();
      await loadMessages();
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      alert(err.message || 'Could not send counter-offer');
    } finally {
      setOfferAction(null);
    }
  };

  const handleRejectOffer = async (offerId) => {
    if (!confirm('Reject this offer?')) return;
    setOfferAction(offerId);
    try {
      await rejectOffer(offerId);
      await loadOffers();
      await loadMessages();
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      alert(err.message || 'Could not reject offer');
    } finally {
      setOfferAction(null);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for instant feedback
    setSending(true);
    try {
      const produceId = activeConv?.produceId || null;
      await apiPost('/api/messages', {
        receiverId: Number(otherUserId),
        content: messageText,
        produceId,
      });
      // Immediately reload messages and conversations
      await loadMessages();
      await loadConversations(false);
    } catch (err) {
      if (err.message?.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: `/${sidebarRole}/chat` } } });
        return;
      }
      // Put the message back in the input if sending failed
      setNewMessage(messageText);
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
                    onClick={() => navigate(`/${sidebarRole}/chat/${conv.conversationId}/${conv.otherUserId}`)}
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
            <button onClick={() => navigate(`/${sidebarRole}/chat`)} className="p-1 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center font-bold text-navy-700">
              {conversations.find(c => c.conversationId === conversationId)?.otherUserName?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
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
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600">Live</span>
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
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-gray-300' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Structured offers */}
                {offers.length > 0 && offers.map((offer) => {
                  const isMine = offer.senderId === user?.id;
                  const canRespond = !isMine && offer.status === 'PENDING';
                  return (
                    <div key={`offer-${offer.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`w-[85%] sm:w-[75%] rounded-2xl border-2 overflow-hidden ${
                        offer.status === 'ACCEPTED' ? 'border-emerald-300 bg-emerald-50' :
                        offer.status === 'REJECTED' ? 'border-red-200 bg-red-50/50' :
                        offer.status === 'COUNTERED' ? 'border-amber-200 bg-amber-50/50' :
                        'border-navy-200 bg-white shadow-sm'
                      }`}>
                        <div className="px-4 py-2.5 bg-navy-900 text-white flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" /> OFFER · {offer.senderName}</span>
                          <span className="text-[10px] font-semibold">{OFFER_STATUS_LABELS[offer.status]}</span>
                        </div>
                        <div className="p-4 space-y-2">
                          {offer.cropName && <p className="text-sm font-bold text-navy-900">{offer.cropName}</p>}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-[9px] text-gray-500 font-semibold uppercase">Price</p>
                              <p className="text-sm font-bold text-navy-900">₹{offer.price}<span className="text-[10px] font-normal text-gray-500">/{offer.unit}</span></p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-[9px] text-gray-500 font-semibold uppercase">Qty</p>
                              <p className="text-sm font-bold text-navy-900">{offer.quantity} <span className="text-[10px] font-normal text-gray-500">{offer.unit}</span></p>
                            </div>
                            <div className="bg-navy-50 rounded-lg p-2">
                              <p className="text-[9px] text-gray-500 font-semibold uppercase">Total</p>
                              <p className="text-sm font-bold text-navy-900">₹{Number(offer.total || offer.price * offer.quantity).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          {offer.note && <p className="text-xs text-gray-600 italic">"{offer.note}"</p>}

                          {/* Response buttons */}
                          {canRespond && (
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => handleAcceptOffer(offer.id)} disabled={!!offerAction}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                {offerAction === offer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
                              </button>
                              <button onClick={() => { setCounterFor(offer.id); setCounterForm({ price: offer.price, quantity: offer.quantity }); }}
                                disabled={!!offerAction}
                                className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1">
                                <CornerUpLeft className="w-3 h-3" /> Counter
                              </button>
                              <button onClick={() => handleRejectOffer(offer.id)} disabled={!!offerAction}
                                className="py-2 px-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-200 hover:bg-red-100 disabled:opacity-50">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Counter form inline */}
                          {counterFor === offer.id && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 mt-1">
                              <p className="text-xs font-bold text-amber-800">Counter-offer terms:</p>
                              <div className="flex gap-2">
                                <input type="number" value={counterForm.price} onChange={e => setCounterForm({...counterForm, price: e.target.value})}
                                  placeholder="Price ₹/kg" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" />
                                <input type="number" value={counterForm.quantity} onChange={e => setCounterForm({...counterForm, quantity: e.target.value})}
                                  placeholder="Qty kg" className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setCounterFor(null)} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-semibold">Cancel</button>
                                <button onClick={() => handleCounterOffer(offer.id)}
                                  disabled={offerAction === 'counter-' + offer.id}
                                  className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                  {offerAction === 'counter-' + offer.id ? 'Sending...' : 'Send Counter'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Deal Lock Panel */}
          <DealLockPanel
            conversationId={conversationId}
            otherUserId={otherUserId}
            produceId={conversations.find(c => c.conversationId === conversationId)?.produceId}
            produceName={conversations.find(c => c.conversationId === conversationId)?.produceName}
          />

          {/* Make Offer button */}
          <div className="bg-white border-x border-navy-100 px-3 pt-2">
            <button onClick={() => setShowOfferForm(!showOfferForm)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-mustard-400 text-navy-900 rounded-xl font-semibold text-sm hover:bg-mustard-300 transition">
              <Handshake className="w-4 h-4" /> {showOfferForm ? 'Close Offer Form' : 'Make Structured Offer'}
            </button>
            {showOfferForm && (
              <form onSubmit={handleCreateOffer} className="mt-2 space-y-2 pb-3">
                <div className="flex gap-2">
                  <input type="number" value={offerForm.price} onChange={e => setOfferForm({...offerForm, price: e.target.value})}
                    placeholder="Price ₹/kg" required className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                  <input type="number" value={offerForm.quantity} onChange={e => setOfferForm({...offerForm, quantity: e.target.value})}
                    placeholder="Quantity kg" required className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <input value={offerForm.note} onChange={e => setOfferForm({...offerForm, note: e.target.value})}
                  placeholder="Note (optional)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                <button type="submit" disabled={offerAction === 'create'}
                  className="w-full py-2.5 bg-navy-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {offerAction === 'create' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Handshake className="w-4 h-4" /> Send Offer</>}
                </button>
              </form>
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
