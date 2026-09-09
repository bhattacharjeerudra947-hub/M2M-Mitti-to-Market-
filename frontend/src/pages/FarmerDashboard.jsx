import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import PriceAdvisor from '../components/PriceAdvisor';
import NotificationPanel from '../components/NotificationPanel';
import PriceChart from '../components/PriceChart';
import OrderTracker from '../components/OrderTracker';
import VoiceAssistant from '../components/VoiceAssistant';
import TrendInsights from '../components/TrendInsights';
import MapRouteOptimizer from '../components/MapRouteOptimizer';
import LanguageSelector from '../components/LanguageSelector';
import DealAdvisorSummary from '../components/DealAdvisorSummary';
import { Package, ShoppingCart, Wallet, FileText, Mic, BarChart3, Navigation } from 'lucide-react';
import MarketPricesLive from '../components/MarketPricesLive';
import { useAuth } from '../context/AuthContext';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';
import { apiGet } from '../api';

function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
}

const QUICK_ACTIONS = [
  { key: 'voice', icon: Mic, color: 'from-primary-500 to-primary-600', shadow: 'shadow-primary-200', labelKey: 'speakToAI', labelHi: 'AI से बोलें', emoji: '🎤' },
  { key: 'insights', icon: BarChart3, color: 'from-navy-800 to-navy-900', shadow: 'shadow-navy-200', labelKey: 'marketCropInsights', labelHi: 'बाज़ार और फसल जानकारी', emoji: '🤖' },
  { key: 'route', icon: Navigation, color: 'from-mustard-500 to-mustard-600', shadow: 'shadow-mustard-200', labelKey: 'findOptimizeRoute', labelHi: 'मार्ग खोजें', emoji: '🗺️' },
];

