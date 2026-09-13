import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Check, X, Truck, Package, MapPin, Clock, AlertCircle, ChevronDown, ChevronUp, Star,
  Shield, ShieldCheck, Camera, Upload, Eye, AlertTriangle, Loader2, FileText
} from 'lucide-react';
import {
  initiateDealLock, confirmDeal, cancelDeal, getDealByConversation,
  selectLogistics, updateLogisticsDetails, updateLogisticsStatus, getLogistics,
  getTimeline, confirmDelivery, getDealEvidence, uploadEvidenceFile, openDispute
} from '../api/dealApi';
import { apiGet } from '../api';
import { onMessage, onNotification } from '../utils/messageStream';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import DemoPaymentModal from './DemoPaymentModal';
import InlineLocationPicker from './InlineLocationPicker';

const STATUS_FLOW = ['NEGOTIATING','LOCK_PENDING','LOCKED','LOGISTICS_PENDING','LOGISTICS_ASSIGNED',
  'PICKUP_SCHEDULED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'];

const STATUS_LABELS = {
  NEGOTIATING: '💬 Bargaining', LOCK_PENDING: '⏳ Confirming', LOCKED: '🔒 Deal Locked',
  LOGISTICS_PENDING: '🚚 Choose Logistics', LOGISTICS_ASSIGNED: '👨‍✈️ Transport Assigned',
  PICKUP_SCHEDULED: '📅 Pickup Scheduled', PICKED_UP: '📦 Picked Up', IN_TRANSIT: '🚚 In Transit',
  OUT_FOR_DELIVERY: '🏪 Out for Delivery', DELIVERED: '📦 Delivered', COMPLETED: '✅ Completed',
  CANCELLED: '❌ Cancelled', DISPUTED: '⚠️ Disputed'
};

