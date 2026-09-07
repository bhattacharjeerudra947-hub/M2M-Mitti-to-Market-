import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, MapPin, Package, Calendar, Search, AlertCircle, CheckCircle2, Loader2, Truck, ExternalLink } from 'lucide-react';
import { apiGet, apiPost } from '../api';

const FALLBACK_CROPS = ['Tomato', 'Onion', 'Potato', 'Rice', 'Wheat', 'Chilli', 'Mango', 'Grapes'];

export default function BulkOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cropOptions, setCropOptions] = useState(FALLBACK_CROPS);
  const [form, setForm] = useState({
    product: '', quantity: '', targetPrice: '', requiredBy: '',
    quality: 'Grade A', deliveryLocation: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [matches, setMatches] = useState(null); // { requirementId, supply[] }
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Load real crop names from the marketplace for the product dropdown
  useEffect(() => {
    apiGet('/api/produce/paged?availableOnly=true&size=100')
      .then((data) => {
        const names = [...new Set((data?.content || []).map((p) => p.name).filter(Boolean))];
        if (names.length) setCropOptions(names);
      })
      .catch(() => { /* keep fallback list */ });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product || !form.quantity) {
      setError('Product and quantity are required');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    setMatches(null);
    try {
      const req = await apiPost('/api/requirements', {
        crop: form.product,
        quantity: Number(form.quantity),
        unit: 'kg',
        minPrice: null,
        maxPrice: form.targetPrice ? Number(form.targetPrice) : null,
        quality: form.quality,
        requiredBy: form.requiredBy,
        deliveryLocation: form.deliveryLocation,
        transportPreference: 'PLATFORM',
        notes: form.notes,
      });
      setForm({ product: '', quantity: '', targetPrice: '', requiredBy: '', quality: 'Grade A', deliveryLocation: '', notes: '' });
      setSuccess(`Bulk request posted! Requirement #${req.id} for ${req.crop} is now visible to farmers.`);
      // Show matching farmer supply immediately
      await loadMatches(req.id);
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      setError(err.message || 'Failed to send bulk request');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMatches = async (reqId) => {
    setLoadingMatches(true);
    try {
      const data = await apiGet(`/api/requirements/${reqId}/matches`);
      setMatches({ requirementId: reqId, supply: data || [] });
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login'); return; }
      setError(err.message);
    } finally {
      setLoadingMatches(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="business" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Bulk Order</h1>
            <p className="text-navy-500 mt-1">Request large quantities directly from farmers</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{success}</p>
                <button onClick={() => navigate('/business/requirements')}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 underline hover:text-emerald-800">
                  View in My Requirements <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-9 h-9 bg-mustard-50 rounded-xl flex items-center justify-center border border-mustard-200">
                    <FileText className="w-5 h-5 text-navy-700" />
                  </div>
                  <h2 className="text-lg font-bold text-navy-900">Bulk Order Request</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product *</label>
                    <select value={form.product} onChange={e => setForm({...form, product: e.target.value})}
                      required className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition appearance-none">
                      <option value="" disabled>Select a crop</option>
                      {cropOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Quantity (kg) *</label>
                      <div className="relative">
                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number" min="1" required
                          value={form.quantity}
                          onChange={e => setForm({...form, quantity: e.target.value})}
                          placeholder="5000"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Price (₹/kg)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                        <input
                          type="number" min="0"
                          value={form.targetPrice}
                          onChange={e => setForm({...form, targetPrice: e.target.value})}
                          placeholder="26"
                          className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Required By</label>
                      <input
                        type="date"
                        value={form.requiredBy}
                        onChange={e => setForm({...form, requiredBy: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Grade</label>
                      <select value={form.quality} onChange={e => setForm({...form, quality: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition appearance-none">
                        <option>Grade A</option>
                        <option>Grade B</option>
                        <option>Any</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.deliveryLocation}
                        onChange={e => setForm({...form, deliveryLocation: e.target.value})}
                        placeholder="FreshMart Warehouse, Andheri West, Mumbai"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
                    <textarea
                      rows="3"
                      value={form.notes}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      placeholder="Any special requirements..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Bulk Request'}
                  </button>
                </form>
              </div>
            </div>

            {/* Matching Farmers */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-navy-700 mb-4 flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Matching Farmers / FPOs
              </h3>

              {loadingMatches && (
                <div className="bg-white rounded-2xl border border-navy-100 p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-navy-900 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Finding farmer supply...</p>
                </div>
              )}

              {!loadingMatches && !matches && (
                <div className="bg-white rounded-2xl border border-navy-100 p-8 text-center">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 mb-1">No matches yet</p>
                  <p className="text-xs text-gray-500">Fill the form and send your bulk request — matching farmer supply will appear here instantly.</p>
                </div>
              )}

              {!loadingMatches && matches && (
                <div className="space-y-3">
                  {matches.supply.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-navy-100 p-8 text-center">
                      <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-700 mb-1">No farmer listings match yet</p>
                      <p className="text-xs text-gray-500">Farmers posting this crop will appear here.</p>
                    </div>
                  ) : (
                    matches.supply.map((s) => (
                      <div key={s.produceId} className="bg-white rounded-2xl border border-navy-100 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-navy-900">{s.crop}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.farmerName}</p>
                            {s.location && <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" /> {s.location}</p>}
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${s.priceCompatible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {s.priceCompatible ? '✓ In Range' : '⚠ Price'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-lg font-bold text-navy-900">₹{s.pricePerUnit}/{s.unit}</p>
                            <p className="text-xs text-gray-500">{s.availableQuantity} {s.unit} available</p>
                          </div>
                          <button onClick={() => navigate(`/business/product/${s.produceId}`)}
                            className="px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800">
                            View Produce
                          </button>
                        </div>
                        {!s.priceCompatible && s.priceNote && (
                          <p className="text-[10px] text-amber-600 mt-2">⚠ {s.priceNote}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}