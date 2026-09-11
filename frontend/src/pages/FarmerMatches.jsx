import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MatchCard from '../components/MatchCard';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut } from '../api';
import { onNotification } from '../utils/messageStream';
import { Sparkles, Flame, Star, MessageSquare, Lock, CheckCircle, RefreshCw, AlertCircle, Building2, ShieldCheck, X } from 'lucide-react';

const TABS = [
  { key: 'new', label: 'New Matches', icon: Flame, emoji: '🔥' },
  { key: 'best', label: 'Best Matches', icon: Star, emoji: '⭐' },
  { key: 'discussions', label: 'Deal Discussions', icon: MessageSquare, emoji: '💬' },
  { key: 'locked', label: 'Active Deals', icon: Lock, emoji: '🔒' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, emoji: '✅' },
];

export default function FarmerMatches() {
  const { user, isGuestModeActive, openAuthRequired } = useAuth();
  const navigate = useNavigate();

  if (isGuestModeActive) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-8 lg:pl-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-4">🎉</span>
            <p className="text-lg font-semibold text-gray-700 mb-2">Sign in to view matches</p>
            <p className="text-sm text-gray-500 mb-4">Log in as a farmer to view buyer matches and initiate deals.</p>
            <button onClick={openAuthRequired} className="px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
              Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('new');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingMatchId, setStartingMatchId] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const fetchMatches = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/api/matches/farmer?filter=${activeTab}`);
      setMatches(data || []);
    } catch (err) {
      if (err.message?.includes('Session expired')) {
        navigate('/login', { state: { from: { pathname: '/farmer/matches' } } });
        return;
      }
      setError(err.message || 'Failed to load matches');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, activeTab, navigate]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Real-time wakeup & polling
  useEffect(() => {
    const unsubscribe = onNotification((notif) => {
      if (notif.type === 'NEW_MATCH' || notif.type === 'MATCH_UPDATED') {
        fetchMatches(false);
      }
    });
    const interval = setInterval(() => fetchMatches(false), 8000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchMatches]);

  const handleStartDeal = async (matchId, isExisting = false) => {
    const match = matches.find(m => m.id === matchId);
    if (isExisting && match?.conversationId) {
      navigate(`/farmer/chat/${match.conversationId}/${match.buyer?.id}`);
      return;
    }

    setStartingMatchId(matchId);
    try {
      const res = await apiPost(`/api/matches/${matchId}/start-deal`, {});
      const data = res?.data || res;
      if (data?.conversationId) {
        navigate(`/farmer/chat/${data.conversationId}/${data.buyerId}`);
      } else {
        await fetchMatches(false);
      }
    } catch (err) {
      alert(err.message || 'Could not start deal');
      setStartingMatchId(null);
    }
  };

  const handleSkip = async (matchId) => {
    try {
      await apiPut(`/api/matches/${matchId}/skip`, {});
      setMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (err) {
      alert(err.message || 'Could not skip match');
    }
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-navy-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🎉</span>
                <h1 className="text-2xl font-black text-navy-950">My Matches</h1>
              </div>
              <p className="text-sm text-gray-600">
                Two-way AI matching connects your produce with verified bulk buyers.
                <span className="font-bold text-navy-900 ml-1">You decide when to start the deal.</span>
              </p>
            </div>
            <button
              onClick={() => fetchMatches(true)}
              className="self-start md:self-auto px-4 py-2.5 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-xl font-semibold text-xs transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Matches
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 rounded-2xl font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-md shadow-navy-900/10 scale-[1.02]'
                      : 'bg-white text-navy-700 hover:bg-navy-50 border border-navy-100'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Matches Grid */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy-700">Searching active buyer requirements...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-navy-200 p-12 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 bg-mustard-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🥭
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">No matches in this category</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Your produce listings are <span className="font-bold text-emerald-600">ACTIVE</span>.
                We continuously scan incoming bulk requirements and will notify you immediately with a live popup and notification when a match is found.
              </p>
              <button
                onClick={() => navigate('/farmer/add-produce')}
                className="px-6 py-3 bg-navy-900 text-white rounded-xl font-bold text-sm hover:bg-navy-800 transition"
              >
                + List More Produce
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onStartDeal={handleStartDeal}
                  onViewBuyer={setSelectedBuyer}
                  onSkip={handleSkip}
                  isStarting={startingMatchId === match.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Buyer Detail Modal */}
        {selectedBuyer && (
          <div className="fixed inset-0 z-[100] bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-navy-100 animate-[scaleIn_0.2s_ease-out]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-navy-700" />
                  <h3 className="text-lg font-bold text-navy-900">{selectedBuyer.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedBuyer(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-navy-700 bg-gray-50 p-4 rounded-2xl mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Verification</span>
                  {selectedBuyer.verified ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Business
                    </span>
                  ) : (
                    <span className="text-gray-500">Standard Member</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Rating</span>
                  <span className="font-bold text-navy-900">⭐ {selectedBuyer.rating || '5.0'} / 5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Payment Protection</span>
                  <span className="text-emerald-600 font-semibold">✓ Mitti2Market Escrow Safe</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBuyer(null)}
                className="w-full py-3 bg-navy-900 text-white rounded-xl font-bold text-sm hover:bg-navy-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
