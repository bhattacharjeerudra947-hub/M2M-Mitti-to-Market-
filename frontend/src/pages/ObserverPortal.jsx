import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, CheckCircle2, Clock, AlertTriangle, Eye, Camera,
  MapPin, Package, ArrowRight, Loader2
} from 'lucide-react';
import { getObserverCases, verifyEvidence } from '../api/dealApi';
import { formatDateTime } from '../utils/dateUtils';

export default function ObserverPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getObserverCases();
      setCases(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load assigned verification cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="bg-white p-6 rounded-2xl border border-navy-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Authorized Field Observer
              </div>
              <h1 className="text-2xl font-bold text-navy-900">Verification & Inspection Queue</h1>
              <p className="text-xs text-gray-500 mt-1">
                Conduct on-site inspections for bulk harvests, disputed consignments, and quality verifications.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">Logged in Observer:</span>
              <span className="text-sm font-bold text-navy-900">{user?.name} ({user?.phone || 'Field Ops'})</span>
            </div>
          </div>

          {/* CASES LIST */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Fetching assigned cases...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
              {error}
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-navy-100 p-8 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-navy-900 text-base">No Pending Inspections</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                All assigned deals and dispute inspections have been completed or none are currently assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => {
                const deal = c.deal;
                const dispute = c.dispute;

                return (
                  <div key={c.assignmentId} className="bg-white rounded-2xl border border-navy-100 p-5 shadow-xs hover:border-navy-200 transition">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-navy-900">Case #{c.assignmentId}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Deal #{deal?.id}
                          </span>
                          {dispute && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              ⚠️ Disputed: {dispute.reason?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned on {formatDateTime(c.assignedAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(`/deals/${deal?.id}`)}
                        className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        Open Deal & Inspect <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {c.notes && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 mb-3">
                        <strong>Admin Instructions:</strong> {c.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block">Produce:</span>
                        <strong className="text-gray-900">{deal?.produce?.name || 'Produce'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Lot Quantity:</span>
                        <strong className="text-gray-900">{deal?.quantity || '—'} {deal?.unit || 'kg'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Farmer Origin:</span>
                        <strong className="text-gray-900">🌾 {deal?.farmer?.name} ({deal?.farmer?.location || 'Origin'})</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Buyer Destination:</span>
                        <strong className="text-gray-900">🏪 {deal?.buyer?.name} ({deal?.buyer?.location || 'Destination'})</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
