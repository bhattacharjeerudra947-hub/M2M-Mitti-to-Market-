import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Package, MapPin, Truck, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar, Search } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../api';

const STATUS_BADGES = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  NEGOTIATING: 'bg-amber-50 text-amber-700 border-amber-200',
  FULFILLED: 'bg-navy-900 text-white border-navy-900',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
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
          <p className="text-sm text-navy-500 mb-6">Tell farmers what you need — matching supply will appear instantly.</p>

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
          ) : requirements.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No requirements posted yet</p>
              <p className="text-sm text-gray-500">Post your first requirement to get matched with farmers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requirements.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-navy-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy-900">{req.crop}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_BADGES[req.status] || STATUS_BADGES.OPEN}`}>{req.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {req.quantity} {req.unit}
                        {req.minPrice || req.maxPrice ? ` · ₹${req.minPrice || '?'}-${req.maxPrice || '?'}/${req.unit}` : ''}
                        {req.quality ? ` · ${req.quality}` : ''}
                      </p>
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
                      <p className="text-xs font-bold text-navy-900 mb-2 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Matching farmer supply</p>
                      {matches.supply.length === 0 ? (
                        <p className="text-xs text-gray-500">No farmer listings currently match this requirement.</p>
                      ) : (
                        <div className="space-y-2">
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