export default function FarmerDashboard() {
  const { user, isGuestModeActive, openAuthRequired } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Farmer';
  const { language } = useFarmerLanguage();
  const greetKey = getGreetingKey();
  const [activeView, setActiveView] = useState('dashboard');

  // ─── Real stats from backend ───
  const [stats, setStats] = useState({ produceKg: 0, orders: 0, interests: 0, monthlyEarnings: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [priceChartData, setPriceChartData] = useState([]); // NEW: fixes ReferenceError

  useEffect(() => {
    if (!user) {
      setRecentOrders([]);
      return;
    }
    (async () => {
      try {
        const [produceData, orderData, interestData] = await Promise.all([
          apiGet(`/api/produce/farmer/${user.id}`).catch(() => []),
          apiGet(`/api/orders/farmer/${user.id}`).catch(() => []),
          apiGet(`/api/interests/farmer/${user.id}`).catch(() => []),
        ]);
        const produce = produceData || [];
        const ordersList = orderData || [];
        const interests = interestData || [];
        setStats({
          produceKg: produce.reduce((s, p) => s + (p.quantity || 0), 0),
          orders: ordersList.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
          interests: interests.filter(i => i.status === 'PENDING').length,
        });
        setRecentOrders(ordersList);
        // Real monthly earnings: delivered orders paid in the current month
        const now = new Date();
        const monthly = ordersList
          .filter((o) => o.status === 'DELIVERED' && o.orderDate && new Date(o.orderDate).getMonth() === now.getMonth())
          .reduce((s, o) => s + (o.totalPrice || 0), 0);
        setStats((prev) => ({ ...prev, monthlyEarnings: monthly }));

        // NEW: price chart data — placeholder until a real price-history endpoint exists
        setPriceChartData([
          { month: 'Apr', tomato: 22, onion: 18 },
          { month: 'May', tomato: 25, onion: 20 },
          { month: 'Jun', tomato: 30, onion: 19 },
          { month: 'Jul', tomato: 28, onion: 24 },
        ]);
      } catch {}
    })();
  }, [user]);

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          {/* Header row with language selector */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
                {t_key(language, greetKey)}, {firstName} 👋
              </h1>
              <p className="text-navy-500 mt-1">{t_key(language, 'dashboardSub') || 'Here\'s an overview of your marketplace activity.'}</p>
            </div>
            <LanguageSelector />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">
              {t_key(language, 'quickActions') || 'Quick Actions'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const isActive = activeView === action.key;
                return (
                  <button
                    key={action.key}
                    onClick={() => {
                      if (isGuestModeActive) { openAuthRequired(); return; }
                      setActiveView(isActive ? 'dashboard' : action.key);
                    }}
                    className={`relative overflow-hidden group p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-br ${action.color} text-white shadow-xl ${action.shadow} scale-[1.02]`
                        : 'bg-white border border-navy-100 shadow-sm hover:shadow-md hover:border-navy-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{action.emoji}</span>
                      <div>
                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-navy-900'}`}>
                          {language === 'hi' ? action.labelHi : (t_key(language, action.labelKey) || action.labelKey)}
                        </p>
                        <p className={`text-xs mt-0.5 ${isActive ? 'text-white/70' : 'text-navy-500'}`}>
                          {action.key === 'voice' && (language === 'hi' ? 'बोलकर सवाल पूछें' : 'Ask by speaking')}
                          {action.key === 'insights' && (language === 'hi' ? 'रुझान, भविष्यवाणी, सिफारिशें' : 'Trends, predictions, advice')}
                          {action.key === 'route' && (language === 'hi' ? 'फसल पिकअप मार्ग' : 'Farm pickup routes')}
                        </p>
                      </div>
                    </div>
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${
                      isActive ? 'bg-white/10' : 'bg-navy-50'
                    } group-hover:scale-110 transition-transform`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Feature View */}
          {activeView === 'voice' && (
            <div className="mb-8">
              <VoiceAssistant />
            </div>
          )}

          {activeView === 'insights' && (
            <div className="mb-8">
              <TrendInsights />
            </div>
          )}

          {activeView === 'route' && (
            <div className="mb-8">
              <MapRouteOptimizer />
            </div>
          )}

          {/* Default Dashboard View */}
          {activeView === 'dashboard' && (
            <>
              {/* Stat Cards — real backend data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={<Package className="w-5 h-5" />}
                  label={t_key(language, 'produceListed') || 'Produce Listed'}
                  value={stats.produceKg ? stats.produceKg.toLocaleString('en-IN') + ' kg' : '0 kg'}
                  color="primary"
                />
                <StatCard
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label={t_key(language, 'activeOrders') || 'Active Orders'}
                  value={String(stats.orders)}
                  color="blue"
                />
                <StatCard
                  icon={<Wallet className="w-5 h-5" />}
                  label={t_key(language, 'monthlyEarnings') || "This Month's Earnings"}
                  value={`₹${(stats.monthlyEarnings || 0).toLocaleString('en-IN')}`}
                  color="emerald"
                />
                <StatCard
                  icon={<FileText className="w-5 h-5" />}
                  label={t_key(language, 'buyerRequestCount') || 'Buyer Requests'}
                  value={String(stats.interests)}
                  color="accent"
                />
              </div>

              {/* AI Deal Advisor Summary — real deals + demand */}
              <DealAdvisorSummary />

              {/* Market Snapshot */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">
                  {t_key(language, 'marketSnapshot') || 'Market Snapshot'}
                </h3>
                <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-mustard-400" />
                    <span className="text-xs font-semibold text-mustard-300">
                      {t_key(language, 'currentCropTrends') || 'Current crop trends & important market info'}
                    </span>
                  </div>
                  <div className="p-1">
                    <MarketPricesLive limit={4} dark />
                  </div>
                  <button
                    onClick={() => setActiveView('insights')}
                    className="w-full mt-3 py-2 bg-white/10 rounded-xl text-xs font-semibold text-mustard-300 hover:bg-white/15 transition"
                  >
                    {language === 'hi' ? 'सभी रुझान देखें →' : 'View All Trends →'}
                  </button>
                </div>
              </div>

              {/* Voice Assistant + Recommendations */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {isGuestModeActive ? (
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl mb-3">🎤</span>
                    <p className="text-sm font-semibold text-navy-900 mb-1">Voice Assistant</p>
                    <p className="text-xs text-navy-500 mb-3">Sign in to use AI voice assistant</p>
                    <button onClick={openAuthRequired} className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition">Sign In to Use</button>
                  </div>
                ) : (
                  <VoiceAssistant />
                )}
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-navy-900 mb-3">
                    💡 {language === 'hi' ? 'AI सिफारिशें' : 'AI Recommendations'}
                  </h3>
                  <div className="space-y-3">
                    {[
                      { emoji: '🍅', text: language === 'hi' ? 'टमाटर अभी बेचें — कीमतें बढ़ रही हैं' : 'Sell tomatoes now — prices trending up', urgency: 'high' },
                      { emoji: '🌾', text: language === 'hi' ? 'गेहूं रोकें — 2-3 हफ्ते में कीमत बढ़ सकती है' : 'Hold wheat — prices may recover in 2-3 weeks', urgency: 'medium' },
                      { emoji: '🗺️', text: language === 'hi' ? 'नाशिक मंडी में चावल 8% ज़्यादा मिल रहा है' : 'Nashik Mandi offers 8% higher rice prices', urgency: 'low' },
                    ].map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveView('insights')}
                        className="w-full text-left flex items-start gap-2.5 p-3 bg-navy-50/50 rounded-xl hover:bg-navy-50 transition"
                      >
                        <span className="text-lg mt-0.5">{rec.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-navy-800 leading-relaxed">{rec.text}</p>
                          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            rec.urgency === 'high' ? 'bg-red-100 text-red-700' :
                            rec.urgency === 'medium' ? 'bg-mustard-100 text-mustard-700' :
                            'bg-navy-100 text-navy-600'
                          }`}>
                            {rec.urgency === 'high' ? (language === 'hi' ? 'ज़रूरी' : 'Urgent') :
                             rec.urgency === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Medium') :
                             (language === 'hi' ? 'सूचना' : 'Info')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Advisor + Notifications */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  {isGuestModeActive ? (
                    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <span className="text-3xl mb-3">🧠</span>
                      <p className="text-sm font-semibold text-navy-900 mb-1">AI Price Advisor</p>
                      <p className="text-xs text-navy-500 mb-3">Sign in to get personalized pricing advice</p>
                      <button onClick={openAuthRequired} className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition">Sign In to Use</button>
                    </div>
                  ) : (
                    <PriceAdvisor />
                  )}
                </div>
                <div>
                  <NotificationPanel />
                </div>
              </div>

              {/* Price Chart + Recent Orders */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <PriceChart
                  data={priceChartData}
                  dataKeys={[
                    { name: 'month', xKey: 'month' },
                    { name: 'tomato', label: 'Tomato' },
                    { name: 'onion', label: 'Onion' },
                  ]}
                  title={t_key(language, 'priceTrends') || 'Price Trends (₹/kg)'}
                  colors={['#0f2a4a', '#d4a017']}
                  height={250}
                />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {t_key(language, 'recentOrders') || 'Recent Orders'}
                  </h3>
                  {recentOrders.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">
                      {user ? 'No orders yet.' : 'Sign in to view your orders.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.slice(0, 5).map((order) => (
                        <OrderTracker key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}