export default function DealLockPanel({ conversationId, otherUserId, produceId, produceName, latestMessageTimestamp }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLockForm, setShowLockForm] = useState(false);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showInlineMap, setShowInlineMap] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [logistics, setLogistics] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Lock form state — pure deal terms only. Locations are collected AFTER deal is locked.
  const [lockForm, setLockForm] = useState({
    cropName: produceName || '',
    quantity: '',
    unit: 'kg',
    agreedPrice: '',
    conditions: '',
    farmerId: '',
    buyerId: '',
    produceId: produceId || ''
  });

  // Logistics details form
  const [logisticsForm, setLogisticsForm] = useState({
    transporterName: '',
    vehicleNumber: '', vehicleType: '', scheduledPickup: '', expectedDelivery: ''
  });

  // Delivery form
  const [deliveryForm, setDeliveryForm] = useState({ receivedQuantity: '', qualityNotes: '' });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Evidence state (photos for authentication)
  const [evidenceList, setEvidenceList] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [uploadingOriginPhoto, setUploadingOriginPhoto] = useState(false);
  const [originPhotoNote, setOriginPhotoNote] = useState('');
  const originFileInputRef = useRef(null);

  const [uploadingDeliveryPhoto, setUploadingDeliveryPhoto] = useState(false);
  const [deliveryPhotoNote, setDeliveryPhotoNote] = useState('');
  const deliveryFileInputRef = useRef(null);

  // Photo viewer lightbox
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    reason: 'QUALITY_MISMATCH',
    description: '',
    disputedQuantity: '',
  });
  const [disputeFile, setDisputeFile] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const loadEvidence = useCallback(async (dealId) => {
    if (!dealId) return;
    try {
      setLoadingEvidence(true);
      const data = await getDealEvidence(dealId);
      setEvidenceList(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoadingEvidence(false);
    }
  }, []);

  const loadDeal = useCallback(async () => {
    if (!conversationId) { setLoading(false); return; }
    try {
      const data = await getDealByConversation(conversationId);
      setDeal(data);
      // A successful reload means the deal moved forward — clear any stale error
      setError('');
      if (data) {
        loadLogistics(data.id);
        loadEvidence(data.id);
      }
    } catch (err) {
      // No deal yet — that's OK
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadEvidence]);

  useEffect(() => {
    loadDeal();

    // 1. Real-time SSE subscriptions — refresh deal state immediately on incoming messages & notifications
    const unsubMsg = onMessage((msg) => {
      if (!msg) return;
      if (msg.conversationId === conversationId || 
          msg.content?.includes('Deal') || 
          msg.content?.includes('lock') || 
          msg.content?.includes('confirmed')) {
        loadDeal();
      }
    });

    const unsubNotif = onNotification((notif) => {
      if (!notif) return;
      if (notif.type?.includes('DEAL') || notif.title?.includes('Deal')) {
        loadDeal();
      }
    });

    // 2. Fast 2.5s polling loop while in chat view to guarantee buyer & farmer windows stay 100% in sync
    const interval = setInterval(() => {
      loadDeal();
    }, 2500);

    const onFocus = () => loadDeal();
    window.addEventListener('focus', onFocus);

    return () => {
      if (unsubMsg) unsubMsg();
      if (unsubNotif) unsubNotif();
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [conversationId, loadDeal, latestMessageTimestamp]);

  // Auto-dismiss error banners so stale messages never linger
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

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
    const qty = Number(lockForm.quantity);
    const price = Number(lockForm.agreedPrice);

    if (!lockForm.quantity || isNaN(qty) || qty <= 0) {
      setError('Quantity (weight) must be a positive number greater than zero.');
      return;
    }
    if (!lockForm.agreedPrice || isNaN(price) || price <= 0) {
      setError('Agreed price must be a positive number greater than zero.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      // Determine who is farmer and who is buyer
      const isFarmer = user.role === 'FARMER';
      const data = {
        ...lockForm,
        quantity: qty,
        agreedPrice: price,
        farmerId: isFarmer ? user.id : otherUserId,
        buyerId: isFarmer ? otherUserId : user.id,
        produceId: produceId || null
      };
      const result = await initiateDealLock(conversationId, data);
      setDeal(result);
      setShowLockForm(false);
      setLockForm({ cropName: produceName || '', quantity: '', unit: 'kg', agreedPrice: '', conditions: '', farmerId: '', buyerId: '', produceId: produceId || '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
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
    setError('');
    setActionLoading(true);
    try {
      const result = await cancelDeal(deal.id);
      setDeal(result);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleSelectLogistics = async (type) => {
    setError('');
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
    setError('');
    setActionLoading(true);
    try {
      await updateLogisticsDetails(logistics.id, logisticsForm);
      await loadLogistics(deal.id);
      setShowLogisticsForm(false);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleUpdateStatus = async (status, desc) => {
    setError('');
    setActionLoading(true);
    try {
      await updateLogisticsStatus(logistics.id, status, null, desc);
      await loadLogistics(deal.id);
      await loadDeal();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleConfirmDelivery = async () => {
    const rQty = Number(deliveryForm.receivedQuantity || deal?.quantity);
    if (!rQty || isNaN(rQty) || rQty <= 0) {
      setError('Received quantity (weight) must be a positive number greater than zero.');
      return;
    }
    setError('');
    setActionLoading(true);
    try {
      const result = await confirmDelivery(deal.id, {
        receivedQuantity: rQty,
        qualityNotes: deliveryForm.qualityNotes || 'Produce inspected and delivery accepted by buyer',
      });
      setDeal(result);
      setShowDeliveryForm(false);
      await loadEvidence(deal.id);
      await loadDeal();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleUploadOriginPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !deal) return;
    setUploadingOriginPhoto(true);
    setError('');
    try {
      await uploadEvidenceFile(deal.id, file, {
        stage: 'ORIGIN',
        description: originPhotoNote || 'Produce dispatch authentication photo at origin',
      });
      setOriginPhotoNote('');
      await loadEvidence(deal.id);
      await loadDeal();
    } catch (err) {
      setError(err.message || 'Failed to upload dispatch photo');
    } finally {
      setUploadingOriginPhoto(false);
      if (originFileInputRef.current) originFileInputRef.current.value = '';
    }
  };

  const handleUploadDeliveryPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !deal) return;
    setUploadingDeliveryPhoto(true);
    setError('');
    try {
      await uploadEvidenceFile(deal.id, file, {
        stage: 'DELIVERY',
        description: deliveryPhotoNote || 'Buyer delivery verification inspection photo',
      });
      setDeliveryPhotoNote('');
      await loadEvidence(deal.id);
      await loadDeal();
    } catch (err) {
      setError(err.message || 'Failed to upload delivery inspection photo');
    } finally {
      setUploadingDeliveryPhoto(false);
      if (deliveryFileInputRef.current) deliveryFileInputRef.current.value = '';
    }
  };

  const handleOpenDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!deal) return;
    if (!disputeForm.description.trim()) {
      setError('Please provide a brief description of the dispute reason.');
      return;
    }
    setSubmittingDispute(true);
    setError('');
    try {
      let evidenceUrl = null;
      if (disputeFile) {
        const evRes = await uploadEvidenceFile(deal.id, disputeFile, {
          stage: 'DISPUTE',
          description: disputeForm.description,
        });
        evidenceUrl = evRes?.imageUrl || null;
      }
      await openDispute(deal.id, {
        reason: disputeForm.reason,
        description: disputeForm.description,
        disputedQuantity: disputeForm.disputedQuantity ? Number(disputeForm.disputedQuantity) : null,
        evidenceUrl,
      });
      setShowDisputeModal(false);
      setDisputeFile(null);
      setDisputeForm({ reason: 'QUALITY_MISMATCH', description: '', disputedQuantity: '' });
      await loadEvidence(deal.id);
      await loadDeal();
    } catch (err) {
      setError(err.message || 'Failed to file dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const isFarmer = (user?.role?.toUpperCase() === 'FARMER') || (deal && String(deal.farmerId) === String(user?.id));
  const isBuyer = (user?.role?.toUpperCase() === 'BUSINESS') || (user?.role?.toUpperCase() === 'BUYER') || (deal && String(deal.buyerId) === String(user?.id));
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
            {produceId ? (
              <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">🌾 {produceName || 'This listing'}</span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-white border border-emerald-200 rounded-full px-2 py-0.5">LISTING LOCKED</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">This deal will be locked against your <b>{produceName || 'attached'}</b> listing and its available stock.</p>
              </div>
            ) : (
              <input value={lockForm.cropName} onChange={e => setLockForm({...lockForm, cropName: e.target.value})}
                placeholder="Crop name" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            )}
            <div className="flex gap-2">
              <input
                value={lockForm.quantity}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || (!val.includes('-') && Number(val) >= 0)) {
                    setLockForm({ ...lockForm, quantity: val });
                  }
                }}
                onKeyDown={e => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                type="number"
                min="0.01"
                step="any"
                placeholder="Quantity (weight)"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <select value={lockForm.unit} onChange={e => setLockForm({...lockForm, unit: e.target.value})}
                className="w-20 px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option>kg</option><option>quintal</option><option>ton</option><option>pieces</option>
              </select>
            </div>
            <input
              value={lockForm.agreedPrice}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || (!val.includes('-') && Number(val) >= 0)) {
                  setLockForm({ ...lockForm, agreedPrice: val });
                }
              }}
              onKeyDown={e => {
                if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                  e.preventDefault();
                }
              }}
              type="number"
              min="0.01"
              step="any"
              placeholder="Agreed price per unit (₹)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            <input value={lockForm.conditions} onChange={e => setLockForm({...lockForm, conditions: e.target.value})}
              placeholder="Any conditions (optional)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            {lockForm.quantity && lockForm.agreedPrice && Number(lockForm.quantity) > 0 && Number(lockForm.agreedPrice) > 0 && (
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

  const totalAmount = deal?.totalAmount || (deal?.quantity * deal?.agreedPrice) || 0;
  const upfrontAmount = Math.round((totalAmount / 2.0) * 100) / 100;
  const isEscrowSecured = deal?.paymentStatus === 'PAID_ESCROW' || deal?.paymentStatus === 'ESCROW_PAID' || deal?.paymentStatus === 'RELEASED_TO_FARMER' || deal?.paymentStatus === 'RELEASED';
  const isPaymentReleased = deal?.paymentStatus === 'RELEASED_TO_FARMER' || deal?.paymentStatus === 'RELEASED' || deal?.status === 'COMPLETED';
  const originEvidence = evidenceList.filter(e => e.stage === 'ORIGIN');
  const deliveryEvidence = evidenceList.filter(e => e.stage === 'DELIVERY');
  const hasOriginPhoto = originEvidence.length > 0;
  const hasDeliveryPhoto = deliveryEvidence.length > 0;
  const isLocked = ['LOCKED','LOGISTICS_PENDING','LOGISTICS_ASSIGNED','PICKUP_SCHEDULED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'].includes(deal?.status);

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

      {/* Deal Details — terms are immutable once locked */}
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
        {deal.amendmentCount > 0 && (
          <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
            <span className="text-amber-600 font-semibold">✏️ Amended</span>
            <span className="text-amber-600">{deal.amendmentCount}× · {formatDate(deal.amendedAt, '')}</span>
          </div>
        )}
        {['LOCKED','LOGISTICS_PENDING','LOGISTICS_ASSIGNED','PICKUP_SCHEDULED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'].includes(deal.status) && (
          <p className="border-t border-gray-200 pt-1.5 mt-1 flex items-center gap-1 text-[10px] text-gray-500">
            <Lock className="w-3 h-3" /> Terms are locked. To change them, send a structured offer in chat — both parties must agree.
          </p>
        )}
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
        <div className="space-y-2.5 bg-amber-50/80 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-navy-900">Confirmation Needed</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {myConfirmed ? 'Waiting for Partner' : 'Action Required'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-lg border ${myConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-amber-300 text-gray-800 shadow-sm'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${myConfirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="font-medium">You: {myConfirmed ? '✅ Confirmed' : '⏳ Pending'}</span>
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${otherConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-200 text-gray-600'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${otherConfirmed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className="font-medium">{isFarmer ? 'Buyer' : 'Farmer'}: {otherConfirmed ? '✅ Confirmed' : '⏳ Pending'}</span>
              </div>
            </div>
          </div>

          {!myConfirmed ? (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-amber-900 font-medium">
                👉 {isFarmer ? 'Buyer' : 'Farmer'} requested to lock this deal. Please review terms above and confirm to seal the agreement:
              </p>
              <div className="flex gap-2">
                <button onClick={handleConfirm} disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow transition">
                  <Check className="w-3.5 h-3.5" /> Confirm Deal
                </button>
                <button onClick={handleCancel} disabled={actionLoading}
                  className="py-2.5 px-4 bg-white text-red-600 rounded-xl text-xs font-semibold border border-red-200 hover:bg-red-50 disabled:opacity-50 transition">
                  <X className="w-3.5 h-3.5 inline" /> Decline
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-emerald-700 font-medium text-center pt-0.5">
              ✓ You confirmed this deal! Waiting for {isFarmer ? 'the buyer' : 'the farmer'} to confirm.
            </p>
          )}
        </div>
      )}

      {/* DISPUTED BANNER — Under active investigation */}
      {deal.status === 'DISPUTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            Deal is Under Admin Dispute Investigation
          </div>
          <p className="text-[11px] text-red-700">
            A formal dispute has been logged with photographic evidence. Platform Admin and field observers are reviewing origin and delivery records to mediate resolution and escrow settlement.
          </p>
        </div>
      )}

      {/* MANDATORY ESCROW PAYMENT SECTION */}
      {isLocked && deal.status !== 'CANCELLED' && (
        <div className="mb-3">
          {!isEscrowSecured && !isPaymentReleased && deal.status !== 'DISPUTED' ? (
            isBuyer ? (
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Mandatory 50% Upfront Escrow Deposit
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Milestone 1 Required
                  </span>
                </div>
                <p className="text-[11px] text-gray-700">
                  Deposit 50% upfront into Mitti2Market Escrow to authorize transporter dispatch. Funds are protected and remaining 50% is released only after your delivery inspection.
                </p>
                <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Agreed Deal Total</span>
                    <span className="font-bold text-navy-900">₹{Number(totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 block text-[10px] font-semibold">Payable Upfront (50%)</span>
                    <span className="font-extrabold text-emerald-700 text-sm">₹{Number(upfrontAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Deposit 50% Escrow (₹{Number(upfrontAmount).toLocaleString('en-IN')}) [Sandbox Gateway]
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Awaiting Buyer 50% Escrow Deposit
                </div>
                <p className="text-[11px] text-amber-800">
                  The buyer must deposit the 50% upfront escrow (₹{Number(upfrontAmount).toLocaleString('en-IN')}) before produce dispatch and transporter pickup can proceed.
                </p>
              </div>
            )
          ) : isEscrowSecured && !isPaymentReleased ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">50% Escrow Secured in Vault: ₹{Number(upfrontAmount).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-700">Protected by Mitti2Market · Remaining 50% releases upon buyer delivery confirmation</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                PAID_ESCROW
              </span>
            </div>
          ) : isPaymentReleased ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">100% Payment Released to Farmer: ₹{Number(totalAmount).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-700">Delivery confirmed & verified · Escrow funds fully disbursed</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                RELEASED
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* LOCKED — Choose logistics */}
      {deal.status === 'LOCKED' && (
        <div className="space-y-2 mb-3">
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

      {/* POST-DEAL-LOCK: Route & Location Configuration Banner */}
      {['LOCKED', 'LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED', 'PICKUP_SCHEDULED'].includes(deal.status) && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              {isFarmer ? 'Produce Pickup Location' : 'Produce Delivery Location'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              (isFarmer ? deal.pickupLocation : deal.deliveryLocation)
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {(isFarmer ? deal.pickupLocation : deal.deliveryLocation) ? '✓ Confirmed' : 'Action Required'}
            </span>
          </div>
          <p className="text-[11px] text-gray-600">
            {isFarmer
              ? (deal.pickupLocation 
                  ? `Pickup: ${deal.pickupLocation}` 
                  : 'Deal is locked! Please confirm the pickup location where transport will collect produce.')
              : (deal.deliveryLocation 
                  ? `Delivery: ${deal.deliveryLocation}` 
                  : 'Deal is locked! Please confirm the delivery location where produce should be delivered.')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInlineMap(!showInlineMap)}
              className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-sm">
              <MapPin className="w-3.5 h-3.5" />
              {showInlineMap
                ? 'Close Map'
                : (isFarmer
                    ? (deal.pickupLocation ? '🗺️ Change / View Pickup Location on Map' : '📍 Set Pickup Location on Map')
                    : (deal.deliveryLocation ? '🗺️ Change / View Delivery Location on Map' : '📍 Set Delivery Location on Map'))}
            </button>
          </div>

          {/* Inline Interactive Map & Location Selector — stays on message section, no popup window */}
          {showInlineMap && (
            <div className="pt-2">
              <InlineLocationPicker
                deal={deal}
                type={isFarmer ? 'pickup' : 'delivery'}
                onSaved={async () => {
                  setShowInlineMap(false);
                  await loadDeal();
                }}
                onCancel={() => setShowInlineMap(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* ORIGIN DISPATCH PHOTO AUTHENTICATION (Farmer Checkpoint) */}
      {isLocked && deal.status !== 'CANCELLED' && (
        <div className="bg-white border border-navy-100 rounded-xl p-3 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              Produce Dispatch Authentication (Origin)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasOriginPhoto ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hasOriginPhoto ? '✓ Authenticated' : 'Required for Pickup'}
            </span>
          </div>

          {hasOriginPhoto ? (
            <div className="space-y-2">
              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ Origin produce dispatch photo verified and recorded in evidence ledger.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {originEvidence.map((ev) => (
                  <div key={ev.id} className="relative group shrink-0">
                    <img
                      src={ev.imageUrl}
                      alt="Origin Dispatch"
                      onClick={() => setActivePhotoModal(ev.imageUrl)}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition shadow-xs"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white pointer-events-none transition">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
              {isFarmer && (
                <div className="pt-0.5">
                  <input
                    ref={originFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadOriginPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => originFileInputRef.current?.click()}
                    disabled={uploadingOriginPhoto}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    {uploadingOriginPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    + Add extra angle
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {isFarmer ? (
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] text-blue-900">
                    Take or upload a photo of the produce before handover to transporter. This authenticates quality & quantity at origin and unlocks transporter pickup.
                  </p>
                  <input
                    type="text"
                    value={originPhotoNote}
                    onChange={(e) => setOriginPhotoNote(e.target.value)}
                    placeholder="Produce description / notes (e.g., 50 bags packed, grade A)"
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                  />
                  <input
                    ref={originFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadOriginPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => originFileInputRef.current?.click()}
                    disabled={uploadingOriginPhoto}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition"
                  >
                    {uploadingOriginPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading Photo to Cloud...
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        📷 Take / Upload Dispatch Photo (Origin)
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">
                  📷 Waiting for farmer to upload produce dispatch photo at pickup depot before transporter departure.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* LOGISTICS_PENDING / ASSIGNED — Show logistics details */}
      {['LOGISTICS_PENDING', 'LOGISTICS_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(deal.status) && logistics && (
        <div className="space-y-2 mb-3">
          <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1 border border-blue-100">
            <p className="font-bold text-blue-900">{logistics.type === 'OWN' ? '🚚 Own Logistics' : '🚚 Mitti2Market Logistics'}</p>
            <p>Tracking: {logistics.trackingId}</p>
            <p>Status: {STATUS_LABELS[logistics.status] || logistics.status}</p>
          </div>

          {/* Status update buttons */}
          {deal.status === 'LOGISTICS_PENDING' && logistics.type === 'OWN' && (
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
        </div>
      )}

      {/* DELIVERY INSPECTION PHOTO AUTHENTICATION (Buyer Checkpoint) */}
      {(['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(deal.status) || hasDeliveryPhoto) && (
        <div className="bg-white border border-navy-100 rounded-xl p-3 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              Delivery Inspection Authentication (Destination)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasDeliveryPhoto ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hasDeliveryPhoto ? '✓ Inspected' : 'Required to Complete'}
            </span>
          </div>

          {hasDeliveryPhoto ? (
            <div className="space-y-2">
              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ Delivery inspection photo verified and recorded in evidence ledger.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {deliveryEvidence.map((ev) => (
                  <div key={ev.id} className="relative group shrink-0">
                    <img
                      src={ev.imageUrl}
                      alt="Delivery Inspection"
                      onClick={() => setActivePhotoModal(ev.imageUrl)}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition shadow-xs"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white pointer-events-none transition">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isBuyer ? (
                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] text-purple-900">
                    Inspect the delivered produce and upload a verification photo. Required to confirm delivery and release remaining escrow payment to the farmer.
                  </p>
                  <input
                    type="text"
                    value={deliveryPhotoNote}
                    onChange={(e) => setDeliveryPhotoNote(e.target.value)}
                    placeholder="Inspection note (e.g., inspected crates, verified quality)"
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                  />
                  <input
                    ref={deliveryFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadDeliveryPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => deliveryFileInputRef.current?.click()}
                    disabled={uploadingDeliveryPhoto}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition"
                  >
                    {uploadingDeliveryPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading Photo to Cloud...
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        📷 Take / Upload Delivery Photo (Inspection)
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">
                  📦 Delivery Inspection: Waiting for buyer to inspect produce and upload delivery verification photo upon arrival.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* BUYER DELIVERY CONFIRMATION & PAYMENT RELEASE */}
      {['OUT_FOR_DELIVERY', 'DELIVERED'].includes(deal.status) && isBuyer && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5 mb-3">
          <p className="text-xs font-bold text-navy-900">Buyer Delivery & Payment Release</p>
          <p className="text-[11px] text-gray-600">
            Please inspect the delivered produce. If there is no dispute, confirm receipt to release the rest of the money (remaining 50% escrow: ₹{Number(upfrontAmount).toLocaleString('en-IN')}) to the farmer.
          </p>
          {hasDeliveryPhoto ? (
            <button
              onClick={() => setShowDeliveryForm(true)}
              disabled={actionLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Confirm No Dispute & Send Rest of Money (₹{Number(upfrontAmount).toLocaleString('en-IN')})
            </button>
          ) : (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Upload delivery inspection photo above to unlock delivery confirmation & payment release.
            </div>
          )}
          <button
            onClick={() => {
              setDisputeForm({ reason: 'QUALITY_MISMATCH', description: '', disputedQuantity: '' });
              setShowDisputeModal(true);
            }}
            className="w-full py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Produce Damaged or Quality Issue? Raise Dispute
          </button>
        </div>
      )}

      {/* FARMER DELIVERY & PAYMENT STATUS: AWAITING REST OF MONEY / REPORT BUYER OPTION */}
      {['OUT_FOR_DELIVERY', 'DELIVERED'].includes(deal.status) && isFarmer && !isPaymentReleased && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2.5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Awaiting Buyer Inspection & Payment Release
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              ₹{Number(upfrontAmount).toLocaleString('en-IN')} Pending
            </span>
          </div>
          <p className="text-[11px] text-gray-700">
            Produce has arrived or is out for delivery. Once the buyer confirms that there is no dispute, the rest of the money will be sent to your account.
          </p>
          <div className="pt-1 border-t border-amber-200/60">
            <p className="text-[11px] text-gray-600 mb-1.5">
              Has produce been delivered but the buyer has not confirmed or sent the remaining money?
            </p>
            <button
              onClick={() => {
                setDisputeForm({
                  reason: 'PAYMENT_ISSUE',
                  description: 'Buyer received the produce but has not confirmed delivery or released the remaining payment.',
                  disputedQuantity: String(deal.quantity || '')
                });
                setShowDisputeModal(true);
              }}
              className="w-full py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              🚩 Report Buyer / Payment Not Released
            </button>
          </div>
        </div>
      )}

      {/* Timeline toggle */}
      {timeline.length > 0 && (
        <div className="mb-3">
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
                  <p className="text-gray-400">{formatDateTime(ev.timestamp, '')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {deal.status === 'COMPLETED' && (
        <div className="text-center py-3 bg-emerald-50 rounded-xl border border-emerald-200 mb-3">
          <p className="text-sm font-bold text-emerald-700">✅ Deal Completed Successfully!</p>
          <p className="text-xs text-emerald-600">Completed {formatDate(deal.completedAt, '')} · Escrow Disbursed</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
          </div>
        </div>
      )}

      {/* Demo Sandbox Escrow Payment Modal */}
      <DemoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        deal={deal}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          loadDeal();
        }}
      />

      {/* Lightbox Photo Preview Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setActivePhotoModal(null)}>
          <div className="relative max-w-2xl w-full max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute -top-10 right-0 p-1.5 text-white hover:text-gray-300 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activePhotoModal}
              alt="Evidence Inspection"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
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
            <h3 className="text-sm font-bold text-navy-900 mb-2">✅ Confirm No Dispute & Release Payment</h3>
            <p className="text-xs text-gray-600 mb-3">
              By confirming, you verify that produce has been received in good condition with <strong>no dispute</strong>. The rest of the money (₹{Number(upfrontAmount).toLocaleString('en-IN')}) will be sent directly to the farmer.
            </p>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-600">Received Quantity ({deal?.unit || 'kg'})</label>
              <input
                value={deliveryForm.receivedQuantity || deal?.quantity}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || (!val.includes('-') && Number(val) >= 0)) {
                    setDeliveryForm({ ...deliveryForm, receivedQuantity: val });
                  }
                }}
                onKeyDown={e => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
                type="number"
                min="0.01"
                step="any"
                placeholder="Received quantity (weight)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
              <label className="text-[11px] font-semibold text-gray-600">Inspection & Quality Notes</label>
              <textarea value={deliveryForm.qualityNotes} onChange={e => setDeliveryForm({...deliveryForm, qualityNotes: e.target.value})}
                placeholder="Produce inspected, no dispute found, quality approved" rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowDeliveryForm(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-semibold">Cancel</button>
                <button onClick={handleConfirmDelivery} disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition">Send Rest of Money</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal (Admin Mediation Layer) */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={() => setShowDisputeModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Raise Deal Dispute / Report Issue
              </h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-600">
              Escrow release will be paused while Platform Admin mediates resolution using uploaded photos and inspection records.
            </p>
            <form onSubmit={handleOpenDisputeSubmit} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Dispute / Report Reason</label>
                <select
                  value={disputeForm.reason}
                  onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="PAYMENT_ISSUE">Payment Not Released by Buyer / Escrow Delay</option>
                  <option value="QUALITY_MISMATCH">Produce Quality Mismatch</option>
                  <option value="QUANTITY_MISMATCH">Quantity Shortage / Weight Mismatch</option>
                  <option value="PRODUCE_DAMAGED">Produce Damaged in Transit</option>
                  <option value="WRONG_PRODUCE">Wrong Produce / Variety Delivered</option>
                  <option value="LATE_DELIVERY">Severe Delivery Delay</option>
                  <option value="DELIVERY_ISSUE">Logistics / Delivery Location Issue</option>
                  <option value="OTHER">Other Dispute Reason</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Disputed Quantity (kg, optional)</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={disputeForm.disputedQuantity}
                  onChange={e => setDisputeForm({ ...disputeForm, disputedQuantity: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Description & Evidence Details *</label>
                <textarea
                  required
                  rows={2}
                  value={disputeForm.description}
                  onChange={e => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  placeholder="Explain the problem observed during delivery..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Attach Evidence Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setDisputeFile(e.target.files?.[0] || null)}
                  className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 hover:file:bg-gray-200"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowDisputeModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {submittingDispute ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
