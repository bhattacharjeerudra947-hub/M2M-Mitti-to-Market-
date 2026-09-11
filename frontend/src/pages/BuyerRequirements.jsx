import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Package, MapPin, Truck, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar, Search, History, Clock } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../api';

const STATUS_BADGES = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  NEGOTIATING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIALLY_FULFILLED: 'bg-mustard-50 text-mustard-700 border-mustard-200',
  FULFILLED: 'bg-navy-900 text-white border-navy-900',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
  ADMIN_REMOVED: 'bg-red-50 text-red-600 border-red-200',
};

export default function BuyerRequirements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState(null); // { requirementId, supply[] }
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [tab, setTab] = useState('active'); // active | history

  const [form, setForm] = useState({
    crop: '', quantity: '', unit: 'kg', minPrice: '', maxPrice: '',
    quality: '', requiredBy: '', deliveryLocation: '', transportPreference: 'PLATFORM', notes: ''
  });

  const loadRequirements = async () => {
    if (!user) return;
    try {
      const data = await apiGet('/api/requirements/my');
      setRequirements(data || []);
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequirements(); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.crop || !form.quantity) { setError('Crop and quantity are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/api/requirements', {
        crop: form.crop, quantity: Number(form.quantity), unit: form.unit,
        minPrice: form.minPrice ? Number(form.minPrice) : null,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        quality: form.quality, requiredBy: form.requiredBy,
        deliveryLocation: form.deliveryLocation, transportPreference: form.transportPreference,
        notes: form.notes,
      });
      setForm({ crop: '', quantity: '', unit: 'kg', minPrice: '', maxPrice: '', quality: '', requiredBy: '', deliveryLocation: '', transportPreference: 'PLATFORM', notes: '' });
      setShowForm(false);
      await loadRequirements();
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      setError(err.message || 'Failed to post requirement');
    } finally {
      setSubmitting(false);
    }
  };

  const viewMatches = async (reqId) => {
    setLoadingMatches(true);
    setMatches(null);
    try {
      const data = await apiGet(`/api/requirements/${reqId}/matches`);
      setMatches({ requirementId: reqId, supply: data || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMatches(false);
    }
  };

  const updateStatus = async (reqId, status) => {
    try {
      await apiPut(`/api/requirements/${reqId}/status`, { status });
      await loadRequirements();
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      alert(err.message);
    }
  };

  const activeRequirement = matches ? requirements.find(r => r.id === matches.requirementId) : null;

  const ACTIVE_STATUSES = ['OPEN', 'MATCHED', 'NEGOTIATING', 'PARTIALLY_FULFILLED'];
  const visible = requirements.filter(r => tab === 'active'
    ? ACTIVE_STATUSES.includes(r.status)
    : !ACTIVE_STATUSES.includes(r.status));
  const historyCount = requirements.filter(r => !ACTIVE_STATUSES.includes(r.status)).length;

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-navy-900">My Requirements</h1>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-900 text-white rounded-xl font-semibold text-sm hover:bg-navy-800 transition">
              <PlusCircle className="w-4 h-4" /> {showForm ? 'Close' : 'Post Requirement'}
            </button>
          </div>
          <p className="text-sm text-navy-500 mb-4">Tell farmers what you need — matching supply will appear instantly.</p>

          {/* Active / History tabs */}
          <div className="flex items-center gap-2 mb-4">
            {[[
              'active',
              `Active (${requirements.filter(r => ACTIVE_STATUSES.includes(r.status)).length})`,
              Clock,
            ], [
              'history',
              `History (${historyCount})`,
              History,
            ]].map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                  tab === key ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 border border-navy-100 hover:bg-gray-50'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Post form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-navy-100 p-5 mb-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Crop *</label>
                  <input value={form.crop} onChange={e => setForm({...form, crop: e.target.value})}
                    placeholder="e.g. Tomato" required className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Quantity *</label>
                  <div className="flex gap-2">
                    <input value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                      type="number" placeholder="5000" required className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                    <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                      className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                      <option>kg</option><option>quintal</option><option>ton</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Min price ₹/unit</label>
                  <input value={form.minPrice} onChange={e => setForm({...form, minPrice: e.target.value})}
                    type="number" placeholder="22" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Max price ₹/unit</label>
                  <input value={form.maxPrice} onChange={e => setForm({...form, maxPrice: e.target.value})}
                    type="number" placeholder="28" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Quality / grade</label>
                  <input value={form.quality} onChange={e => setForm({...form, quality: e.target.value})}
                    placeholder="Grade A" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Required by</label>
                  <input value={form.requiredBy} onChange={e => setForm({...form, requiredBy: e.target.value})}
                    type="date" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Delivery location</label>
                  <input value={form.deliveryLocation} onChange={e => setForm({...form, deliveryLocation: e.target.value})}
                    placeholder="Mumbai" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Transport preference</label>
                  <select value={form.transportPreference} onChange={e => setForm({...form, transportPreference: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                    <option value="PLATFORM">Mitti2Market Logistics</option>
                    <option value="BUYER">I'll arrange</option>
                    <option value="SELLER">Farmer arranges</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={2} placeholder="Any additional details" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : 'Post Requirement'}
              </button>
            </form>
          )}

          {/* Requirements list */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
            </div>
          ) : tab === 'history' && visible.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-navy-100">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No history yet</p>
              <p className="text-sm text-gray-500">Fulfilled and cancelled requirements move here automatically.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No requirements posted yet</p>
              <p className="text-sm text-gray-500">Post your first requirement to get matched with farmers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-navy-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy-900">{req.crop}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_BADGES[req.status] || STATUS_BADGES.OPEN}`}>{req.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {req.requiredQuantity || req.quantity} {req.unit} required
                        {(req.fulfilledQuantity > 0 || req.status === 'PARTIALLY_FULFILLED' || req.status === 'FULFILLED') &&
                          ` · ${req.fulfilledQuantity || 0} ${req.unit} fulfilled · ${req.remainingQuantity ?? Math.max(0, (req.requiredQuantity || req.quantity) - (req.fulfilledQuantity || 0))} ${req.unit} remaining`}
                        {req.minPrice || req.maxPrice ? ` · ₹${req.minPrice || '?'}-${req.maxPrice || '?'}/${req.unit}` : ''}
                        {req.quality ? ` · ${req.quality}` : ''}
                      </p>
                      {(req.requiredQuantity || req.quantity) > 0 && (req.fulfilledQuantity > 0) && (
                        <div className="mt-2 max-w-xs">
                          <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((req.fulfilledQuantity || 0) / (req.requiredQuantity || req.quantity)) * 100))}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500 space-y-1">
                      {req.requiredBy && <p className="flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" /> by {req.requiredBy}</p>}
                      {req.deliveryLocation && <p className="flex items-center gap-1 justify-end"><MapPin className="w-3 h-3" /> {req.deliveryLocation}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button onClick={() => viewMatches(req.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800">
                      <Search className="w-3.5 h-3.5" /> Find Matches
                    </button>
                    {req.status === 'OPEN' && (
                      <>
                        <button onClick={() => updateStatus(req.id, 'NEGOTIATING')} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 hover:bg-amber-100">Mark Negotiating</button>
                        <button onClick={() => updateStatus(req.id, 'CANCELLED')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-100">Cancel</button>
                      </>
                    )}
                    {req.status === 'NEGOTIATING' && (
                      <button onClick={() => updateStatus(req.id, 'FULFILLED')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 hover:bg-emerald-100">Mark Fulfilled</button>
                    )}
                  </div>

                  {/* Matches */}
                  {loadingMatches && matches?.requirementId === req.id && (
                    <div className="mt-3 text-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-navy-900 mx-auto" />
                    </div>
                  )}
                  {matches?.requirementId === req.id && !loadingMatches && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-navy-900 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-navy-700" />
                          {matches.supply.length > 0 ? `Matching farmer supply (${matches.supply.length})` : 'Matching farmer supply'}
                        </p>
                        {matches.supply.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            ✓ Matching farmer found
                          </span>
                        )}
                      </div>

                      {matches.supply.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                          <p className="text-xs font-semibold text-navy-800">No matching farmers currently.</p>
                          <p className="text-xs text-gray-500 mt-0.5">Your bulk requirement is active. We'll notify you when suitable produce becomes available.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <span className="text-base">⏳</span>
                            <div>
                              <p className="font-bold">Awaiting Farmer Initiation</p>
                              <p className="text-[11px] text-amber-800/90 mt-0.5">
                                Matching farmers have been notified of your requirement. Under Mitti2Market rules, deals are initiated by the farmer to confirm their readiness.
                              </p>
                            </div>
                          </div>

                          {matches.supply.map(s => (
                            <div key={s.produceId} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div>
                                <p className="text-sm font-semibold text-navy-900">{s.crop} · {s.availableQuantity} {s.unit}</p>
                                <p className="text-xs text-gray-500">{s.farmerName} · {s.location}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-navy-900">₹{s.pricePerUnit}/{s.unit}</p>
                                <p className={`text-[10px] font-semibold ${s.priceCompatible ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {s.priceCompatible ? '✓ Within target price' : `⚠ ${s.priceNote}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}