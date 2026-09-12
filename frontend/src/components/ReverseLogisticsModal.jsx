import React, { useState, useEffect } from 'react';
import {
  RotateCcw, AlertTriangle, CheckCircle2, Warehouse, User, ArrowRight,
  TrendingDown, ShieldAlert, Loader2, X, UploadCloud, MapPin, Info
} from 'lucide-react';
import { optimizeReverseDestination, requestReverseLogistics } from '../api/hubApi';
import { uploadEvidenceFile } from '../api/dealApi';

const RETURN_REASONS = [
  { value: 'QUALITY_MISMATCH', label: 'Quality / Grade Mismatch with Locked Deal' },
  { value: 'DAMAGE_IN_TRANSIT', label: 'Transit Damage / Bruised or Crushed Produce' },
  { value: 'SPOILAGE', label: 'Spoilage / Mold or Overripe on Arrival' },
  { value: 'INCORRECT_SPECIFICATION', label: 'Produce Size / Variety / Moisture Discrepancy' },
  { value: 'DELIVERY_REJECTED', label: 'Buyer Full Rejection at Gate Inspection' },
  { value: 'EXCESS_QUANTITY', label: 'Quantity Excess beyond Warehouse Receiving Capacity' },
  { value: 'OTHER', label: 'Other Specified Logistics Reason' },
];

export default function ReverseLogisticsModal({
  isOpen,
  onClose,
  deal,
  onSuccess = () => {},
}) {
  const [reason, setReason] = useState('QUALITY_MISMATCH');
  const [quantityKg, setQuantityKg] = useState(deal?.quantityKg || deal?.quantity || 100);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Optimizer state
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [destinationChoice, setDestinationChoice] = useState('AUTO'); // 'AUTO' | 'NEAREST_HUB' | 'FARMER'
  const [selectedHubId, setSelectedHubId] = useState(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch optimization recommendation whenever quantity or reason changes
  useEffect(() => {
    if (!isOpen || !deal?.id) return;
    let isMounted = true;
    const fetchOptimization = async () => {
      setOptimizing(true);
      setError('');
      try {
        const res = await optimizeReverseDestination(deal.id, quantityKg, reason);
        if (isMounted && res) {
          setOptimization(res);
          if (res.recommendedHubId) {
            setSelectedHubId(res.recommendedHubId);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Reverse optimization failed:', err);
        }
      } finally {
        if (isMounted) setOptimizing(false);
      }
    };

    const timer = setTimeout(fetchOptimization, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, deal?.id, quantityKg, reason]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadEvidenceFile(deal.id, file, {
        stage: 'DELIVERY_REJECTED',
        description: 'Return pickup verification photo'
      });
      if (res?.cloudinaryUrl || res?.evidence?.cloudinaryUrl) {
        setPhotoUrl(res?.cloudinaryUrl || res?.evidence?.cloudinaryUrl);
      }
    } catch (err) {
      setError('Photo upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantityKg || quantityKg <= 0) {
      setError('Please provide a valid return quantity');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const recType = destinationChoice === 'AUTO'
        ? (optimization?.recommendedType || 'NEAREST_HUB')
        : destinationChoice;

      const payload = {
        returnReason: reason,
        quantityKg: Number(quantityKg),
        destinationType: recType,
        destinationHubId: recType === 'NEAREST_HUB' ? (selectedHubId || optimization?.recommendedHubId) : null,
        notes: notes || 'Buyer initiated reverse logistics return inspection',
        initialPhotoUrl: photoUrl || null,
      };

      const result = await requestReverseLogistics(deal.id, payload);
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit reverse logistics request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <RotateCcw className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Initiate Reverse Logistics & Inspection</h2>
              <p className="text-xs text-amber-100">
                M2M Algorithmic Destination Routing • Deal #{deal?.dealNumber || deal?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Reason & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Return / Rejection *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Return Quantity (kg) *
              </label>
              <input
                type="number"
                min="1"
                max={deal?.quantityKg || 100000}
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Total Deal: {deal?.quantityKg || deal?.quantity} kg
              </span>
            </div>
          </div>

          {/* Real-time Algorithmic Route Optimizer Card */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Algorithmic Return Routing Optimizer
                </h4>
              </div>
              {optimizing ? (
                <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Optimizing routes...
                </span>
              ) : (
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  AI Evaluated
                </span>
              )}
            </div>

            {optimization && (
              <div className="space-y-3">
                {/* Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Return to Farmer */}
                  <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-gray-500 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Option A: Return to Farmer
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      {optimization.farmerDistanceKm ?? '—'} km
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {deal?.farmer?.name || 'Farmer'} ({deal?.pickupLocation || 'Farm origin'})
                    </p>
                  </div>

                  {/* Nearest Hub */}
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-300 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-800 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-emerald-600" /> Option B: Partner Hub Staging
                      </span>
                    </div>
                    <p className="font-bold text-emerald-900 text-sm">
                      {optimization.recommendedHubDistanceKm ?? '—'} km
                    </p>
                    <p className="text-[11px] text-emerald-800 truncate">
                      {optimization.recommendedHubName || 'Nearest Authorized Hub'}
                    </p>
                  </div>
                </div>

                {/* Algorithmic Verdict */}
                <div className="p-3 bg-white rounded-xl border border-amber-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-gray-900">
                      Recommendation: {optimization.recommendedType === 'NEAREST_HUB' ? 'Stage at Nearest Partner Hub' : 'Return Direct to Farmer'}
                    </p>
                    <p className="text-gray-600 mt-0.5 leading-relaxed">
                      {optimization.rationale || 'Optimal balance between transit cost, distance saved, and crop preservation.'}
                    </p>
                    {optimization.distanceSavedKm > 0 && (
                      <p className="text-emerald-700 font-bold mt-1 text-[11px]">
                        🌿 Saves {optimization.distanceSavedKm} km of unnecessary hauling & ~₹{(optimization.distanceSavedKm * 20).toLocaleString()} in transit waste!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Destination Override Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Choose Routing Destination
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDestinationChoice('AUTO')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  destinationChoice === 'AUTO'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ✨ Algorithmic Best Choice
              </button>
              <button
                type="button"
                onClick={() => setDestinationChoice('FARMER')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  destinationChoice === 'FARMER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                👨‍🌾 Force Return to Farmer
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Inspection Notes / Evidence Description
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe why the produce was rejected, visible defects, temperature issues, etc..."
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Defect Photo / Receiving Slip (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-gray-500" />
                <span>{uploadingPhoto ? 'Uploading...' : 'Upload Inspection Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
              {photoUrl && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" /> Confirm Reverse Logistics
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
