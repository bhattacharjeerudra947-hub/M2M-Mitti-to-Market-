import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, X, Truck, Package, MapPin, Clock, AlertCircle, ChevronDown, ChevronUp, Star } from 'lucide-react';
import {
  initiateDealLock, confirmDeal, cancelDeal, getDealByConversation,
  selectLogistics, updateLogisticsDetails, updateLogisticsStatus, getLogistics,
  getTimeline, confirmDelivery
} from '../api/dealApi';
import { apiGet } from '../api';

const STATUS_FLOW = ['NEGOTIATING','LOCK_PENDING','LOCKED','LOGISTICS_PENDING','LOGISTICS_ASSIGNED',
  'PICKUP_SCHEDULED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'];

const STATUS_LABELS = {
  NEGOTIATING: '💬 Bargaining', LOCK_PENDING: '⏳ Confirming', LOCKED: '🔒 Deal Locked',
  LOGISTICS_PENDING: '🚚 Choose Logistics', LOGISTICS_ASSIGNED: '👨‍✈️ Transport Assigned',
  PICKUP_SCHEDULED: '📅 Pickup Scheduled', PICKED_UP: '📦 Picked Up', IN_TRANSIT: '🚚 In Transit',
  OUT_FOR_DELIVERY: '🏪 Out for Delivery', DELIVERED: '📦 Delivered', COMPLETED: '✅ Completed',
  CANCELLED: '❌ Cancelled', DISPUTED: '⚠️ Disputed'
};

