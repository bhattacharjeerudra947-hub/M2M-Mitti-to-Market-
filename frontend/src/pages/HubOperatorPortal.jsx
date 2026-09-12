import React, { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, PackageCheck, Truck, RotateCcw, AlertTriangle, CheckCircle2,
  Search, RefreshCw, Loader2, ArrowRight, ShieldCheck, Scale, QrCode,
  Layers, UploadCloud, ChevronRight, Check
} from 'lucide-react';
import {
  getHubs, getHubById, getHubInventory, recordInboundLot,
  dispatchOutboundLot, getAdminReverseLogistics, submitReturnInspection
} from '../api/hubApi';
import { useAuth } from '../context/AuthContext';
import { uploadEvidenceFile } from '../api/dealApi';

const LOT_CONDITIONS = [
  { value: 'EXCELLENT', label: 'Grade A+ (Premium Fresh)' },
  { value: 'GOOD', label: 'Grade A (Standard Market Quality)' },
  { value: 'ACCEPTABLE_MINOR_DEFECTS', label: 'Grade B (Minor Surface Blemishes)' },
  { value: 'DAMAGED_NEEDS_SORTING', label: 'Damaged / Requires Sorting' },
  { value: 'SPOILED_REJECTED', label: 'Spoiled / Unsafe (Rejected)' },
];

const PACKAGING_TYPES = [
  'PLASTIC_CRATES', 'JUTE_BAGS', 'CORRUGATED_BOXES', 'PALLETIZED_LOOSE', 'MESH_BAGS', 'OTHER'
];

const RETURN_CONDITIONS = [
  { value: 'GOOD_CONDITION', label: 'Good Quality (Fully Resaleable)' },
  { value: 'MINOR_QUALITY_ISSUE', label: 'Minor Quality Blemishes (Suitable for Discounted Sale)' },
  { value: 'FARMER_SPECIFIC_RETURN_REQUIRED', label: 'Significant Defect (Must Return to Farmer)' },
  { value: 'UNSAFE_SPOILED', label: 'Unsafe / Spoiled (Authorise Disposal)' },
];

const RETURN_DECISIONS = [
  { value: 'RESTORE_TO_HUB_INVENTORY', label: 'Restore to Hub Staging Inventory' },
  { value: 'DISCOUNTED_LOCAL_SALE', label: 'Authorize Discounted Local FPO / Mandi Sale' },
  { value: 'REDIRECT_TO_ALTERNATIVE_BUYER', label: 'Redirect to Alternative Secondary Buyer' },
  { value: 'RETURN_TO_FARMER', label: 'Ship Return Direct to Farmer' },
  { value: 'AUTHORIZED_DISPOSAL', label: 'Authorized Composting / Safe Disposal' },
];

