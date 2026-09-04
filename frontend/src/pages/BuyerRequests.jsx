import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ShoppingCart, Filter, MessageCircle, Check, X, RefreshCw, Clock, Star, ShieldCheck, Calendar, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut } from '../api';

export default function BuyerRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected
  const [actionLoading, setActionLoading] = useState(null);

  const fetchInterests = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/api/interests/farmer/${user.id}`);
      setInterests(data || []);
    } catch (err) {
      if (err.message.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, [user]);

  const handleAccept = async (interestId) => {
    setActionLoading(interestId);
    try {
      const result = await apiPut(`/api/interests/${interestId}/accept`, {});
      setInterests(prev => prev.map(i =>
        i.id === interestId ? { ...i, status: 'ACCEPTED', conversationId: result.conversationId } : i
      ));
    } catch (err) {
      if (err.message.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } });
        return;
      }
      setError(err.message || 'Failed to accept interest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (interestId) => {
    setActionLoading(interestId);
    try {
      await apiPut(`/api/interests/${interestId}/reject`, {});
      setInterests(prev => prev.map(i =>
        i.id === interestId ? { ...i, status: 'REJECTED' } : i
      ));
    } catch (err) {
      if (err.message.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } });
        return;
      }
      setError(err.message || 'Failed to reject interest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = (conversationId, otherUserId) => {
    navigate(`/farmer/chat/${conversationId}/${otherUserId}`);
  };

  const filtered = interests.filter(i => {
    if (filter === 'all') return true;
    return i.status === filter.toUpperCase();
  });

  const pendingCount = interests.filter(i => i.status === 'PENDING').length;
  const acceptedCount = interests.filter(i => i.status === 'ACCEPTED').length;

  const statusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'ACCEPTED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border border-red-200';
      case 'DEAL_AGREED': return 'bg-blue-50 text-blue-700 border border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Buyer Requests</h1>
              <p className="text-navy-500 mt-1">
                {pendingCount} pending · {acceptedCount} accepted · {interests.length} total
              </p>
            </div>
            <button
              onClick={fetchInterests}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { key: 'all', label: `All (${interests.length})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'accepted', label: `Accepted (${acceptedCount})` },
              { key: 'rejected', label: `Rejected` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${
                  filter === f.key
                    ? 'bg-navy-900 text-white'
                    : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading buyer requests...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {filter === 'all' ? 'No buyer requests yet' : `No ${filter} requests`}
              </p>
              <p className="text-sm text-gray-500">
                {filter === 'all'
                  ? 'When buyers show interest in your produce, they will appear here.'
                  : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((interest) => (
                <div key={interest.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-navy-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                        🏪
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-navy-900">{interest.buyerName}</h3>
                          <ShieldCheck className="w-4 h-4 text-primary-500" />
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">{interest.buyerEmail}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(interest.status)}`}>
                      {interest.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Produce Info */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-navy-900">{interest.produceName}</span>
                      {interest.produceCategory && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-navy-50 text-navy-700">
                          {interest.produceCategory}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-navy-500">
                      <span>{interest.produceQuantity} {interest.produceUnit} available</span>
                      <span>₹{interest.producePrice}/{interest.produceUnit}</span>
                      {interest.produceLocation && <span>📍 {interest.produceLocation}</span>}
                    </div>
                  </div>

                  {/* Buyer's Offer */}
                  <div className="mb-3">
                    {interest.offeredPrice && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-navy-500">Offered price:</span>
                        <span className="text-sm font-bold text-navy-900">₹{interest.offeredPrice}/{interest.produceUnit}</span>
                      </div>
                    )}
                    {interest.offeredQuantity && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-navy-500">Quantity wanted:</span>
                        <span className="text-sm font-semibold text-navy-700">{interest.offeredQuantity} {interest.produceUnit}</span>
                      </div>
                    )}
                    {interest.message && (
                      <div className="p-2 bg-mustard-50 rounded-lg border border-mustard-200 mt-2">
                        <p className="text-xs text-navy-700 italic">"{interest.message}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-navy-50">
                    {interest.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleReject(interest.id)}
                          disabled={actionLoading === interest.id}
                          className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 border border-red-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleAccept(interest.id)}
                          disabled={actionLoading === interest.id}
                          className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {actionLoading === interest.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <><Check className="w-4 h-4" /> Accept</>
                          )}
                        </button>
                      </>
                    )}
                    {interest.status === 'ACCEPTED' && interest.conversationId && (
                      <button
                        onClick={() => handleChat(interest.conversationId, interest.buyerId)}
                        className="flex-1 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat with Buyer
                      </button>
                    )}
                    {interest.status === 'REJECTED' && (
                      <span className="text-xs text-gray-400 py-2">Rejected</span>
                    )}
                    {interest.status === 'DEAL_AGREED' && (
                      <span className="text-xs text-emerald-600 py-2 font-semibold">✅ Deal Agreed</span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {interest.createdAt ? new Date(interest.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
