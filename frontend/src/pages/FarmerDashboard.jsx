import { useState } from 'react';
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
import { Package, ShoppingCart, Wallet, FileText, Mic, BarChart3, Navigation } from 'lucide-react';
import { priceChartData, orders } from '../data/mockData';

import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';

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
  const { language } = useFarmerLanguage();
  const greetKey = getGreetingKey();
  const [activeView, setActiveView] = useState('dashboard');

import { useAuth } from '../context/AuthContext';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Farmer';
8842d0d097e028a5bf77b37e25309ec8041f382c

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          {/* ─── Header row with language selector ─── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
                {t_key(language, greetKey)}, Rajesh 👋
              </h1>
              <p className="text-navy-500 mt-1">{t_key(language, 'dashboardSub')}</p>
            </div>
            <LanguageSelector />
          </div>

          {/* ─── Quick Actions ─── */}
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
                    onClick={() => setActiveView(isActive ? 'dashboard' : action.key)}
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
                    {/* Decorative gradient overlay */}
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${
                      isActive ? 'bg-white/10' : 'bg-navy-50'
                    } group-hover:scale-110 transition-transform`} />
                  </button>
                );
              })}

            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Good morning, {firstName} 👋</h1>
            <p className="text-navy-500 mt-1">Here's an overview of your marketplace activity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Package className="w-5 h-5" />}
              label="Produce Listed"
              value="1,250 kg"
              change="+12%"
              changeType="up"
              color="primary"
            />
            <StatCard
              icon={<ShoppingCart className="w-5 h-5" />}
              label="Active Orders"
              value="8"
              change="+2"
              changeType="up"
              color="blue"
            />
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              label="This Month's Earnings"
              value="₹42,500"
              change="+8.5%"
              changeType="up"
              color="emerald"
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Buyer Requests"
              value="5"
              change="3 new"
              changeType="up"
              color="accent"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <PriceAdvisor />
            </div>
            <div>
              <NotificationPanel />
 8842d0d097e028a5bf77b37e25309ec8041f382c
            </div>
          </div>

          {/* ─── Active Feature View ─── */}
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

          {/* ─── Default Dashboard View ─── */}
          {activeView === 'dashboard' && (
            <>
              {/* ─── Stat Cards ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={<Package className="w-5 h-5" />}
                  label={t_key(language, 'produceListed')}
                  value="1,250 kg"
                  change="+12%"
                  changeType="up"
                  color="primary"
                />
                <StatCard
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label={t_key(language, 'activeOrders')}
                  value="8"
                  change="+2"
                  changeType="up"
                  color="blue"
                />
                <StatCard
                  icon={<Wallet className="w-5 h-5" />}
                  label={t_key(language, 'monthlyEarnings')}
                  value="₹42,500"
                  change="+8.5%"
                  changeType="up"
                  color="emerald"
                />
                <StatCard
                  icon={<FileText className="w-5 h-5" />}
                  label={t_key(language, 'buyerRequestCount')}
                  value="5"
                  change="3 new"
                  changeType="up"
                  color="accent"
                />
              </div>

              {/* ─── Market Snapshot (quick TrendInsights preview) ─── */}
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { emoji: '🍅', name: 'Tomato', price: '₹28', trend: '+4.2%', up: true },
                      { emoji: '🧅', name: 'Onion', price: '₹24', trend: '-1.8%', up: false },
                      { emoji: '🌾', name: 'Rice', price: '₹32', trend: '+1.2%', up: true },
                      { emoji: '🌶️', name: 'Chili', price: '₹115', trend: '+8.5%', up: true },
                    ].map((crop) => (
                      <button
                        key={crop.name}
                        onClick={() => setActiveView('insights')}
                        className="bg-white/10 rounded-xl p-3 hover:bg-white/15 transition text-left"
                      >
                        <span className="text-xl">{crop.emoji}</span>
                        <p className="text-xs font-semibold mt-1">{crop.name}</p>
                        <p className="text-lg font-bold">{crop.price}<span className="text-xs font-normal text-white/60">/kg</span></p>
                        <p className={`text-[10px] font-semibold ${crop.up ? 'text-emerald-400' : 'text-red-400'}`}>{crop.trend}</p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveView('insights')}
                    className="w-full mt-3 py-2 bg-white/10 rounded-xl text-xs font-semibold text-mustard-300 hover:bg-white/15 transition"
                  >
                    {language === 'hi' ? 'सभी रुझान देखें →' : 'View All Trends →'}
                  </button>
                </div>
              </div>

              {/* ─── Voice Assistant + Recommendations ─── */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <VoiceAssistant />
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

              {/* ─── Price Advisor + Notifications ─── */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  <PriceAdvisor />
                </div>
                <div>
                  <NotificationPanel />
                </div>
              </div>

              {/* ─── Price Chart + Recent Orders ─── */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <PriceChart
                  data={priceChartData}
                  dataKeys={[
                    { name: 'month', xKey: 'month' },
                    { name: 'tomato', label: 'Tomato' },
                    { name: 'onion', label: 'Onion' },
                  ]}
                  title={`${t_key(language, 'recentOrders')} (₹/kg)`}
                  colors={['#0f2a4a', '#d4a017']}
                  height={250}
                />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {t_key(language, 'recentOrders')}
                  </h3>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <OrderTracker key={order.id} order={order} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
