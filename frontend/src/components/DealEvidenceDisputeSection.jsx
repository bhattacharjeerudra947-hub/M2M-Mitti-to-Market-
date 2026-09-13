import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, Camera, Upload, CheckCircle2,
  Clock, XCircle, FileText, ChevronRight, User, Eye, Plus, Loader2, Sparkles,
  RotateCcw, Warehouse
} from 'lucide-react';
import {
  getDealEvidence, uploadEvidenceFile, verifyEvidence,
  acceptDelivery, openDispute, getDisputes, getDisputeDetails,
  respondToDispute
} from '../api/dealApi';
import { getReverseLogisticsByDeal } from '../api/hubApi';
import ReverseLogisticsModal from './ReverseLogisticsModal';
import { formatDateTime } from '../utils/dateUtils';

export default function DealEvidenceDisputeSection({ deal, user, onDealUpdated, onOpenRating }) {
  const dealId = deal?.id;
  const isFarmer = user?.role === 'FARMER' || deal?.farmer?.id === user?.id;
  const isBuyer = user?.role === 'BUSINESS' || deal?.buyer?.id === user?.id;
  const isObserver = user?.role === 'OBSERVER';
  const isAdmin = user?.role === 'ADMIN';

  const [evidenceList, setEvidenceList] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [reverseLogistics, setReverseLogistics] = useState(null);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStage, setUploadStage] = useState('ORIGIN'); // ORIGIN, DELIVERY, ADDITIONAL
  const [fileToUpload, setFileToUpload] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [lotQuantity, setLotQuantity] = useState(deal?.quantity || '');
  const [grade, setGrade] = useState('Grade A');

  // Dispute creation modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('QUANTITY_MISMATCH');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputedQty, setDisputedQty] = useState(deal?.quantity || '');
  const [disputeFile, setDisputeFile] = useState(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Dispute response
  const [responseText, setResponseTypeText] = useState('');
  const [responseType, setResponseType] = useState('RESPONSE');
  const [responseFile, setResponseFile] = useState(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Verification modal / inline
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchEvidenceAndDisputes = async () => {
    if (!dealId) return;
    try {
      setLoading(true);
      const [evRes, dispRes, revRes] = await Promise.all([
        getDealEvidence(dealId).catch(() => []),
        getDisputes(dealId).catch(() => []),
        getReverseLogisticsByDeal(dealId).catch(() => null),
      ]);
      setEvidenceList(Array.isArray(evRes) ? evRes : []);
      const dispList = Array.isArray(dispRes) ? dispRes : [];
      setDisputes(dispList);
      if (dispList.length > 0) {
        const details = await getDisputeDetails(dispList[0].id).catch(() => null);
        if (details) setSelectedDispute(details);
      }
      setReverseLogistics(revRes || null);
    } catch (e) {
      console.error('Failed to load evidence/disputes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidenceAndDisputes();
  }, [dealId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileToUpload(f);
      setFilePreview(URL.createObjectURL(f));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return alert('Please select a photo to upload');
    try {
      setUploading(true);
      await uploadEvidenceFile(dealId, fileToUpload, {
        stage: uploadStage,
        description: uploadDesc,
        lotQuantity: lotQuantity || deal?.quantity,
        grade: grade || 'Standard'
      });
      setShowUploadModal(false);
      setFileToUpload(null);
      setFilePreview(null);
      setUploadDesc('');
      await fetchEvidenceAndDisputes();
      if (onDealUpdated) onDealUpdated();
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyEvidence = async (evId, status, notes) => {
    try {
      setVerifyingId(evId);
      await verifyEvidence(evId, { status, notes: notes || `Verified by ${user?.name}` });
      await fetchEvidenceAndDisputes();
    } catch (err) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAcceptDelivery = async () => {
    if (!window.confirm('Confirm that you have received this produce in good condition and accept delivery?')) return;
    try {
      setLoading(true);
      await acceptDelivery(dealId);
      await fetchEvidenceAndDisputes();
      if (onDealUpdated) onDealUpdated();
      if (onOpenRating) onOpenRating();
    } catch (err) {
      alert(err.message || 'Failed to accept delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDisputeSubmit = async (e) => {
    e.preventDefault();
    try {
      setDisputeSubmitting(true);
      let uploadedUrl = null;
      if (disputeFile) {
        const ev = await uploadEvidenceFile(dealId, disputeFile, {
          stage: 'DISPUTE',
          description: `Dispute photo: ${disputeReason}`
        });
        uploadedUrl = ev?.imageUrl;
      }
      await openDispute(dealId, {
        reason: disputeReason,
        description: disputeDesc,
        disputedQuantity: disputedQty ? parseInt(disputedQty, 10) : deal?.quantity,
        evidenceUrl: uploadedUrl
      });
      setShowDisputeModal(false);
      setDisputeDesc('');
      setDisputeFile(null);
      await fetchEvidenceAndDisputes();
      if (onDealUpdated) onDealUpdated();
    } catch (err) {
      alert(err.message || 'Failed to open dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!selectedDispute?.id || !responseText.trim()) return;
    try {
      setSubmittingResponse(true);
      let uploadedUrl = null;
      if (responseFile) {
        const ev = await uploadEvidenceFile(dealId, responseFile, {
          stage: 'ADDITIONAL',
          description: `Dispute response: ${responseText.substring(0, 50)}`
        });
        uploadedUrl = ev?.imageUrl;
      }
      await respondToDispute(selectedDispute.id, {
        message: responseText,
        responseType,
        evidenceUrl: uploadedUrl
      });
      setResponseTypeText('');
      setResponseFile(null);
      const updatedDetails = await getDisputeDetails(selectedDispute.id);
      setSelectedDispute(updatedDetails);
      await fetchEvidenceAndDisputes();
      if (onDealUpdated) onDealUpdated();
    } catch (err) {
      alert(err.message || 'Failed to send response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const originEvidence = evidenceList.filter(e => e.stage === 'ORIGIN');
  const deliveryEvidence = evidenceList.filter(e => e.stage === 'DELIVERY');
  const otherEvidence = evidenceList.filter(e => e.stage === 'DISPUTE' || e.stage === 'ADDITIONAL');

  return (
    <div className="space-y-6 mt-6">

      {/* ─────────────────────────────────────────────────────────────
          STAGE 1: ORIGIN VERIFICATION (BEFORE TRANSPORT)
          ───────────────────────────────────────────────────────────── */}
      <div id="origin-verification" className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden scroll-mt-24">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 border-b border-navy-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">1</span>
            <div>
              <h3 className="font-bold text-navy-900 text-sm sm:text-base flex items-center gap-2">
                Origin Verification (Logistics Start)
                {originEvidence.some(e => e.verificationStatus === 'VERIFIED') ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Observer Verified
                  </span>
                ) : originEvidence.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Uploaded (Pending Review)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Awaiting Farmer Initial Upload
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">Initial verification: Farmer posts photographic proof of crop condition & lot before dispatch.</p>
            </div>
          </div>

          {(isFarmer || isObserver || isAdmin) && (
            <button
              onClick={() => { setUploadStage('ORIGIN'); setShowUploadModal(true); }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Camera className="w-4 h-4" /> Upload Origin Photos
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Initial Farmer Instruction / Buyer Notice Banner */}
          {isFarmer && originEvidence.length === 0 && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Farmer Action Required:</strong> Please post 2–3 photos of your harvested produce and lot packaging at the pickup point before the vehicle leaves.</span>
              </div>
              <button
                onClick={() => { setUploadStage('ORIGIN'); setShowUploadModal(true); }}
                className="shrink-0 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
              >
                Upload Now
              </button>
            </div>
          )}

          {isBuyer && (
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <span>🌾</span>
              <span><strong>Origin Inspection:</strong> The farmer documents crop quality, packaging, and lot quantity at the start of logistics before vehicle departure.</span>
            </div>
          )}

          {originEvidence.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700">No origin photos uploaded yet</p>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                {isFarmer
                  ? "Take 2–3 photos of your harvested produce, bag seals, and lot before pickup to prevent transit disputes."
                  : "Origin photos will appear here once submitted by the farmer or authorized field observer."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {originEvidence.map(ev => (
                <EvidenceCard
                  key={ev.id}
                  evidence={ev}
                  canVerify={isObserver || isAdmin}
                  verifyingId={verifyingId}
                  onVerify={handleVerifyEvidence}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STAGE 2: DELIVERY VERIFICATION & BUYER ACCEPTANCE
          ───────────────────────────────────────────────────────────── */}
      <div id="delivery-verification" className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden scroll-mt-24">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 to-blue-50/20 border-b border-navy-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</span>
            <div>
              <h3 className="font-bold text-navy-900 text-sm sm:text-base flex items-center gap-2">
                Delivery Verification & Acceptance (Destination)
                {deliveryEvidence.some(e => e.verificationStatus === 'VERIFIED') ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Observer Inspected
                  </span>
                ) : deliveryEvidence.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Received Photos
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Awaiting Destination Arrival
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">Final step: Only the business recipient inspects the delivered goods and confirms delivery acceptance.</p>
            </div>
          </div>

          {(isBuyer || isObserver || isAdmin) && (
            <button
              onClick={() => { setUploadStage('DELIVERY'); setShowUploadModal(true); }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Camera className="w-4 h-4" /> Upload Delivery Photos
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Role contextual notices */}
          {isFarmer && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <span>🏢</span>
              <span><strong>Final Step (Business Recipient):</strong> At the end of logistics, only the business recipient (buyer) inspects the delivered produce and confirms delivery to complete the deal.</span>
            </div>
          )}

          {isBuyer && ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(deal?.status) && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>Business Recipient Step:</strong> Inspect the delivered produce upon unloading. You can photograph the batch and accept delivery, or report an issue if defective.</span>
              </div>
              <button
                onClick={() => { setUploadStage('DELIVERY'); setShowUploadModal(true); }}
                className="shrink-0 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" /> Upload Delivery Photo
              </button>
            </div>
          )}

          {deliveryEvidence.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700">No delivery photos uploaded yet</p>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                {isBuyer
                  ? "When the shipment arrives at your premises, inspect the goods, photograph the batch, and confirm receipt below."
                  : "Delivery inspection photos will be posted here once the business recipient or authorized observer inspects the unloading."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {deliveryEvidence.map(ev => (
                <EvidenceCard
                  key={ev.id}
                  evidence={ev}
                  canVerify={isObserver || isAdmin}
                  verifyingId={verifyingId}
                  onVerify={handleVerifyEvidence}
                />
              ))}
            </div>
          )}

          {/* BUYER ACTION BAR (CONFIRM DELIVERY VS REPORT ISSUE) - ONLY BUSINESS RECIPIENT */}
          {isBuyer && ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(deal?.status) && (
            <div className="mt-5 p-4 bg-gradient-to-r from-mustard-50/60 to-white border border-mustard-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-navy-900">Have you inspected the shipment?</p>
                <p className="text-xs text-gray-600">Accept delivery to complete the deal, or report an issue if there is damaged or missing produce.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAcceptDelivery}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Accept Delivery
                </button>
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Report Issue
                </button>
                <button
                  onClick={() => setShowReverseModal(true)}
                  className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4 text-orange-600" /> Reject & Return (Reverse Logistics)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STAGE 2.5: REVERSE LOGISTICS & RETURN INSPECTION (IF INITIATED)
          ───────────────────────────────────────────────────────────── */}
      {reverseLogistics && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-amber-50/60 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                <RotateCcw className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  Reverse Logistics & Return Staging
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-900 font-bold">
                    #{reverseLogistics.reverseTrackingId}
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  Reason: {reverseLogistics.returnReason?.replace(/_/g, ' ')} • Return Quantity: {reverseLogistics.quantityKg} kg
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {reverseLogistics.status}
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 uppercase font-semibold text-[10px] block">Destination</span>
                <span className="font-bold text-gray-900 text-sm">
                  {reverseLogistics.destinationType === 'NEAREST_HUB' ? 'Nearest Partner Hub' : 'Direct to Farmer'}
                </span>
                {reverseLogistics.destinationHub && (
                  <p className="text-gray-500 text-[11px] mt-0.5">{reverseLogistics.destinationHub.name}</p>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 uppercase font-semibold text-[10px] block">Distance Saved</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {reverseLogistics.distanceSavedKm > 0 ? `${reverseLogistics.distanceSavedKm} km` : 'Local Farm Return'}
                </span>
                <p className="text-emerald-600 text-[11px] mt-0.5">Algorithmic return routing</p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-blue-700 uppercase font-semibold text-[10px] block">Inspection Outcome</span>
                <span className="font-bold text-blue-900 text-sm">
                  {reverseLogistics.inspection?.decision?.replace(/_/g, ' ') || 'Pending Hub Intake'}
                </span>
                {reverseLogistics.inspection?.conditionGrading && (
                  <p className="text-blue-600 text-[11px] mt-0.5">{reverseLogistics.inspection.conditionGrading}</p>
                )}
              </div>
            </div>

            {reverseLogistics.optimizationRationale && (
              <p className="p-3 bg-gray-50 rounded-xl text-gray-600 border border-gray-200">
                <strong>Algorithmic Rationale:</strong> {reverseLogistics.optimizationRationale}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STAGE 3: DISPUTE & RESOLUTION THREAD (IF DISPUTED)
          ───────────────────────────────────────────────────────────── */}
      {(disputes.length > 0 || deal?.status === 'DISPUTED') && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-red-50/60 border-b border-red-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">⚠️</span>
              <div>
                <h3 className="font-bold text-red-950 text-sm sm:text-base flex items-center gap-2">
                  Dispute Resolution Thread
                  {selectedDispute?.status && (
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-red-700 border border-red-200">
                      {selectedDispute.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-800">
                  {selectedDispute?.reason?.replace(/_/g, ' ')} · Raised by {selectedDispute?.raisedByName || 'Buyer'}
                </p>
              </div>
            </div>

            {selectedDispute?.assignedObserverName && (
              <div className="text-right text-xs">
                <span className="text-gray-500">Field Observer:</span>
                <span className="font-bold text-navy-900 ml-1">👮 {selectedDispute.assignedObserverName}</span>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 space-y-4">

            {/* RESOLUTION BANNER IF RESOLVED / PARTIALLY RESOLVED */}
            {['RESOLVED', 'PARTIALLY_RESOLVED', 'REJECTED', 'ESCALATED'].includes(selectedDispute?.status) && (
              <div className={`p-4 rounded-xl border ${selectedDispute.status === 'PARTIALLY_RESOLVED' ? 'bg-amber-50 border-amber-200 text-amber-900' : selectedDispute.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Administrative Resolution: {selectedDispute.status.replace(/_/g, ' ')}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-2">
                  <div><span className="text-gray-500">Original Lot:</span> <strong className="ml-1">{selectedDispute.originalQuantity || deal?.quantity} kg</strong></div>
                  <div><span className="text-gray-500">Accepted Qty:</span> <strong className="ml-1 text-emerald-700">{selectedDispute.acceptedQuantity || '—'} kg</strong></div>
                  <div><span className="text-gray-500">Disputed Qty:</span> <strong className="ml-1 text-red-700">{selectedDispute.disputedQuantity || '—'} kg</strong></div>
                  {selectedDispute.adjustmentAmount && (
                    <div className="col-span-2"><span className="text-gray-500">Adjustment Amount:</span> <strong className="ml-1 text-emerald-700">₹{selectedDispute.adjustmentAmount}</strong></div>
                  )}
                </div>
                {selectedDispute.resolutionNotes && (
                  <p className="text-xs italic bg-white/70 p-2.5 rounded-lg border border-gray-100">
                    "{selectedDispute.resolutionNotes}" — Admin {selectedDispute.resolvedByName || ''}
                  </p>
                )}
              </div>
            )}

            {/* MESSAGES / CLAIMS TIMELINE */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedDispute?.responses?.map((r) => {
                const isMe = r.userId === user?.id;
                const isObs = r.userRole === 'OBSERVER';
                const isAdm = r.userRole === 'ADMIN';

                return (
                  <div key={r.id} className={`p-3.5 rounded-xl border text-xs ${
                    isAdm ? 'bg-purple-50/70 border-purple-200' :
                    isObs ? 'bg-blue-50/70 border-blue-200' :
                    isMe ? 'bg-mustard-50/50 border-mustard-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-navy-900 flex items-center gap-1.5">
                        {isAdm ? '👑 Admin' : isObs ? '👮 Observer' : r.userRole === 'FARMER' ? '👨🌾 Farmer' : '🏪 Buyer'}: {r.userName}
                        {r.responseType && (
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-600">
                            {r.responseType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-800 text-xs whitespace-pre-wrap">{r.message}</p>
                    {r.evidenceUrl && (
                      <div className="mt-2.5">
                        <img
                          src={r.evidenceUrl}
                          alt="Evidence attachment"
                          className="w-32 h-24 object-cover rounded-lg border border-gray-200 hover:scale-105 transition cursor-pointer shadow-2xs"
                          onClick={() => window.open(r.evidenceUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RESPONSE COMPOSER */}
            {!['RESOLVED', 'REJECTED'].includes(selectedDispute?.status) && (
              <form onSubmit={handleSendResponse} className="pt-2 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <select
                    value={responseType}
                    onChange={(e) => setResponseType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                  >
                    <option value="RESPONSE">General Response</option>
                    {isFarmer && <option value="AGREEMENT">Agree with Claim</option>}
                    {isFarmer && <option value="DISAGREEMENT">Disagree with Claim</option>}
                    {isObserver && <option value="OBSERVER_REPORT">Observer Verification Report</option>}
                    <option value="EVIDENCE_SUBMISSION">Additional Evidence</option>
                  </select>

                  <label className="cursor-pointer text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{responseFile ? responseFile.name.substring(0, 15) : 'Attach Photo'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setResponseFile(e.target.files?.[0])} className="hidden" />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={responseText}
                    onChange={(e) => setResponseTypeText(e.target.value)}
                    placeholder={
                      isFarmer ? "Explain your position or offer settlement..." :
                      isObserver ? "Record your on-site observations..." :
                      "Add comments or clarify requirements..."
                    }
                    className="flex-1 px-3.5 py-2.5 text-xs bg-gray-50 border border-navy-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-navy-800"
                  />
                  <button
                    type="submit"
                    disabled={submittingResponse || !responseText.trim()}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {submittingResponse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EVIDENCE UPLOAD MODAL
          ───────────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-navy-100">
            <h3 className="font-bold text-navy-900 text-base mb-1">
              Upload {uploadStage === 'ORIGIN' ? 'Origin' : 'Delivery'} Evidence
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Clear photos protect both farmers and buyers against disputes.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                {filePreview ? (
                  <div className="relative inline-block">
                    <img src={filePreview} alt="Preview" className="max-h-40 rounded-lg mx-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => { setFileToUpload(null); setFilePreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-emerald-700 block">Click to take photo or choose file</span>
                    <span className="text-[11px] text-gray-400">JPG, PNG, WebP up to 5MB</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Lot Quantity ({deal?.unit || 'kg'})</label>
                <input
                  type="number"
                  value={lotQuantity}
                  onChange={(e) => setLotQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Quality Grade / Condition</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g. Grade A, Cleaned, Intact gunny bags"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Observation Notes</label>
                <textarea
                  rows="2"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl resize-none"
                  placeholder="Describe lot condition, packing, seals, or visible characteristics..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading || !fileToUpload}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading to Cloudinary...' : 'Submit Evidence'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 text-xs text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STRUCTURED DISPUTE MODAL
          ───────────────────────────────────────────────────────────── */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-red-200">
            <h3 className="font-bold text-navy-900 text-base mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Report an Issue / Open Dispute
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Disputes are traceable and resolved through photographic evidence and authorized inspection.
            </p>

            <form onSubmit={handleOpenDisputeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="QUANTITY_MISMATCH">Quantity Mismatch (Weight/count difference)</option>
                  <option value="PRODUCE_DAMAGED">Produce Damaged (Rot, transit damage, broken crates)</option>
                  <option value="QUALITY_MISMATCH">Quality Mismatch (Does not match agreed sample)</option>
                  <option value="WRONG_PRODUCE">Wrong Produce (Different variety delivered)</option>
                  <option value="PACKAGING_DAMAGED">Packaging Damaged (Torn bags / spillage)</option>
                  <option value="MISSING_ITEMS">Missing Items (Partial consignment)</option>
                  <option value="DELIVERY_ISSUE">Delivery Issue (Delay / incorrect drop point)</option>
                  <option value="OTHER">Other specific grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Disputed Quantity ({deal?.unit || 'kg'})</label>
                <input
                  type="number"
                  value={disputedQty}
                  onChange={(e) => setDisputedQty(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder={`Total deal quantity is ${deal?.quantity || 0}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Issue Description & Claims</label>
                <textarea
                  rows="3"
                  required
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl resize-none"
                  placeholder="Detail exactly what was damaged, missing, or mismatched..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Attach Photo Evidence (Recommended)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDisputeFile(e.target.files?.[0])}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={disputeSubmitting || !disputeDesc.trim()}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {disputeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  {disputeSubmitting ? 'Opening Dispute...' : 'Submit Formal Dispute'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2.5 text-xs text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REVERSE LOGISTICS MODAL
          ───────────────────────────────────────────────────────────── */}
      <ReverseLogisticsModal
        isOpen={showReverseModal}
        onClose={() => setShowReverseModal(false)}
        deal={deal}
        onSuccess={() => {
          fetchEvidenceAndDisputes();
          if (onDealUpdated) onDealUpdated();
        }}
      />

    </div>
  );
}

function EvidenceCard({ evidence, canVerify, verifyingId, onVerify }) {
  const isVerified = evidence.verificationStatus === 'VERIFIED';
  const isRejected = evidence.verificationStatus === 'REJECTED';

  return (
    <div className="group relative rounded-xl border border-navy-100 overflow-hidden bg-white shadow-2xs hover:shadow-xs transition">
      <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
        <img
          src={evidence.imageUrl}
          alt={evidence.description || 'Evidence'}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
          onClick={() => window.open(evidence.imageUrl, '_blank')}
        />
        <div className="absolute top-1.5 left-1.5">
          {isVerified ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-600 text-white shadow-xs">
              <XCircle className="w-3 h-3" /> Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5 space-y-1">
        <p className="text-[11px] font-semibold text-navy-900 line-clamp-1">
          {evidence.description || `${evidence.stage} photograph`}
        </p>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>{evidence.uploaderRole}: {evidence.uploaderName}</span>
          {evidence.lotQuantity && <span className="font-bold text-gray-700">{evidence.lotQuantity} kg</span>}
        </div>
        <p className="text-[9px] text-gray-400">
          {formatDateTime(evidence.createdAt)}
        </p>

        {isVerified && evidence.verifiedByName && (
          <p className="text-[9px] text-emerald-700 font-medium">
            ✓ Inspected by {evidence.verifiedByName}
          </p>
        )}

        {/* Observer / Admin Verification Controls */}
        {canVerify && !isVerified && (
          <div className="pt-2 border-t border-gray-100 flex gap-1">
            <button
              onClick={() => onVerify(evidence.id, 'VERIFIED', 'Verified by field inspector')}
              disabled={verifyingId === evidence.id}
              className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition"
            >
              Verify
            </button>
            <button
              onClick={() => onVerify(evidence.id, 'REJECTED', 'Does not meet standards')}
              disabled={verifyingId === evidence.id}
              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg transition"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