export default function DealLockPanel({ conversationId, otherUserId, produceId, produceName }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLockForm, setShowLockForm] = useState(false);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [logistics, setLogistics] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Lock form state
  const [lockForm, setLockForm] = useState({
    cropName: produceName || '',
    quantity: '',
    unit: 'kg',
    agreedPrice: '',
    pickupLocation: '',
    deliveryLocation: '',
    conditions: '',
    farmerId: '',
    buyerId: '',
    produceId: produceId || ''
  });

  // Logistics details form
  const [logisticsForm, setLogisticsForm] = useState({
    transporterName: '', driverName: '', driverPhone: '',
    vehicleNumber: '', vehicleType: '', scheduledPickup: '', expectedDelivery: ''
  });

  // Delivery form
  const [deliveryForm, setDeliveryForm] = useState({ receivedQuantity: '', qualityNotes: '' });

  useEffect(() => { loadDeal(); }, [conversationId]);

  const loadDeal = async () => {
    if (!conversationId) { setLoading(false); return; }
    try {
      const data = await getDealByConversation(conversationId);
      setDeal(data);
      if (data) {
        loadLogistics(data.id);
      }
    } catch (err) {
      // No deal yet — that's OK
    } finally {
      setLoading(false);
    }
  };

  const loadLogistics = async (dealId) => {
    try {
      const data = await getLogistics(dealId);
      setLogistics(data);
      if (data && data.id) {
        const tl = await getTimeline(data.id);
        setTimeline(tl || []);
      }
    } catch {}
  };

  const handleInitiateLock = async () => {
    if (!lockForm.quantity || !lockForm.agreedPrice) {
      setError('Quantity and price are required');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      // Determine who is farmer and who is buyer
      const isFarmer = user.role === 'FARMER';
      const data = {
        ...lockForm,
        farmerId: isFarmer ? user.id : otherUserId,
        buyerId: isFarmer ? otherUserId : user.id,
        produceId: produceId || null
      };
      const result = await initiateDealLock(conversationId, data);
      setDeal(result);
      setShowLockForm(false);
      setLockForm({ cropName: produceName || '', quantity: '', unit: 'kg', agreedPrice: '', pickupLocation: '', deliveryLocation: '', conditions: '', farmerId: '', buyerId: '', produceId: produceId || '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const result = await confirmDeal(deal.id);
      setDeal(result);
      if (result.status === 'LOCKED') {
        loadLogistics(result.id);
      }
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this deal?')) return;
    setActionLoading(true);
    try {
      const result = await cancelDeal(deal.id);
      setDeal(result);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleSelectLogistics = async (type) => {
    setActionLoading(true);
    try {
      await selectLogistics(deal.id, type);
      await loadDeal();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already selected') || msg.includes('already active')) {
        setError('Logistics already selected for this deal.');
      } else if (msg.includes('must be locked')) {
        setError('Deal must be locked before choosing logistics.');
      } else {
        setError('Could not select logistics. Please try again.');
      }
    } finally { setActionLoading(false); }
  };

  const handleUpdateLogisticsDetails = async () => {
    if (!logistics) return;
    setActionLoading(true);
    try {
      await updateLogisticsDetails(logistics.id, logisticsForm);
      await loadLogistics(deal.id);
      setShowLogisticsForm(false);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleUpdateStatus = async (status, desc) => {
    setActionLoading(true);
    try {
      await updateLogisticsStatus(logistics.id, status, null, desc);
      await loadLogistics(deal.id);
      await loadDeal();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleConfirmDelivery = async () => {
    setActionLoading(true);
    try {
      const result = await confirmDelivery(deal.id, deliveryForm);
      setDeal(result);
      setShowDeliveryForm(false);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const isFarmer = user?.role === 'FARMER';
  const myConfirmed = isFarmer ? deal?.farmerConfirmed : deal?.buyerConfirmed;
  const otherConfirmed = isFarmer ? deal?.buyerConfirmed : deal?.farmerConfirmed;

  if (loading) return null;
  if (!deal) {
    // No deal — show "Initiate Deal Lock" button
    return (
      <div className="bg-white rounded-2xl border border-navy-100 p-4 mb-4">
        <button onClick={() => setShowLockForm(!showLockForm)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-navy-900 text-white rounded-xl font-semibold hover:bg-navy-800 transition">
          <Lock className="w-4 h-4" /> Initiate Deal Lock
        </button>
        {showLockForm && (
          <div className="mt-4 space-y-3">
            {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            <input value={lockForm.cropName} onChange={e => setLockForm({...lockForm, cropName: e.target.value})}
              placeholder="Crop name" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <div className="flex gap-2">
              <input value={lockForm.quantity} onChange={e => setLockForm({...lockForm, quantity: e.target.value})}
                type="number" placeholder="Quantity" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              <select value={lockForm.unit} onChange={e => setLockForm({...lockForm, unit: e.target.value})}
                className="w-20 px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option>kg</option><option>quintal</option><option>ton</option><option>pieces</option>
              </select>
            </div>
            <input value={lockForm.agreedPrice} onChange={e => setLockForm({...lockForm, agreedPrice: e.target.value})}
              type="number" placeholder="Agreed price per unit (₹)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={lockForm.pickupLocation} onChange={e => setLockForm({...lockForm, pickupLocation: e.target.value})}
              placeholder="Pickup location" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={lockForm.deliveryLocation} onChange={e => setLockForm({...lockForm, deliveryLocation: e.target.value})}
              placeholder="Delivery location" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={lockForm.conditions} onChange={e => setLockForm({...lockForm, conditions: e.target.value})}
              placeholder="Any conditions (optional)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            {lockForm.quantity && lockForm.agreedPrice && (
              <p className="text-sm font-semibold text-navy-900">Total: ₹{Number(lockForm.quantity * lockForm.agreedPrice).toLocaleString()}</p>
            )}
            <button onClick={handleInitiateLock} disabled={actionLoading}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50">
              {actionLoading ? 'Creating...' : 'Send Deal Lock Request'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Deal exists — show status panel
  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4 mb-4">
      {/* Deal Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-navy-900">{STATUS_LABELS[deal.status] || deal.status}</p>
          <p className="text-[10px] text-gray-400">{deal.dealId}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
          deal.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
          deal.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
          'bg-amber-50 text-amber-700'
        }`}>{deal.status}</span>
      </div>

      {/* Deal Details */}
      <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-semibold">{deal.cropName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-semibold">{deal.quantity} {deal.unit}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">₹{deal.agreedPrice}/{deal.unit}</span></div>
        <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
          <span className="text-gray-500 font-bold">Total</span>
          <span className="font-bold text-navy-900">₹{Number(deal.totalAmount).toLocaleString()}</span>
        </div>
        {deal.pickupLocation && <div className="flex justify-between"><span className="text-gray-500">Pickup</span><span>{deal.pickupLocation}</span></div>}
        {deal.deliveryLocation && <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{deal.deliveryLocation}</span></div>}
      </div>

      {/* Status Progress */}
      <div className="mb-3">
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s => s !== 'NEGOTIATING').map((s, i) => {
            const currentIdx = STATUS_FLOW.indexOf(deal.status);
            const sIdx = STATUS_FLOW.indexOf(s);
            const isActive = sIdx <= currentIdx;
            return (
              <div key={s} className={`flex-shrink-0 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-200'}`}
                style={{ width: `${100 / 8}%` }} />
            );
          })}
        </div>
      </div>

      {/* LOCK_PENDING — Confirm buttons */}
      {deal.status === 'LOCK_PENDING' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${myConfirmed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span>You: {myConfirmed ? '✅ Confirmed' : '⏳ Pending'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${otherConfirmed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span>{isFarmer ? 'Buyer' : 'Farmer'}: {otherConfirmed ? '✅ Confirmed' : '⏳ Pending'}</span>
          </div>
          {!myConfirmed && (
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={actionLoading}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                <Check className="w-3 h-3" /> Confirm Deal
              </button>
              <button onClick={handleCancel} disabled={actionLoading}
                className="py-2 px-4 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200 hover:bg-red-100 disabled:opacity-50">
                <X className="w-3 h-3 inline" /> Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* LOCKED — Choose logistics */}
      {deal.status === 'LOCKED' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Choose how this order will be transported:</p>
          <div className="flex gap-2">
            <button onClick={() => handleSelectLogistics('OWN')} disabled={actionLoading}
              className="flex-1 py-2.5 bg-white border border-navy-200 text-navy-900 rounded-xl text-xs font-semibold hover:bg-navy-50 disabled:opacity-50 flex items-center justify-center gap-1">
              🚚 Own Logistics
            </button>
            <button onClick={() => handleSelectLogistics('MITTI2MARKET')} disabled={actionLoading}
              className="flex-1 py-2.5 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 flex items-center justify-center gap-1">
              🚚 Mitti2Market
            </button>
          </div>
        </div>
      )}

      {/* LOGISTICS_PENDING / ASSIGNED — Show logistics details */}
      {['LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(deal.status) && logistics && (
        <div className="space-y-2">
          <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1 border border-blue-100">
            <p className="font-bold text-blue-900">{logistics.type === 'OWN' ? '🚚 Own Logistics' : '🚚 Mitti2Market Logistics'}</p>
            <p>Tracking: {logistics.trackingId}</p>
            <p>Status: {STATUS_LABELS[logistics.status] || logistics.status}</p>
            {logistics.driverName && <p>Driver: {logistics.driverName} ({logistics.vehicleNumber})</p>}
          </div>

          {/* Status update buttons (simplified for demo) */}
          {deal.status === 'LOGISTICS_PENDING' && !logistics.driverName && logistics.type === 'OWN' && (
            <button onClick={() => setShowLogisticsForm(true)}
              className="w-full py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 hover:bg-blue-100">
              📋 Add Transporter Details
            </button>
          )}
          {deal.status === 'LOGISTICS_PENDING' && (
            <button onClick={() => handleUpdateStatus('ASSIGNED', 'Transport assigned')}
              disabled={actionLoading} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
              👨‍✈️ Mark as Assigned
            </button>
          )}
          {deal.status === 'LOGISTICS_ASSIGNED' && (
            <button onClick={() => handleUpdateStatus('PICKUP_SCHEDULED', 'Pickup scheduled')}
              disabled={actionLoading} className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
              📅 Schedule Pickup
            </button>
          )}
          {deal.status === 'PICKUP_SCHEDULED' && (
            <button onClick={() => handleUpdateStatus('PICKED_UP', 'Picked up from seller')}
              disabled={actionLoading} className="w-full py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 disabled:opacity-50">
              📦 Mark Picked Up
            </button>
          )}
          {deal.status === 'PICKED_UP' && (
            <button onClick={() => handleUpdateStatus('IN_TRANSIT', 'Shipment in transit')}
              disabled={actionLoading} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
              🚚 Mark In Transit
            </button>
          )}
          {deal.status === 'IN_TRANSIT' && (
            <button onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY', 'Out for delivery')}
              disabled={actionLoading} className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50">
              🏪 Out for Delivery
            </button>
          )}
          {deal.status === 'OUT_FOR_DELIVERY' && isFarmer === false && (
            <button onClick={() => setShowDeliveryForm(true)}
              disabled={actionLoading} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
              ✅ Confirm Delivery Received
            </button>
          )}

          {/* Timeline toggle */}
          {timeline.length > 0 && (
            <div>
              <button onClick={() => setExpandedTimeline(!expandedTimeline)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                {expandedTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Timeline ({timeline.length} events)
              </button>
              {expandedTimeline && (
                <div className="mt-2 space-y-2 pl-3 border-l-2 border-blue-200">
                  {timeline.map((ev) => (
                    <div key={ev.id} className="text-[10px]">
                      <p className="font-semibold text-navy-900">{STATUS_LABELS[ev.status] || ev.status}</p>
                      <p className="text-gray-500">{ev.description}</p>
                      <p className="text-gray-400">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {deal.status === 'COMPLETED' && (
        <div className="text-center py-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <p className="text-sm font-bold text-emerald-700">✅ Deal Completed!</p>
          <p className="text-xs text-emerald-600">Completed {deal.completedAt ? new Date(deal.completedAt).toLocaleDateString() : ''}</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
          </div>
        </div>
      )}

      {/* Logistics details form modal */}
      {showLogisticsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setShowLogisticsForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-sm font-bold text-navy-900 mb-3">Transporter Details</h3>
            <div className="space-y-2">
              <input value={logisticsForm.transporterName} onChange={e => setLogisticsForm({...logisticsForm, transporterName: e.target.value})}
                placeholder="Transporter company" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <input value={logisticsForm.driverName} onChange={e => setLogisticsForm({...logisticsForm, driverName: e.target.value})}
                placeholder="Driver name" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <input value={logisticsForm.driverPhone} onChange={e => setLogisticsForm({...logisticsForm, driverPhone: e.target.value})}
                placeholder="Driver phone" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <input value={logisticsForm.vehicleNumber} onChange={e => setLogisticsForm({...logisticsForm, vehicleNumber: e.target.value})}
                placeholder="Vehicle number" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <input value={logisticsForm.vehicleType} onChange={e => setLogisticsForm({...logisticsForm, vehicleType: e.target.value})}
                placeholder="Vehicle type (e.g. Truck, Tempos)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <div className="flex gap-2">
                <button onClick={() => setShowLogisticsForm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-semibold">Cancel</button>
                <button onClick={handleUpdateLogisticsDetails} disabled={actionLoading}
                  className="flex-1 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery confirmation modal */}
      {showDeliveryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setShowDeliveryForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-sm font-bold text-navy-900 mb-3">✅ Confirm Delivery</h3>
            <div className="space-y-2">
              <input value={deliveryForm.receivedQuantity} onChange={e => setDeliveryForm({...deliveryForm, receivedQuantity: e.target.value})}
                type="number" placeholder="Received quantity" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <textarea value={deliveryForm.qualityNotes} onChange={e => setDeliveryForm({...deliveryForm, qualityNotes: e.target.value})}
                placeholder="Quality notes (optional)" rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowDeliveryForm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-semibold">Cancel</button>
                <button onClick={handleConfirmDelivery} disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">Confirm Received</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