export default function HubOperatorPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('INVENTORY'); // 'INVENTORY' | 'INBOUND' | 'RETURNS'

  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [returns, setReturns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inbound Form state
  const [inboundForm, setInboundForm] = useState({
    lotId: '',
    dealId: '',
    cropName: 'Tomato',
    variety: '',
    inboundQuantityKg: 500,
    lotCondition: 'GOOD',
    packagingType: 'PLASTIC_CRATES',
    storageBay: 'BAY-A1',
    storageType: 'COLD_STORAGE',
    notes: '',
  });
  const [inboundPhoto, setInboundPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Return Inspection Modal
  const [inspectingReturn, setInspectingReturn] = useState(null);
  const [inspectionForm, setInspectionForm] = useState({
    conditionGrading: 'GOOD_CONDITION',
    decision: 'RESTORE_TO_HUB_INVENTORY',
    discountedPricePerKg: '',
    notes: '',
  });

  // Load hubs
  const loadHubs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHubs();
      const list = Array.isArray(data) ? data : [];
      setHubs(list);
      if (list.length > 0) {
        setSelectedHub(list[0]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load warehouse hubs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHubs();
  }, [loadHubs]);

  // Load inventory & returns for selected hub
  const loadHubData = useCallback(async () => {
    if (!selectedHub?.id) return;
    try {
      const [inv, ret] = await Promise.all([
        getHubInventory(selectedHub.id).catch(() => []),
        getAdminReverseLogistics().catch(() => []),
      ]);
      setInventory(Array.isArray(inv) ? inv : []);
      // Filter returns routed to this hub
      const hubReturns = (Array.isArray(ret) ? ret : []).filter(
        (r) => r.destinationHubId === selectedHub.id || r.destinationType === 'NEAREST_HUB'
      );
      setReturns(hubReturns);
    } catch (err) {
      console.error('Failed to load hub data:', err);
    }
  }, [selectedHub?.id]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  // Handle Inbound photo upload
  const handleInboundPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadEvidenceFile(
        inboundForm.dealId || 1,
        file,
        {
          stage: 'HUB_INBOUND',
          description: 'Hub operator inbound lot verification photo'
        }
      );
      if (res?.cloudinaryUrl || res?.evidence?.cloudinaryUrl) {
        setInboundPhoto(res?.cloudinaryUrl || res?.evidence?.cloudinaryUrl);
      }
    } catch (err) {
      setError('Photo upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Inbound Lot
  const handleRecordInbound = async (e) => {
    e.preventDefault();
    if (!selectedHub?.id) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        lotId: inboundForm.lotId || `LOT-M2M-${Date.now().toString().slice(-6)}`,
        dealId: inboundForm.dealId ? Number(inboundForm.dealId) : null,
        cropName: inboundForm.cropName,
        variety: inboundForm.variety,
        inboundQuantityKg: Number(inboundForm.inboundQuantityKg),
        lotCondition: inboundForm.lotCondition,
        packagingType: inboundForm.packagingType,
        storageBay: inboundForm.storageBay,
        storageType: inboundForm.storageType,
        evidencePhotoUrl: inboundPhoto || null,
        notes: inboundForm.notes,
      };

      const result = await recordInboundLot(selectedHub.id, payload);
      setSuccess(`Inbound Lot ${result.lotId} verified and placed in ${result.storageBay}!`);
      setInboundForm({
        lotId: '',
        dealId: '',
        cropName: 'Tomato',
        variety: '',
        inboundQuantityKg: 500,
        lotCondition: 'GOOD',
        packagingType: 'PLASTIC_CRATES',
        storageBay: 'BAY-A1',
        storageType: 'COLD_STORAGE',
        notes: '',
      });
      setInboundPhoto('');
      loadHubData();
      setActiveTab('INVENTORY');
    } catch (err) {
      setError(err?.message || 'Failed to record inbound lot');
    } finally {
      setActionLoading(false);
    }
  };

  // Dispatch Outbound Lot
  const handleDispatchOutbound = async (lot) => {
    if (!selectedHub?.id || !window.confirm(`Confirm outbound dispatch for lot ${lot.lotId}?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await dispatchOutboundLot(selectedHub.id, {
        lotId: lot.lotId,
        dispatchQuantityKg: lot.availableQuantityKg || lot.inboundQuantityKg,
        dispatchNotes: 'Outbound dispatched by hub operator for final buyer delivery',
      });
      setSuccess(`Lot ${lot.lotId} marked as DISPATCHED.`);
      loadHubData();
    } catch (err) {
      setError(err?.message || 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Return Inspection
  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!inspectingReturn) return;
    setActionLoading(true);
    setError('');
    try {
      await submitReturnInspection(inspectingReturn.id, {
        conditionGrading: inspectionForm.conditionGrading,
        decision: inspectionForm.decision,
        discountedPricePerKg: inspectionForm.discountedPricePerKg ? Number(inspectionForm.discountedPricePerKg) : null,
        notes: inspectionForm.notes,
      });
      setSuccess(`Return #${inspectingReturn.reverseTrackingId} inspected. Decision: ${inspectionForm.decision}`);
      setInspectingReturn(null);
      loadHubData();
    } catch (err) {
      setError(err?.message || 'Failed to submit inspection');
    } finally {
      setActionLoading(false);
    }
  };

  const availableCap = selectedHub
    ? (selectedHub.availableCapacityKg ?? ((selectedHub.totalCapacityKg || 0) - (selectedHub.occupiedCapacityKg || 0) - (selectedHub.reservedCapacityKg || 0)))
    : 0;
  const occPct = selectedHub?.totalCapacityKg ? Math.round(((selectedHub.occupiedCapacityKg || 0) / selectedHub.totalCapacityKg) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-black text-gray-900">Partner Hub & Aggregation Portal</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Operator Station
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Digital physical-checkpoint management: Inbound verification, lot storage bays, and reverse inspection
          </p>
        </div>

        {/* Hub Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600">Active Facility:</label>
          <select
            value={selectedHub?.id || ''}
            onChange={(e) => {
              const h = hubs.find((hub) => hub.id === Number(e.target.value));
              if (h) setSelectedHub(h);
            }}
            className="text-xs font-medium bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name} ({hub.hubCode}) - {hub.district || hub.location}
              </option>
            ))}
          </select>

          <button
            onClick={() => { loadHubs(); loadHubData(); }}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Refresh Hub Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Facility Overview & Capacity Card */}
      {selectedHub && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-gray-500">{selectedHub.hubCode}</span>
              <h2 className="text-xl font-bold text-gray-900">{selectedHub.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Operated by: <span className="font-semibold text-gray-700">{selectedHub.partnerName || 'Authorized M2M Partner'}</span> • {selectedHub.location}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {selectedHub.storageType?.replace('_', ' ') || 'COLD STORAGE'}
              </span>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedHub.operatingStatus || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Capacity Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[11px] font-bold uppercase text-gray-400">Total Capacity</p>
              <p className="text-xl font-black text-gray-900 mt-1">
                {(selectedHub.totalCapacityKg || 0).toLocaleString()} <span className="text-xs font-normal">kg</span>
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Available Free</p>
              <p className="text-xl font-black text-emerald-800 mt-1">
                {availableCap.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </p>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[11px] font-bold uppercase text-amber-700">Occupied (Stored)</p>
              <p className="text-xl font-black text-amber-800 mt-1">
                {(selectedHub.occupiedCapacityKg || 0).toLocaleString()} <span className="text-xs font-normal">kg</span>
              </p>
            </div>
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[11px] font-bold uppercase text-blue-700">Reserved (Transit)</p>
              <p className="text-xl font-black text-blue-800 mt-1">
                {(selectedHub.reservedCapacityKg || 0).toLocaleString()} <span className="text-xs font-normal">kg</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-semibold text-gray-600">
              <span>Capacity Utilization: {occPct}%</span>
              <span>Supported Crops: {selectedHub.supportedCrops || 'All Agri Produce'}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(occPct, 100)}%` }}
                className={`h-full transition-all ${
                  occPct > 85 ? 'bg-red-500' : occPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'INVENTORY'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Staging Lots ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab('INBOUND')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'INBOUND'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Inbound Gate Verification
        </button>

        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'RETURNS'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Reverse Logistics & Inspections ({returns.length})
        </button>
      </div>

      {/* Tab 1: Inventory Lots */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Stored Produce Inventory</h3>
            <span className="text-xs text-gray-500">Real-time Bay Allocations</span>
          </div>

          {inventory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Layers className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No active lots in storage</p>
              <p className="text-xs text-gray-400 mt-1">Use the Inbound Gate Verification tab to intake arriving produce</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="p-4">Lot ID</th>
                    <th className="p-4">Produce</th>
                    <th className="p-4">Condition</th>
                    <th className="p-4">Storage Bay</th>
                    <th className="p-4">Quantity (kg)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventory.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900">{lot.lotId}</td>
                      <td className="p-4">
                        <span className="font-semibold text-gray-900">{lot.cropName}</span>
                        {lot.variety && <span className="text-gray-500 block text-[11px]">{lot.variety}</span>}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                          {lot.lotCondition}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-blue-700">{lot.storageBay || 'UNASSIGNED'}</td>
                      <td className="p-4 font-bold text-gray-900">
                        {lot.availableQuantityKg?.toLocaleString()} / {lot.inboundQuantityKg?.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          lot.status === 'DISPATCHED'
                            ? 'bg-gray-100 text-gray-600'
                            : lot.status === 'RETURN_QUARANTINE'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {lot.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {lot.status !== 'DISPATCHED' && (
                          <button
                            onClick={() => handleDispatchOutbound(lot)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            <Truck className="w-3.5 h-3.5" /> Dispatch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Inbound Form */}
      {activeTab === 'INBOUND' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm max-w-3xl">
          <div className="border-b border-gray-100 pb-4 mb-5">
            <h3 className="text-lg font-bold text-gray-900">Inbound Lot Verification & Bay Assignment</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verify incoming truck produce, record gate weight, assess physical condition, and assign warehouse storage bay.
            </p>
          </div>

          <form onSubmit={handleRecordInbound} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lot ID (Optional - Auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LOT-M2M-PUN-042"
                  value={inboundForm.lotId}
                  onChange={(e) => setInboundForm({ ...inboundForm, lotId: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Associated Deal ID / Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={inboundForm.dealId}
                  onChange={(e) => setInboundForm({ ...inboundForm, dealId: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Crop *</label>
                <input
                  type="text"
                  value={inboundForm.cropName}
                  onChange={(e) => setInboundForm({ ...inboundForm, cropName: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Variety</label>
                <input
                  type="text"
                  placeholder="e.g. Sharbati / Hybrid"
                  value={inboundForm.variety}
                  onChange={(e) => setInboundForm({ ...inboundForm, variety: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Inbound Weight (kg) *</label>
                <input
                  type="number"
                  min="1"
                  value={inboundForm.inboundQuantityKg}
                  onChange={(e) => setInboundForm({ ...inboundForm, inboundQuantityKg: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Condition *</label>
                <select
                  value={inboundForm.lotCondition}
                  onChange={(e) => setInboundForm({ ...inboundForm, lotCondition: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {LOT_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Packaging *</label>
                <select
                  value={inboundForm.packagingType}
                  onChange={(e) => setInboundForm({ ...inboundForm, packagingType: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {PACKAGING_TYPES.map((p) => (
                    <option key={p} value={p}>{p.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Storage Bay *</label>
                <input
                  type="text"
                  placeholder="e.g. BAY-B2-CHAMBER1"
                  value={inboundForm.storageBay}
                  onChange={(e) => setInboundForm({ ...inboundForm, storageBay: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Inbound Quality Inspection Evidence Photo
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-gray-500" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Take / Upload Gate Inspection Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleInboundPhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
                {inboundPhoto && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Verification Photo Linked
                  </span>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                Record Inbound Lot & Update Capacity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Returns & Inspections */}
      {activeTab === 'RETURNS' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Reverse Logistics Routing to this Hub</h3>
            <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Inspection & Decision Authority
            </span>
          </div>

          {returns.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <RotateCcw className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No reverse shipments pending for this hub</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="p-4">Tracking ID</th>
                    <th className="p-4">Deal</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Qty (kg)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900">{ret.reverseTrackingId}</td>
                      <td className="p-4 font-semibold text-gray-700">Deal #{ret.deal?.id || ret.dealId}</td>
                      <td className="p-4 text-amber-800 font-medium">{ret.returnReason}</td>
                      <td className="p-4 font-bold text-gray-900">{ret.quantityKg} kg</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {ret.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setInspectingReturn(ret)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ml-auto"
                        >
                          <Scale className="w-3.5 h-3.5" /> Inspect Lot
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Return Inspection Modal */}
      {inspectingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Return Lot Quality Grading & Decision</h3>
                <p className="text-xs text-gray-500">Tracking ID: {inspectingReturn.reverseTrackingId}</p>
              </div>
              <button onClick={() => setInspectingReturn(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleInspectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Produce Condition Grading *</label>
                <select
                  value={inspectionForm.conditionGrading}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, conditionGrading: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {RETURN_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Recommended Disposition Decision *</label>
                <select
                  value={inspectionForm.decision}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, decision: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {RETURN_DECISIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {inspectionForm.decision === 'DISCOUNTED_LOCAL_SALE' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Discounted Price (₹/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inspectionForm.discountedPricePerKg}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, discountedPricePerKg: e.target.value })}
                    placeholder="e.g. 18.5"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Inspection Findings / Notes</label>
                <textarea
                  rows="3"
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                  placeholder="Record moisture, blemish %, sugar content / brix, or disposal reasoning..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setInspectingReturn(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Recording...' : 'Submit Disposition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
