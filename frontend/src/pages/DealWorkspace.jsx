import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Truck, MapPin, Package,
  User, Building2, Loader2, AlertTriangle, MessageCircle, FileText, ShieldAlert
} from 'lucide-react';
import { getDeal, getLogistics, cancelDeal, getDealTimeline, getDisputes, openDispute } from '../api/dealApi';
import { getConversationOffers } from '../api/dealApi';
import LogisticsTracking from '../components/LogisticsTracking';
import RouteOptimizerPanel from '../components/RouteOptimizerPanel';
import DealRouteMap from '../components/DealRouteMap';
import DealRatingModal from '../components/DealRatingModal';
import ReportModal from '../components/ReportModal';
import { getDealRatings } from '../services/ratingApi';
import { getDealRouteInfo } from '../api/locationApi';

const STATUS_LABELS = {
  NEGOTIATING: '💬 Bargaining', LOCK_PENDING: '⏳ Confirming', LOCKED: '🔒 Deal Locked',
  LOGISTICS_PENDING: '🚚 Logistics Pending', LOGISTICS_ASSIGNED: '👨✈️ Assigned',
  PICKUP_SCHEDULED: '📅 Pickup Scheduled', PICKED_UP: '📦 Picked Up',
  IN_TRANSIT: '🚚 In Transit', OUT_FOR_DELIVERY: '🏪 Out for Delivery',
  DELIVERED: '📦 Delivered', COMPLETED: '✅ Completed', CANCELLED: '❌ Cancelled', DISPUTED: '⚠️ Disputed'
};

const STATUS_COLORS = {
  NEGOTIATING: 'bg-gray-100 text-gray-700', LOCK_PENDING: 'bg-amber-50 text-amber-700',
  LOCKED: 'bg-blue-50 text-blue-700', LOGISTICS_PENDING: 'bg-purple-50 text-purple-700',
  LOGISTICS_ASSIGNED: 'bg-indigo-50 text-indigo-700', PICKUP_SCHEDULED: 'bg-cyan-50 text-cyan-700',
  PICKED_UP: 'bg-orange-50 text-orange-700', IN_TRANSIT: 'bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700', DELIVERED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-50 text-red-600',
  DISPUTED: 'bg-red-50 text-red-700'
};

const EVENT_EMOJI = {
  DEAL_CREATED: '🤝', OFFER_CREATED: '📩', OFFER_COUNTERED: '🔄', OFFER_ACCEPTED: '✅',
  OFFER_REJECTED: '❌', FARMER_CONFIRMED: '👨🌾', BUYER_CONFIRMED: '🏪', DEAL_LOCKED: '🔒',
  QUANTITY_RESERVED: '📦', AMENDMENT_ACCEPTED: '✏️', LOGISTICS_SELECTED: '🚚',
  LOGISTICS_ASSIGNED: '👨✈️', PICKUP_SCHEDULED: '📅', PICKED_UP: '📦', IN_TRANSIT: '🚚',
  OUT_FOR_DELIVERY: '🏪', DELIVERED: '📬', DELIVERY_CONFIRMED: '✅', DEAL_COMPLETED: '🎉',
  DEAL_CANCELLED: '❌', DISPUTE_OPENED: '⚠️'
};

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; }
};
const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return '—'; }
};

