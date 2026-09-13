import React, { useState } from 'react';
import { X, AlertTriangle, Camera, Upload, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { reportIncident, uploadEvidenceFile } from '../api/dealApi';

export default function LogisticsIncidentModal({
  isOpen,
  onClose,
  deal,
  onIncidentReported = () => {},
}) {
  if (!isOpen || !deal) return null;

  const [incidentType, setIncidentType] = useState('TRANSIT_DAMAGE');
  const [description, setDescription] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [estimatedLossAmount, setEstimatedLossAmount] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide an incident description.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let uploadedUrl = null;
      if (file) {
        try {
          const uploadRes = await uploadEvidenceFile(deal.id || deal.dealId, file, {
            type: 'LOGISTICS_INCIDENT_PHOTO',
            notes: `Incident: ${incidentType}`,
          });
          uploadedUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data?.fileUrl;
        } catch (uploadErr) {
          console.warn('File upload fallback:', uploadErr);
        }
      }

      await reportIncident({
        dealId: deal.id || deal.dealId,
        incidentType,
        description,
        incidentLocation,
        estimatedLossAmount: estimatedLossAmount ? parseFloat(estimatedLossAmount) : null,
        evidenceUrl: uploadedUrl || previewUrl || null,
      });

      setSuccess(true);
      onIncidentReported();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDescription('');
        setFile(null);
        setPreviewUrl('');
      }, 1800);
    } catch (err) {
      setError(err?.message || 'Failed to submit logistics incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-navy-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-red-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Report Logistics / Transit Incident</h3>
              <p className="text-xs text-red-200">Deal: #{deal.dealId || deal.id} · {deal.cropName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-red-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-start gap-2 text-xs text-red-900">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p>
            Logistics incidents are investigated by platform observers and admins. Financial liabilities and escrow adjustments will be determined based on verification.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-navy-900">Incident Reported Successfully</h4>
              <p className="text-xs text-navy-500 max-w-sm mx-auto">
                An investigation case has been opened. The admin and deal counterparty have been notified.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-navy-800 mb-1">Incident Category</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:border-red-500"
                >
                  <option value="TRANSIT_DAMAGE">Produce Damaged / Crushed in Transit</option>
                  <option value="TRANSIT_DELAY">Severe Transit Delay</option>
                  <option value="ACCIDENT">Transporter Breakdown / Accident</option>
                  <option value="TEMPERATURE_FAILURE">Cold Chain / Temperature Failure</option>
                  <option value="SPOILAGE">Produce Spoilage / Decay</option>
                  <option value="OTHER">Other Transit Issue / Loss</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-800 mb-1">Location of Incident</label>
                  <input
                    type="text"
                    value={incidentLocation}
                    onChange={(e) => setIncidentLocation(e.target.value)}
                    placeholder="e.g. Pune Toll Plaza / NH48"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-800 mb-1">Estimated Loss (₹)</label>
                  <input
                    type="number"
                    value={estimatedLossAmount}
                    onChange={(e) => setEstimatedLossAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-800 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, state of cargo, vehicle condition, and driver statements..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-navy-800 mb-1">Damage / Vehicle Photo Evidence</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-red-400 rounded-xl p-3 text-center cursor-pointer transition bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-navy-600">
                      <Camera className="w-4 h-4 text-red-500" />
                      <span>{file ? file.name : 'Upload or capture photo'}</span>
                    </div>
                  </label>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-xl border border-gray-200"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Submit Incident Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