const WORKFLOW_STEPS = ['LOCK_PENDING', 'LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];

export default function DealWorkspace() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { user, isGuestModeActive, openAuthRequired } = useAuth();

  if (isGuestModeActive) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-8 lg:pl-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-4">🤝</span>
            <p className="text-lg font-semibold text-gray-700 mb-2">Sign in to view deals</p>
            <p className="text-sm text-gray-500 mb-4">You need an account to manage deals.</p>
            <button onClick={openAuthRequired} className="px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">Sign In</button>
          </div>
        </main>
      </div>
    );
  }

  const [deal, setDeal] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [logistics, setLogistics] = useState(null);
  const [offers, setOffers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('QUALITY_ISSUE');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [myRatingExists, setMyRatingExists] = useState(false);
  const [myRating, setMyRating] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const isFarmer = user?.role === 'FARMER';
  const sidebarRole = isFarmer ? 'farmer' : 'business';

  // Check if this user already rated the deal (one rating per party per completed deal)
  useEffect(() => {
    if (deal?.status === 'COMPLETED' && dealId) {
      getDealRatings(dealId).then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          const mine = res.data.find((r) => r.reviewerId === user?.id || r.raterId === user?.id || (r.reviewer && r.reviewer.id === user?.id));
          setMyRatingExists(!!mine);
          setMyRating(mine || null);
        }
      });
    }
  }, [deal?.status, dealId, user?.id]);

  const load = () => {
    if (!dealId || !user) return;
    setLoading(true);
    setError('');
    Promise.allSettled([
      getDeal(dealId),
      getDealTimeline(dealId),
      getLogistics(dealId),
      getDisputes(dealId),
      getDealRouteInfo(dealId),
    ]).then(([d, t, l, dis, rInfo]) => {
      if (d.status === 'fulfilled') {
        setDeal(d.value);
        if (d.value?.conversationId) {
          getConversationOffers(d.value.conversationId).then(setOffers).catch(() => {});
        }
      } else {
        setError(d.reason?.message || 'Failed to load deal');
      }
      if (t.status === 'fulfilled') setTimeline(t.value || []);
      if (l.status === 'fulfilled') setLogistics(l.value);
      if (dis.status === 'fulfilled') setDisputes(dis.value || []);
      if (rInfo.status === 'fulfilled') setRouteInfo(rInfo.value);
      setLoading(false);
    });
  };

  useEffect(load, [dealId, user]);

  // Lightweight logistics-only refresh (used after tracking actions)
  const refreshLogistics = () => {
    if (!dealId) return Promise.resolve();
    return getLogistics(dealId).then((l) => {
      setLogistics(l);
      return l;
    }).catch(() => {});
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this deal? Reserved quantity will be released back to the listing.')) return;
    setBusy(true);
    try {
      await cancelDeal(dealId);
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const handleOpenDispute = async () => {
    setBusy(true);
    try {
      await openDispute(dealId, { reason: disputeReason, description: disputeDesc });
      setShowDisputeForm(false);
      setDisputeDesc('');
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const currentIdx = deal ? WORKFLOW_STEPS.indexOf(deal.status) : -1;

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading deal workspace...</p>
            </div>
          ) : deal ? (
            <>
              {/* ═══ HEADER ═══ */}
              <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 sm:p-6 mb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Deal ID</p>
                    <h1 className="text-2xl font-bold text-navy-900">{deal.dealId}</h1>
                    <p className="text-sm text-navy-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Created {formatDateTime(deal.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[deal.status] || deal.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase">Product</p>
                    <p className="text-sm font-bold text-navy-900 flex items-center gap-1"><Package className="w-3.5 h-3.5 text-mustard-600" />{deal.cropName}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase">Quantity</p>
                    <p className="text-sm font-bold text-navy-900">{deal.quantity} {deal.unit}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase">Price</p>
                    <p className="text-sm font-bold text-navy-900">{formatINR(deal.agreedPrice)}/{deal.unit}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase">Total</p>
                    <p className="text-sm font-bold text-emerald-700">{formatINR(deal.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* ═══ WORKFLOW PROGRESS ═══ */}
              {currentIdx >= 0 && (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 mb-5">
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Transaction Workflow</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {WORKFLOW_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center gap-1 flex-shrink-0">
                        <div className={`flex flex-col items-center px-1 ${i <= currentIdx ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {i < currentIdx
                            ? <CheckCircle2 className="w-5 h-5" />
                            : i === currentIdx
                              ? <div className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>
                              : <Circle className="w-5 h-5" />}
                          <span className="text-[9px] font-semibold mt-1 whitespace-nowrap">{STATUS_LABELS[s]?.replace(/^[^\s]+\s/, '')}</span>
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div className={`h-0.5 w-5 sm:w-8 ${i < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {/* ═══ PARTIES + AGREEMENT ═══ */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Parties</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-mustard-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-mustard-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-navy-900">{deal.farmerName}</p>
                          <p className="text-[11px] text-gray-500">Farmer · {deal.farmerId === user?.id ? 'You' : 'Seller'}</p>
                        </div>
                        {deal.farmerConfirmed && <span className="ml-auto text-[10px] font-bold text-emerald-600">✓ Confirmed</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-navy-900">{deal.buyerName}</p>
                          <p className="text-[11px] text-gray-500">Buyer · {deal.buyerId === user?.id ? 'You' : 'Buyer'}</p>
                        </div>
                        {deal.buyerConfirmed && <span className="ml-auto text-[10px] font-bold text-emerald-600">✓ Confirmed</span>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Final Agreement</p>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-semibold text-navy-900">{deal.cropName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-semibold text-navy-900">{deal.quantity} {deal.unit}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold text-navy-900">{formatINR(deal.agreedPrice)}/{deal.unit}</span></div>
                      <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Total value</span><span className="font-bold text-emerald-700">{formatINR(deal.totalAmount)}</span></div>
                      <div className="flex justify-between items-start gap-2"><span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Pickup</span><span className="font-semibold text-navy-900 text-right">{deal.pickupLocation || '—'}</span></div>
                      <div className="flex justify-between items-start gap-2"><span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Delivery</span><span className="font-semibold text-navy-900 text-right">{deal.deliveryLocation || '—'}</span></div>
                      {deal.conditions && <div className="flex justify-between items-start gap-2"><span className="text-gray-500">Conditions</span><span className="font-semibold text-navy-900 text-right">{deal.conditions}</span></div>}
                      {deal.amendmentCount > 0 && (
                        <div className="flex justify-between"><span className="text-gray-500">Amendments</span><span className="font-semibold text-amber-600">✏️ {deal.amendmentCount}× ({formatDate(deal.amendedAt)})</span></div>
                      )}
                    </div>
                  </div>

                  {/* ═══ CONFIRMATIONS ═══ */}
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Confirmations</p>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-sm ${deal.farmerConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {deal.farmerConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        <span className="font-semibold">Farmer</span>
                        <span className="ml-auto text-xs">{deal.farmerConfirmed ? '✓ Confirmed' : 'Waiting'}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${deal.buyerConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {deal.buyerConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        <span className="font-semibold">Buyer</span>
                        <span className="ml-auto text-xs">{deal.buyerConfirmed ? '✓ Confirmed' : 'Waiting'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* ═══ LOGISTICS & DYNAMIC ROUTE OPTIMIZATION ═══ */}
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Logistics & Route</p>
                      {logistics?.type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {logistics.type === 'OWN' ? '🚗 Own Logistics' : '🚚 Mitti2Market Logistics'}
                        </span>
                      )}
                    </div>

                    {/* Interactive Route Optimizer with Dual Location Selectors */}
                    {['LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED'].includes(deal.status) && (
                      <RouteOptimizerPanel
                        dealId={dealId}
                        deal={deal}
                        onConfirmed={load}
                        readOnly={deal.status !== 'LOCKED' && deal.status !== 'LOGISTICS_PENDING'}
                      />
                    )}

                    {/* Shared Google Map Display for deal with route data */}
                    {routeInfo && routeInfo.distanceKm && !['LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED'].includes(deal.status) && (
                      <DealRouteMap
                        origin={{
                          latitude: routeInfo.pickupLatitude,
                          longitude: routeInfo.pickupLongitude,
                          label: 'Pickup',
                        }}
                        destination={{
                          latitude: routeInfo.deliveryLatitude,
                          longitude: routeInfo.deliveryLongitude,
                          label: 'Destination',
                        }}
                        optimalRoute={routeInfo}
                        alternatives={routeInfo.alternativeRoutes || []}
                        selectionReason={routeInfo.selectionReason}
                        selectionType={routeInfo.selectionType}
                        distanceKm={routeInfo.distanceKm}
                        durationMinutes={routeInfo.durationMinutes}
                        estimatedCost={routeInfo.estimatedCost}
                      />
                    )}

                    {logistics ? (
                      <>
                        <div className="space-y-2.5 text-sm pt-2 border-t border-navy-50">
                          <div className="flex justify-between"><span className="text-gray-500">Tracking ID</span><span className="font-bold text-navy-900">{logistics.trackingId}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Status</span>
                            <span className={`font-semibold ${logistics.status === 'DELIVERED' ? 'text-emerald-600' : logistics.status === 'REQUESTED' ? 'text-amber-600' : 'text-blue-700'}`}>{logistics.status.replace(/_/g, ' ')}</span>
                          </div>
                          {logistics.vehicleNumber && <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-semibold text-navy-900">{logistics.vehicleNumber}</span></div>}
                          {logistics.expectedDelivery && <div className="flex justify-between"><span className="text-gray-500">Expected delivery</span><span className="font-semibold text-navy-900">{formatDateTime(logistics.expectedDelivery)}</span></div>}
                        </div>
                        <LogisticsTracking logistics={logistics} deal={deal} onUpdate={refreshLogistics} />
                      </>
                    ) : (
                      !['LOCKED', 'LOGISTICS_PENDING'].includes(deal.status) && (
                        <p className="text-sm text-gray-500">
                          No logistics arranged for this deal yet.
                        </p>
                      )
                    )}
                  </div>

                  {/* ═══ OFFERS ═══ */}
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Negotiation Offers</p>
                    </div>
                    {offers.length === 0 ? (
                      <p className="text-sm text-gray-500">No structured offers recorded.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {offers.map((o) => (
                          <div key={o.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-navy-900">{o.senderName}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                o.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' :
                                o.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                o.status === 'COUNTERED' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {o.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{formatINR(o.price)}/{o.unit} · {o.quantity} {o.unit} · Total {formatINR(o.total)}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(o.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ═══ TIMELINE ═══ */}
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-400 uppercase font-medium tracking-wide">Audit Timeline</p>
                    </div>
                    {timeline.length === 0 ? (
                      <p className="text-sm text-gray-500">No events recorded yet.</p>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-200" />
                        {timeline.map((ev) => (
                          <div key={ev.id} className="relative pb-4">
                            <div className="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-navy-900 ring-4 ring-navy-50" />
                            <p className="text-sm text-navy-900 flex items-center gap-1.5">
                              <span>{EVENT_EMOJI[ev.eventType] || '•'}</span>
                              <span className="font-semibold">{ev.eventType.replace(/_/g, ' ')}</span>
                            </p>
                            {ev.description && <p className="text-xs text-gray-600 mt-0.5">{ev.description}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(ev.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ ACTIONS ═══ */}
              <div className="mt-6 bg-white rounded-2xl border border-navy-100 shadow-sm p-5 flex flex-wrap gap-3">
                <button onClick={() => navigate(`/${sidebarRole}/chat`)}
                  className="px-4 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition inline-flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Open Chat
                </button>
                {!['COMPLETED', 'CANCELLED'].includes(deal.status) && (
                  <button onClick={handleCancel} disabled={busy}
                    className="px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition inline-flex items-center gap-2 disabled:opacity-50">
                    Cancel Deal
                  </button>
                )}
                {!['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(deal.status) && (
                  <button onClick={() => setShowDisputeForm(!showDisputeForm)}
                    className="px-4 py-2.5 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-100 transition inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Report Issue
                  </button>
                )}
                {deal.status === 'COMPLETED' && !myRatingExists && (
                  <button onClick={() => setShowRatingModal(true)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-2">
                    ⭐ Rate Experience
                  </button>
                )}
                <button onClick={() => setShowReportModal(true)}
                  className="px-4 py-2.5 bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100 transition inline-flex items-center gap-2">
                  🚩 Report
                </button>

                {deal.status === 'COMPLETED' && myRating && (
                  <div className="w-full mt-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center gap-2">
                    <span className="font-semibold">⭐ You rated this deal:</span>
                    <span className="font-bold text-amber-500">
                      {'★'.repeat(myRating.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (myRating.rating || 5)))}
                      <span className="text-gray-700 ml-1">({myRating.rating}/5)</span>
                    </span>
                    {myRating.comment && <span className="italic text-emerald-800">— "{myRating.comment}"</span>}
                  </div>
                )}

                {deal.status === 'COMPLETED' && !myRatingExists && (
                  <div className="w-full mt-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm">🎉 Deal Completed! Rate your experience</p>
                      <p className="text-amber-800">Your feedback builds community trust between farmers and businesses.</p>
                    </div>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition shrink-0"
                    >
                      ⭐ Rate Experience Now
                    </button>
                  </div>
                )}
              </div>

              {/* ═══ DEAL RATING MODAL ═══ */}
              <DealRatingModal
                isOpen={showRatingModal}
                onClose={() => { setShowRatingModal(false); setMyRatingExists(true); }}
                dealId={dealId}
                otherPartyName={isFarmer ? (deal.buyerName || deal.buyer?.name) : (deal.farmerName || deal.farmer?.name)}
                onRatingSubmitted={load}
              />

              {/* ═══ REPORT MODAL (report the deal) ═══ */}
              <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetType="DEAL"
                targetId={dealId}
                targetName={`Deal #${dealId}`}
              />

              {/* ═══ DISPUTE FORM ═══ */}
              {showDisputeForm && (
                <div className="mt-4 bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
                  <p className="text-sm font-bold text-navy-900 mb-3">Open a Dispute</p>
                  <div className="space-y-3">
                    <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-navy-100 rounded-xl text-sm">
                      {['QUALITY_ISSUE', 'QUANTITY_ISSUE', 'LATE_DELIVERY', 'DAMAGED_GOODS', 'MISSING_GOODS', 'PAYMENT_ISSUE', 'OTHER'].map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} rows="3"
                      placeholder="Describe the issue..."
                      className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm resize-none" />
                    <div className="flex gap-2">
                      <button onClick={handleOpenDispute} disabled={busy}
                        className="px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition disabled:opacity-50">
                        {busy ? 'Opening...' : 'Submit Dispute'}
                      </button>
                      <button onClick={() => setShowDisputeForm(false)}
                        className="px-4 py-2.5 text-sm text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ DISPUTES LIST ═══ */}
              {disputes.length > 0 && (
                <div className="mt-5 bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 uppercase font-medium tracking-wide mb-3">Disputes</p>
                  <div className="space-y-2">
                    {disputes.map((d) => (
                      <div key={d.id} className="p-3 bg-red-50/50 rounded-xl text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-700">{d.reason.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-red-600 border border-red-200">{d.status}</span>
                        </div>
                        {d.description && <p className="text-xs text-gray-600 mt-1">{d.description}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">By {d.raisedByName} · {formatDateTime(d.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}