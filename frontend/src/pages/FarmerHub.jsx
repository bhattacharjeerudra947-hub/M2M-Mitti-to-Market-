import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiUpload, apiPut } from '../api';
import {
  PlusCircle, Brain, ShoppingCart, Trophy, MapPin, Package,
  X, Camera, Image, FileImage, Loader2, TrendingUp, TrendingDown, Minus,
  Info, WifiOff, Save, CloudUpload, RefreshCw, ShieldCheck, ChevronDown,
  ChevronUp, Wallet, MessageCircle, CheckCircle2, ClipboardList, AlertTriangle
} from 'lucide-react';
import { saveDraft, queueDraft, deleteDraft, getDraft, useSyncStatus } from '../utils/syncQueue';
import { idbSupported } from '../utils/idb';

const TABS = [
  { key: 'add', label: 'Add Produce',       icon: PlusCircle },
  { key: 'price', label: 'AI Price Advisor', icon: Brain },
  { key: 'requests', label: 'Buyer Requests', icon: ShoppingCart },
  { key: 'deals', label: 'AI Deal Advisor',  icon: Trophy },
];

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/* ──────────────────────────────────────────
   Input with dropdown
────────────────────────────────────────── */
function InputWithDropdown({ value, onChange, onFocus, onBlur, options, placeholder, loading, maxHeight, emptyLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const finalOnFocus = onFocus || (() => setOpen(true));
  const finalOnBlur = onBlur || (() => setTimeout(() => setOpen(false), 150));
  useEffect(() => { setOpen(false); }, [value]);
  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={finalOnFocus}
        onBlur={finalOnBlur}
        placeholder={placeholder}
        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 bg-white border border-navy-100 rounded-xl shadow-lg overflow-hidden" style={{ maxHeight: maxHeight || 250, overflowY: 'auto' }}>
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">{emptyLabel || 'No results'}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-mustard-50"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Tab 1 — Add Produce
────────────────────────────────────────── */
function AddProduceSection({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ name: '', category: 'Vegetables', quantity: '', unit: 'kg', grade: 'A', pricePerUnit: '', location: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [buyers, setBuyers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [localDraftId, setLocalDraftId] = useState(null);
  const syncStatus = useSyncStatus();

  const categories = ['Vegetables', 'Fruits', 'Grains', 'Spices', 'Dairy', 'Pulses', 'Oilseeds', 'Other'];
  const units = ['kg', 'quintal', 'tonne', 'dozen', 'piece', 'bunch', 'pack'];

  useEffect(() => {
    if (!user?.id) return;
    setLoadingBuyers(true);
    apiGet('/api/buyers/open').then(data => setBuyers(data || [])).catch(() => setBuyers([])).finally(() => setLoadingBuyers(false));
  }, [user?.id]);

  const fetchAiSuggestion = useCallback(async (cropName, loc) => {
    if (!cropName || cropName.trim().length < 3) return;
    setAiLoading(true);
    try {
      const data = await apiGet(`/api/price-advisor/${encodeURIComponent(cropName)}?location=${encodeURIComponent(loc || '')}&desiredPrice=${form.pricePerUnit || 0}`);
      setAiAnalysis(data);
      setShowAiPanel(true);
      if (!form.pricePerUnit && data?.aiOptimalPrice) setForm(prev => ({ ...prev, pricePerUnit: data.aiOptimalPrice.toString() }));
    } catch { setAiAnalysis(null); setShowAiPanel(false); } finally { setAiLoading(false); }
  }, [form.pricePerUnit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'name' && value.trim().length >= 3) fetchAiSuggestion(value.trim(), form.location);
  };
  const handleLocationChange = (e) => {
    const v = e.target.value;
    setForm(prev => ({ ...prev, location: v }));
    if (form.name.trim().length >= 3 && v.trim().length >= 3) fetchAiSuggestion(form.name.trim(), v.trim());
  };

  useEffect(() => {
    const on = () => setOffline(false); const off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const d = location.state?.draft;
    if (d) {
      setForm({ name: d.name || '', category: d.category || 'Vegetables', quantity: d.quantity || '', unit: d.unit || 'kg', grade: d.grade || 'A', pricePerUnit: d.pricePerUnit || '', location: d.location || '', description: d.description || '' });
      setLocalDraftId(d.localDraftId);
      setDraftStatus(d.syncStatus === 'SYNCED' ? 'synced' : d.syncStatus === 'FAILED' ? 'failed' : 'saved');
    }
  }, []);

  const buildDraft = useCallback((id, syncStatusValue = 'LOCAL', imageUrl = null) => ({
    localDraftId: id, userId: user?.id, name: form.name.trim(), category: form.category,
    quantity: form.quantity, unit: form.unit, grade: form.grade, pricePerUnit: form.pricePerUnit,
    location: form.location.trim(), description: form.description.trim(),
    image: imageFile ? { name: imageFile.name, type: imageFile.type, size: imageFile.size, blob: imageFile } : null,
    imageStatus: !imageFile ? 'NONE' : imageUrl ? 'UPLOADED' : 'PENDING_UPLOAD', imageUrl, syncStatus: syncStatusValue, lastError: null,
  }), [form, imageFile, user]);

  const autosaveDraft = useCallback(async () => {
    if (!user?.id) return;
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) return;
    const id = localDraftId || crypto.randomUUID();
    setLocalDraftId(id);
    const existing = await getDraft(id).catch(() => null);
    const keepStatus = existing && ['PENDING', 'SYNCING'].includes(existing.syncStatus) ? existing.syncStatus : 'LOCAL';
    await saveDraft(buildDraft(id, keepStatus));
    setDraftStatus('saved');
  }, [user, form, imageFile, localDraftId, buildDraft]);

  useEffect(() => {
    if (!user?.id) return;
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) return;
    const t = setTimeout(() => autosaveDraft(), 1200);
    return () => clearTimeout(t);
  }, [form, imageFile, user?.id]);

  const handleSaveDraft = async () => {
    if (!user?.id) { setError('You must be logged in to save a draft'); return; }
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) { setError('Enter at least a crop name or quantity before saving a draft'); return; }
    if (!idbSupported()) { setError('This browser does not support offline drafts'); return; }
    setError('');
    await autosaveDraft();
    setDraftStatus(offline ? 'pending' : 'saved');
    if (offline) {
      const id = localDraftId || crypto.randomUUID();
      setLocalDraftId(id);
      await queueDraft(buildDraft(id, 'PENDING'));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { setError('Please select a JPG, PNG, or WebP image'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowImageMenu(false);
  };

  const triggerFileInput = (accept) => {
    if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); }
    setShowImageMenu(false);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Produce name is required'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setError('Valid quantity is required'); return; }
    if (!form.pricePerUnit || Number(form.pricePerUnit) <= 0) { setError('Valid price is required'); return; }
    if (!form.location.trim()) { setError('Location is required'); return; }
    if (!user?.id) { setError('You must be logged in'); return; }
    setLoading(true);
    if (offline) {
      try {
        const id = localDraftId || crypto.randomUUID();
        setLocalDraftId(id);
        await queueDraft(buildDraft(id, 'PENDING'));
        setDraftStatus('pending');
        setSubmitted(true);
      } catch (err) { setError('Could not save listing on this device: ' + (err.message || 'storage unavailable')); }
      finally { setLoading(false); setUploadingImage(false); }
      return;
    }
    try {
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        const uploadResult = await apiUpload('/api/produce/upload-image', imageFile);
        imageUrl = uploadResult.imageUrl;
        setUploadingImage(false);
      }
      await apiPost('/api/produce', {
        farmerId: user.id, name: form.name.trim(), category: form.category, quantity: Number(form.quantity),
        unit: form.unit, pricePerUnit: Number(form.pricePerUnit), description: form.description.trim(),
        location: form.location.trim(), imageUrl, buyerId: selectedBuyer || undefined,
        idempotencyKey: localDraftId || undefined,
      });
      if (localDraftId) await deleteDraft(localDraftId).catch(() => {});
      setSubmitted(true);
    } catch (err) {
      if (err.status === 0 && idbSupported()) {
        const id = localDraftId || crypto.randomUUID();
        setLocalDraftId(id);
        await queueDraft(buildDraft(id, 'PENDING'));
        setDraftStatus('pending');
        setSubmitted(true);
      } else { setError(err.message || 'Failed to create produce listing'); }
    } finally { setLoading(false); setUploadingImage(false); }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
          <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">{draftStatus === 'pending' ? 'Listing Saved on This Device!' : 'Produce Listed Successfully!'}</h2>
              <p className="text-navy-500 mb-6">{draftStatus === 'pending' ? 'You are offline. Your listing is saved and will sync to the marketplace automatically when you reconnect.' : 'Your produce is now visible to verified buyers.'}</p>
              {draftStatus === 'pending' && <p className="text-xs text-blue-600 mb-4 flex items-center justify-center gap-1"><CloudUpload className="w-3.5 h-3.5" /> Pending sync — check Offline Drafts in the sidebar</p>}
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setSubmitted(false); setForm({ name: '', category: 'Vegetables', quantity: '', unit: 'kg', grade: 'A', pricePerUnit: '', location: '', description: '' }); setImageFile(null); setImagePreview(null); setAiAnalysis(null); setShowAiPanel(false); }} className="px-6 py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition">Add Another</button>
                <button onClick={() => navigate('/farmer/produce')} className="px-6 py-3 border-2 border-navy-200 text-navy-700 font-semibold rounded-xl hover:bg-mustard-50 transition">View My Produce</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-sm">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      {offline && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2"><WifiOff className="w-4 h-4 flex-shrink-0" />You're offline. Your listing will be saved and synced when you're back online.</div>}
      {!offline && draftStatus === 'saved' && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2"><Save className="w-4 h-4 flex-shrink-0" />Saved locally on this device</div>}
      {!offline && (draftStatus === 'pending' || syncStatus.pending > 0) && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2"><CloudUpload className="w-4 h-4 flex-shrink-0 animate-pulse" />Pending sync — syncing when connection allows</div>}

      {/* AI Price Advisor Panel */}
      {showAiPanel && aiAnalysis && (
        <div className="mb-6 bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-navy-900 rounded-xl flex items-center justify-center"><Brain className="w-4 h-4 text-mustard-300" /></div>
            <div><h3 className="text-sm font-bold text-navy-900">AI Price Advisor</h3><p className="text-[10px] text-navy-500">Based on market demand, supply & season</p></div>
            {aiLoading && <Loader2 className="w-4 h-4 animate-spin text-navy-400 ml-auto" />}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2 bg-white rounded-xl border border-gray-100 text-center"><p className="text-[10px] text-gray-500">Demand</p><p className={`text-xs font-bold ${aiAnalysis.demandLevel === 'HIGH' ? 'text-emerald-600' : aiAnalysis.demandLevel === 'LOW' ? 'text-rose-600' : 'text-amber-600'}`}>{aiAnalysis.demandLevel} {aiAnalysis.demandLevel === 'HIGH' ? '↑' : aiAnalysis.demandLevel === 'LOW' ? '↓' : '→'}</p></div>
            <div className="p-2 bg-white rounded-xl border border-gray-100 text-center"><p className="text-[10px] text-gray-500">Supply</p><p className={`text-xs font-bold ${aiAnalysis.supplyLevel === 'LOW' ? 'text-emerald-600' : aiAnalysis.supplyLevel === 'HIGH' ? 'text-rose-600' : 'text-amber-600'}`}>{aiAnalysis.supplyLevel}</p></div>
            <div className="p-2 bg-white rounded-xl border border-gray-100 text-center"><p className="text-[10px] text-gray-500">Trend</p><p className={`text-xs font-bold flex items-center justify-center gap-0.5 ${aiAnalysis.trend === 'Increasing' ? 'text-emerald-600' : aiAnalysis.trend === 'Decreasing' ? 'text-rose-600' : 'text-gray-700'}`}>{aiAnalysis.trend === 'Increasing' ? <TrendingUp className="w-3 h-3" /> : aiAnalysis.trend === 'Decreasing' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}{aiAnalysis.trend}</p></div>
          </div>
          <div className="p-3 bg-navy-900 rounded-xl mb-3">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-gray-300 font-medium">AI Recommended Price Range</p><span className="text-[10px] text-mustard-300 font-bold">₹{aiAnalysis.aiSuggestedMinPrice} – ₹{aiAnalysis.aiSuggestedMaxPrice}/kg</span></div>
            <p className="text-lg font-bold text-white">₹{aiAnalysis.aiOptimalPrice}/kg <span className="text-[10px] font-normal text-gray-400">optimal</span></p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-100 mb-3">
            <div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-gray-700">Your Price</p><p className={`text-xs font-bold ${aiAnalysis.aiSuggestedMinPrice && aiAnalysis.aiSuggestedMaxPrice && form.pricePerUnit ? (Number(form.pricePerUnit) >= aiAnalysis.aiSuggestedMinPrice && Number(form.pricePerUnit) <= aiAnalysis.aiSuggestedMaxPrice ? 'text-emerald-600' : Number(form.pricePerUnit) < aiAnalysis.aiSuggestedMinPrice ? 'text-amber-600' : 'text-rose-600') : 'text-gray-500'}`}>{form.pricePerUnit && aiAnalysis.aiSuggestedMinPrice && aiAnalysis.aiSuggestedMaxPrice ? (Number(form.pricePerUnit) >= aiAnalysis.aiSuggestedMinPrice && Number(form.pricePerUnit) <= aiAnalysis.aiSuggestedMaxPrice ? '✓ In AI range' : Number(form.pricePerUnit) < aiAnalysis.aiSuggestedMinPrice ? '⚠ Below AI range' : '⚠ Above AI range') : ''}</p></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { const step = (aiAnalysis?.aiOptimalPrice || 0) * 0.05; const cur = Number(form.pricePerUnit) || aiAnalysis?.aiOptimalPrice || 0; setForm(prev => ({ ...prev, pricePerUnit: Math.max(1, Math.round((cur - step) * 100) / 100).toString() })); }} className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-100 transition font-bold text-lg">−</button>
              <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span><input type="number" name="pricePerUnit" value={form.pricePerUnit} onChange={handleChange} placeholder={aiAnalysis?.aiOptimalPrice?.toString()} min="1" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-navy-100 rounded-xl text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-mustard-400 transition" /></div>
              <button type="button" onClick={() => { const step = (aiAnalysis?.aiOptimalPrice || 0) * 0.05; const cur = Number(form.pricePerUnit) || aiAnalysis?.aiOptimalPrice || 0; setForm(prev => ({ ...prev, pricePerUnit: Math.max(1, Math.round((cur + step) * 100) / 100).toString() })); }} className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition font-bold text-lg">+</button>
            </div>
            <p className={`text-[10px] mt-2 ${aiAnalysis.aiSuggestedMinPrice && aiAnalysis.aiSuggestedMaxPrice && form.pricePerUnit ? (Number(form.pricePerUnit) >= aiAnalysis.aiSuggestedMinPrice && Number(form.pricePerUnit) <= aiAnalysis.aiSuggestedMaxPrice ? 'text-emerald-600' : Number(form.pricePerUnit) < aiAnalysis.aiSuggestedMinPrice ? 'text-amber-600' : 'text-rose-600') : 'text-gray-400'}`}>{aiAnalysis.priceAdvice || 'Adjust the price using +/− buttons'}</p>
          </div>
          {aiAnalysis.reasons && aiAnalysis.reasons.length > 0 && (
            <div className="space-y-1.5">{aiAnalysis.reasons.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2"><Info className={`w-3 h-3 mt-0.5 flex-shrink-0 ${r.impact === 'positive' ? 'text-emerald-500' : r.impact === 'negative' ? 'text-rose-500' : 'text-gray-400'}`} /><p className="text-[10px] text-gray-600 leading-relaxed">{r.text}</p></div>
            ))}</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageSelect} />

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Harvest Photo *</label>
          <p className="text-xs text-gray-400 mb-2">Upload a real photo of your produce — buyers will see this</p>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Produce preview" className="w-full h-56 object-cover rounded-xl" />
              <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/50 text-white text-xs rounded-lg">{imageFile?.name}</div>
            </div>
          ) : (
            <div className="relative">
              <button type="button" onClick={() => setShowImageMenu(!showImageMenu)} className="w-full border-2 border-dashed border-navy-200 rounded-xl p-8 text-center hover:border-mustard-400 transition cursor-pointer">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500"><span className="text-navy-700 font-semibold">Add Photo</span> of your harvest</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5MB</p>
              </button>
              {showImageMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  <button type="button" onClick={() => triggerFileInput('image/*')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition"><Camera className="w-5 h-5 text-blue-500" /><div><p className="font-medium text-gray-900">Camera</p><p className="text-xs text-gray-500">Take a new photo</p></div></button>
                  <button type="button" onClick={() => triggerFileInput('image/*')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100"><Image className="w-5 h-5 text-green-500" /><div><p className="font-medium text-gray-900">Gallery</p><p className="text-xs text-gray-500">Choose from photos</p></div></button>
                  <button type="button" onClick={() => triggerFileInput('image/*,.jpg,.jpeg,.png,.webp')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100"><FileImage className="w-5 h-5 text-purple-500" /><div><p className="font-medium text-gray-900">Files</p><p className="text-xs text-gray-500">Browse image files</p></div></button>
                  <button type="button" onClick={() => setShowImageMenu(false)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100 text-red-600"><X className="w-5 h-5" /><span className="font-medium">Cancel</span></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Produce Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Produce Name *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g., Tomato, Onion, Mango, Turmeric" />
          <p className="text-[10px] text-navy-500 mt-1 flex items-center gap-1"><Brain className="w-3 h-3" />{aiLoading ? 'Analyzing market data...' : form.name.length >= 3 ? 'AI is analyzing market demand for this crop' : 'Type 3+ characters to get AI price suggestion'}</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select name="category" value={form.category} onChange={handleChange}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label><div className="relative"><Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="1000" min="1" className="pl-11" /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label><select name="unit" value={form.unit} onChange={handleChange}>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Price (₹ per {form.unit}) *</label>
          <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span><input type="number" name="pricePerUnit" value={form.pricePerUnit} onChange={handleChange} placeholder={aiAnalysis?.aiOptimalPrice ? `AI suggests ${aiAnalysis.aiOptimalPrice}` : 'e.g., 25'} min="1" step="0.01" className="pl-9" /></div>
          {aiAnalysis?.aiSuggestedMinPrice != null && aiAnalysis?.aiSuggestedMaxPrice != null && <p className="text-[10px] mt-1 text-gray-500">AI range: ₹{aiAnalysis.aiSuggestedMinPrice} – ₹{aiAnalysis.aiSuggestedMaxPrice}/kg</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
          <div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" name="location" value={form.location} onChange={handleLocationChange} placeholder="Nashik, Maharashtra" className="pl-11" /></div>
        </div>

        {/* Buyer selector — optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notify a specific buyer <span className="text-gray-400">(optional)</span></label>
          <InputWithDropdown
            value={selectedBuyer}
            onChange={setSelectedBuyer}
            onFocus={() => !loadingBuyers && setBuyerDropdownOpen(true)}
            onBlur={() => setTimeout(() => setBuyerDropdownOpen(false), 150)}
            placeholder="Search buyers…"
            options={buyers.map(b => ({ value: String(b.id), label: `${b.name} — ${b.email || ''}` }))}
            loading={loadingBuyers}
            maxHeight={220}
            emptyLabel={loadingBuyers ? 'Loading buyers…' : 'No buyers found'}
          />
          <p className="text-[10px] text-gray-400 mt-1">Leave empty to make your produce visible to all buyers.</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows="3" placeholder="Describe your produce quality, growing conditions, organic certification, etc." className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition resize-none" />
        </div>

        {/* Draft Banner */}
        {!offline && draftStatus === 'saved' && (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
            <span className="text-emerald-700 flex items-center gap-2"><Save className="w-4 h-4" />Draft saved locally</span>
            <button type="button" onClick={handleSaveDraft} className="text-emerald-700 font-semibold hover:underline">Save Draft</button>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={handleSaveDraft} disabled={loading} className="px-5 py-3.5 bg-white border-2 border-navy-200 text-navy-800 font-semibold rounded-xl hover:bg-navy-50 transition disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />Save Draft</button>
          <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{loading ? (<><Loader2 className="w-5 h-5 animate-spin" />{uploadingImage ? 'Uploading image...' : 'Creating listing...'}</>) : offline ? 'Save & Queue for Sync' : 'List Produce'}</button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────
   Tab 2 — AI Price Advisor
────────────────────────────────────────── */
function PriceAdvisorSection() {
  const { isGuestModeActive } = useAuth();
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (isGuestModeActive) return;
    apiGet('/api/price-advisor/all').then(data => { setCrops(data || []); if (data?.length > 0) setSelected(data[0]); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isGuestModeActive || !selected) return;
    setAnalyzing(true);
    const params = location ? `?location=${encodeURIComponent(location)}` : '';
    apiGet(`/api/price-advisor/${encodeURIComponent(selected.name)}${params}`).then(setAnalysis).catch(() => {}).finally(() => setAnalyzing(false));
  }, [selected, location]);

  const trendIcon = (t) => t === 'Increasing' ? <TrendingUp className="w-4 h-4" /> : t === 'Decreasing' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;
  const trendColor = (t) => t === 'Increasing' ? 'text-emerald-600' : t === 'Decreasing' ? 'text-rose-600' : 'text-gray-700';

  if (isGuestModeActive) return null;

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter your location for regional pricing (e.g., Nashik, Pune)" className="flex-1 px-4 py-2.5 bg-white border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition" />
        <button onClick={() => setSelected({ ...selected })} className="px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition flex items-center gap-2"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-4" /><p className="text-sm text-gray-500">Loading market data...</p></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-navy-700 mb-3">Crops ({crops.length})</h3>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {crops.map(crop => (
                  <button key={crop.name} onClick={() => setSelected(crop)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${selected?.name === crop.name ? 'bg-navy-900 text-white' : 'hover:bg-gray-50 text-navy-700'}`}>
                    <div><p className="text-sm font-semibold">{crop.name}</p><p className={`text-[10px] ${selected?.name === crop.name ? 'text-gray-300' : 'text-gray-500'}`}>{crop.category}</p></div>
                    <div className="text-right"><p className={`text-sm font-bold ${selected?.name === crop.name ? 'text-white' : 'text-navy-900'}`}>₹{crop.aiOptimalPrice}</p><p className={`text-[10px] flex items-center gap-0.5 justify-end ${selected?.name === crop.name ? 'text-gray-300' : trendColor(crop.trend)}`}>{trendIcon(crop.trend)} {crop.trend}</p></div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selected && (() => {
              const [est, setEst] = useState(null); const [estLoading, setEstLoading] = useState(false);
              useEffect(() => { if (!selected) return; setEstLoading(true); const p = new URLSearchParams({ crop: selected.name }); if (location) p.set('state', location); apiGet(`/api/price-advisor/estimate?${p}`).then(d => setEst(d)).catch(() => setEst(null)).finally(() => setEstLoading(false)); }, [selected, location]);
              if (estLoading) return <div className="bg-white rounded-2xl border border-navy-100 p-5 flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-navy-500" /><p className="text-sm text-gray-500">Checking historical dataset & live mandi prices…</p></div>;
              if (!est) return null;
              const srcLabel = est.source === 'DATASET_MODEL' ? { text: 'Based on historical crop-price dataset', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Database } : est.source === 'LIVE_MANDI' ? { text: 'Live government mandi prices', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck } : { text: 'No verified data available', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Info };
              const Icon = srcLabel.icon;
              return (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3"><div><h3 className="text-sm font-bold text-navy-900">Data-Backed Estimate</h3><p className="text-[11px] text-navy-500 mt-0.5">{est.explanation}</p></div><span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border shrink-0 inline-flex items-center gap-1 ${srcLabel.cls}`}><Icon className="w-3 h-3" />{srcLabel.text}</span></div>
                  {est.source === 'UNAVAILABLE' ? <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Mitti2Market does not display fabricated prices for this crop/location.</p> : (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-gray-50 rounded-xl"><p className="text-lg font-bold text-navy-900">₹{est.medianPrice}</p><p className="text-[10px] text-gray-500">Median ₹/{est.unit || 'kg'}</p></div>
                      <div className="p-3 bg-gray-50 rounded-xl"><p className="text-lg font-bold text-navy-900">₹{est.rangeLow}–₹{est.rangeHigh}</p><p className="text-[10px] text-gray-500">Expected range</p></div>
                      <div className="p-3 bg-gray-50 rounded-xl"><p className="text-lg font-bold text-navy-900">{est.samples}</p><p className="text-[10px] text-gray-500">Data points</p></div>
                    </div>
                  )}
                </div>
              );
            })()}

            {analyzing ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-navy-100"><Loader2 className="w-8 h-8 animate-spin text-navy-900 mx-auto mb-3" /><p className="text-sm text-gray-500">Analyzing market data for {selected?.name}...</p></div>
            ) : analysis ? (
              <>
                <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-navy-900">{analysis.cropName}</h2><p className="text-sm text-navy-500">{analysis.category} • Market Analysis</p></div><span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${analysis.trend === 'Increasing' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : analysis.trend === 'Decreasing' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>{trendIcon(analysis.trend)} {analysis.trend}</span></div>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="p-3 bg-gray-50 rounded-xl"><p className="text-[10px] text-gray-500 mb-1">Market Range</p><p className="text-lg font-bold text-gray-900">₹{analysis.marketMinPrice}–{analysis.marketMaxPrice}</p></div>
                    <div className="p-3 bg-navy-900 rounded-xl"><p className="text-[10px] text-gray-300 mb-1">AI Optimal</p><p className="text-lg font-bold text-white">₹{analysis.aiOptimalPrice}</p></div>
                    <div className="p-3 bg-mustard-50 rounded-xl border border-mustard-200"><p className="text-[10px] text-navy-600 mb-1">AI Range</p><p className="text-lg font-bold text-navy-900">₹{analysis.aiSuggestedMinPrice}–{analysis.aiSuggestedMaxPrice}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-[10px] text-gray-500 mb-1">Demand</p><p className={`text-sm font-bold ${analysis.demandLevel === 'HIGH' ? 'text-emerald-600' : analysis.demandLevel === 'LOW' ? 'text-rose-600' : 'text-amber-600'}`}>{analysis.demandLevel} {analysis.demandLevel === 'HIGH' ? '↑' : analysis.demandLevel === 'LOW' ? '↓' : '→'}</p></div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-[10px] text-gray-500 mb-1">Supply</p><p className={`text-sm font-bold ${analysis.supplyLevel === 'LOW' ? 'text-emerald-600' : analysis.supplyLevel === 'HIGH' ? 'text-rose-600' : 'text-amber-600'}`}>{analysis.supplyLevel}</p></div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center"><p className="text-[10px] text-gray-500 mb-1">Regional</p><p className="text-sm font-bold text-navy-700">₹{analysis.regionalPrice}</p><p className="text-[9px] text-gray-400">{analysis.matchedRegion}</p></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-6">
                  <div className="flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-navy-700" /><h3 className="text-sm font-bold text-navy-800">Market Intelligence</h3></div>
                  <div className="space-y-3">{analysis.reasons?.map((r, i) => (
                    <div key={i} className="flex items-start gap-3"><div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.impact === 'positive' ? 'bg-emerald-500' : r.impact === 'negative' ? 'bg-rose-500' : 'bg-gray-400'}`} /><p className="text-sm text-gray-700 leading-relaxed">{r.text}</p></div>
                  ))}</div>
                </div>
                {analysis.regionalPrices && Object.keys(analysis.regionalPrices).length > 0 && (
                  <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-navy-700 mb-3">Regional Price Comparison</h4>
                    <div className="space-y-2">{Object.entries(analysis.regionalPrices).map(([city, price]) => (
                      <div key={city} className="flex items-center justify-between"><span className="text-sm text-gray-600">{city}</span><div className="flex items-center gap-2"><div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${(price / (analysis.marketMaxPrice || 1)) * 100}%` }} /></div><span className="text-sm font-semibold text-gray-700 w-12 text-right">₹{price}</span></div></div>
                    ))}</div>
                  </div>
                )}
                <div className="bg-navy-900 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-mustard-300" /><h4 className="text-sm font-semibold">AI Recommendation</h4></div>
                  <p className="text-sm text-gray-300 leading-relaxed">Demand for <strong className="text-white">{analysis.cropName.toLowerCase()}</strong> is currently <strong className="text-white">{analysis.demandLevel.toLowerCase()}</strong> with an <strong className="text-white">{analysis.trend.toLowerCase()}</strong> trend.{analysis.matchedRegion !== 'National Average' && <> In <strong className="text-white">{analysis.matchedRegion}</strong>, the regional price is <strong className="text-white">₹{analysis.regionalPrice}/kg</strong>.</>} {' '}List at <strong className="text-mustard-300">₹{analysis.aiSuggestedMinPrice}–₹{analysis.aiSuggestedMaxPrice}/kg</strong> for maximum returns.</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-navy-100"><Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Select a crop to see market analysis</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Tab 3 — Buyer Requests
────────────────────────────────────────── */
function BuyerRequestsSection({ user }) {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchInterests = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await apiGet(`/api/interests/farmer/${user.id}`);
      setInterests(data || []);
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } }); return; }
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchInterests(); }, [user]);

  const handleAccept = async (interestId) => {
    setActionLoading(interestId);
    try {
      const result = await apiPut(`/api/interests/${interestId}/accept`, {});
      setInterests(prev => prev.map(i => i.id === interestId ? { ...i, status: 'ACCEPTED', conversationId: result.conversationId } : i));
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } }); return; }
      setError(err.message || 'Failed to accept interest');
    } finally { setActionLoading(null); }
  };

  const handleReject = async (interestId) => {
    setActionLoading(interestId);
    try {
      await apiPut(`/api/interests/${interestId}/reject`, {});
      setInterests(prev => prev.map(i => i.id === interestId ? { ...i, status: 'REJECTED' } : i));
    } catch (err) {
      if (err.message?.includes('Session expired')) { navigate('/login', { state: { from: { pathname: '/farmer/buyer-requests' } } }); return; }
      setError(err.message || 'Failed to reject interest');
    } finally { setActionLoading(null); }
  };

  const handleChat = (conversationId, otherUserId) => { navigate(`/farmer/chat/${conversationId}/${otherUserId}`); };

  const filtered = interests.filter(i => filter === 'all' ? true : i.status === filter.toUpperCase());
  const pendingCount = interests.filter(i => i.status === 'PENDING').length;
  const acceptedCount = interests.filter(i => i.status === 'ACCEPTED').length;

  const statusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'ACCEPTED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border border-red-200';
      case 'DEAL_AGREED': return 'bg-blue-50 text-blue-700 border border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  const statusLabel = (s) => s.replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-navy-900">Buyer Requests</h2><p className="text-navy-500 mt-1">{pendingCount} pending · {acceptedCount} accepted · {interests.length} total</p></div>
        <button onClick={fetchInterests} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-700 text-sm font-semibold rounded-xl border border-navy-200 hover:bg-navy-50 transition"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[{ key: 'all', label: `All (${interests.length})` }, { key: 'pending', label: `Pending (${pendingCount})` }, { key: 'accepted', label: `Accepted (${acceptedCount})` }, { key: 'rejected', label: `Rejected` }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${filter === f.key ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 border border-navy-200 hover:border-mustard-300'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-sm text-gray-500">Loading buyer requests...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-navy-100"><ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-lg font-semibold text-gray-700 mb-2">{filter === 'all' ? 'No buyer requests yet' : `No ${filter} requests`}</p><p className="text-sm text-gray-500">{filter === 'all' ? 'When buyers show interest in your produce, they will appear here.' : 'Try a different filter.'}</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(interest => (
            <div key={interest.id} className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-navy-100 rounded-xl flex items-center justify-center text-xl shrink-0">🏪</div>
                  <div><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-navy-900">{interest.buyerName}</h3><ShieldCheck className="w-4 h-4 text-primary-500" /></div><p className="text-xs text-navy-500 mt-0.5">{interest.buyerEmail}</p></div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(interest.status)}`}>{statusLabel(interest.status)}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-gray-400" /><span className="text-sm font-semibold text-navy-900">{interest.produceName}</span>{interest.produceCategory && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-navy-50 text-navy-700">{interest.produceCategory}</span>}</div>
                <div className="flex items-center gap-4 text-xs text-navy-500"><span>{interest.produceQuantity} {interest.produceUnit} available</span><span>₹{interest.producePrice}/{interest.produceUnit}</span>{interest.produceLocation && <span>📍 {interest.produceLocation}</span>}</div>
              </div>
              <div className="mb-3">
                {interest.offeredPrice && <div className="flex items-center gap-2 mb-1"><span className="text-xs text-navy-500">Offered price:</span><span className="text-sm font-bold text-navy-900">₹{interest.offeredPrice}/{interest.produceUnit}</span></div>}
                {interest.offeredQuantity && <div className="flex items-center gap-2 mb-1"><span className="text-xs text-navy-500">Quantity wanted:</span><span className="text-sm font-semibold text-navy-700">{interest.offeredQuantity} {interest.produceUnit}</span></div>}
                {interest.message && <div className="p-2 bg-mustard-50 rounded-lg border border-mustard-200 mt-2"><p className="text-xs text-navy-700 italic">"{interest.message}"</p></div>}
              </div>
              <div className="flex gap-2 pt-3 border-t border-navy-50">
                {interest.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleAccept(interest.id)} disabled={actionLoading === interest.id} className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5">{actionLoading === interest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {actionLoading === interest.id ? '...' : 'Accept'}</button>
                    <button onClick={() => handleReject(interest.id)} disabled={actionLoading === interest.id} className="py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition disabled:opacity-50 border border-red-200 flex items-center justify-center gap-1.5">{actionLoading === interest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} {actionLoading === interest.id ? '...' : 'Reject'}</button>
                  </>
                )}
                {interest.status === 'ACCEPTED' && interest.conversationId && (
                  <button onClick={() => handleChat(interest.conversationId, interest.buyerId)} className="flex-1 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" />Chat</button>
                )}
                {interest.status === 'DEAL_AGREED' && (
                  <button onClick={() => navigate('/farmer/deals')} className="flex-1 py-2.5 bg-mustard-50 text-navy-700 text-sm font-semibold rounded-xl hover:bg-mustard-100 transition border border-mustard-200 flex items-center justify-center gap-1.5"><ClipboardList className="w-4 h-4" />View Deal</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Tab 4 — AI Deal Advisor
────────────────────────────────────────── */
function DealAdvisorSection({ user }) {
  const navigate = useNavigate();
  const [produce, setProduce] = useState([]);
  const [selectedProduce, setSelectedProduce] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('net');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet(`/api/produce/farmer/${user.id}`);
        const available = (data || []).filter(p => p.status === 'AVAILABLE' || p.status === 'LOW_STOCK');
        setProduce(available);
        if (available.length > 0) setSelectedProduce(available[0]);
      } catch (err) {
        if (err.message?.includes('Session expired')) { navigate('/login'); } else { setError(err.message || 'Failed to load produce'); }
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedProduce) { setDeals([]); return; }
    const load = async () => {
      setLoadingDeals(true); setError('');
      try {
        const data = await apiGet(`/api/deal-intelligence/produce/${selectedProduce.id}`);
        setDeals(data || []);
      } catch (err) {
        if (err.message?.includes('Session expired')) { navigate('/login'); } else { setError(err.message || 'Failed to analyze deals'); }
      } finally { setLoadingDeals(false); }
    };
    load();
  }, [selectedProduce]);

  const sortedDeals = [...deals].sort((a, b) => {
    switch (sortBy) {
      case 'price': return b.quotedPrice - a.quotedPrice;
      case 'distance': return a.distanceKm - b.distanceKm;
      case 'rating': return (b.buyerRating || 0) - (a.buyerRating || 0);
      case 'net': default: return b.netPerUnit - a.netPerUnit;
    }
  });

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <div className="bg-navy-900 rounded-2xl p-4 text-white">
        <p className="text-sm font-bold mb-1">💡 Highest offer ≠ Highest earning</p>
        <p className="text-xs text-navy-200">A buyer offering more per kg may be farther away — after estimated logistics costs, a closer buyer can earn you more.</p>
      </div>

      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <label className="block text-xs font-semibold text-navy-700 mb-2">Select your produce listing</label>
        {loading ? (
          <div className="text-center py-4"><div className="animate-spin w-6 h-6 border-4 border-navy-900 border-t-transparent rounded-full mx-auto" /></div>
        ) : produce.length === 0 ? (
          <p className="text-sm text-gray-500">No active produce listings. <button onClick={() => navigate('/farmer/add-produce')} className="text-navy-700 font-semibold underline">Add produce</button> first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {produce.map(p => (
              <button key={p.id} onClick={() => setSelectedProduce(p)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${selectedProduce?.id === p.id ? 'bg-mustard-50 border-mustard-400 text-navy-900 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-mustard-300'}`}>{p.name} · {p.quantity} {p.unit} · {formatINR(p.pricePerUnit)}/{p.unit}</button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {deals.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold text-navy-700">Sort by:</span>
          {[{ key: 'net', label: 'Best Net Realization' }, { key: 'price', label: 'Highest Price' }, { key: 'distance', label: 'Nearest' }, { key: 'rating', label: 'Buyer Rating' }].map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${sortBy === opt.key ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'}`}>{opt.label}</button>
          ))}
        </div>
      )}

      {loadingDeals ? (
        <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" /><p className="text-sm text-gray-500">Analyzing buyer offers...</p></div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-navy-100"><Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-lg font-semibold text-gray-700 mb-2">No buyer offers yet</p><p className="text-sm text-gray-500">When buyers express interest in this produce, their offers will be ranked here by estimated net realization.</p></div>
      ) : (
        <div className="space-y-4">
          {sortedDeals.map((deal, idx) => (
            <div key={deal.interestId} className={`bg-white rounded-2xl border p-5 transition ${deal.recommendationRank === 1 ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md' : 'border-navy-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${deal.recommendationRank === 1 ? 'bg-emerald-50' : 'bg-gray-50'}`}>{MEDALS[idx] || '🏅'}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-navy-900">{deal.buyerName}</p>
                      {deal.buyerVerified ? <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full"><CheckCircle2 className="w-3 h-3" />VERIFIED</span> : <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full"><X className="w-3 h-3" />UNVERIFIED</span>}
                    </div>
                    {deal.buyerOrganization && <p className="text-xs text-gray-500">{deal.buyerOrganization}</p>}
                    {deal.buyerRating > 0 && <p className="text-xs text-amber-600">★ {deal.buyerRating.toFixed(1)} / 5</p>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${deal.recommendationRank === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}>{deal.recommendationRank === 1 ? '⭐ RECOMMENDED' : `Rank #${deal.recommendationRank}`}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-500 font-semibold uppercase">Quoted Price</p><p className="text-lg font-bold text-navy-900">{formatINR(deal.quotedPrice)}<span className="text-xs font-normal text-gray-500">/{deal.unit}</span></p></div>
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" />Distance</p><p className="text-lg font-bold text-navy-900">~{deal.distanceKm}<span className="text-xs font-normal text-gray-500"> km</span></p></div>
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1"><Truck className="w-3 h-3" />Est. Logistics</p><p className="text-lg font-bold text-navy-900">{formatINR(deal.logisticsCostPerUnit)}<span className="text-xs font-normal text-gray-500">/{deal.unit}</span></p></div>
                <div className={`rounded-xl p-3 ${deal.recommendationRank === 1 ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-navy-50'}`}><p className="text-[10px] font-semibold uppercase flex items-center gap-1 text-gray-500"><Wallet className="w-3 h-3" />Est. Net / {deal.unit}</p><p className={`text-lg font-bold ${deal.recommendationRank === 1 ? 'text-emerald-700' : 'text-navy-900'}`}>{formatINR(deal.netPerUnit)}</p></div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-600">
                <span>Gross value: <b>{formatINR(deal.grossValue)}</b></span>
                <span>Logistics: <b>{formatINR(deal.logisticsCost)}</b></span>
                <span>Other costs: <b>{formatINR(deal.otherCosts)}</b></span>
                <span>Est. net: <b className="text-emerald-700">{formatINR(deal.netValue)}</b></span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${deal.dealScore >= 80 ? 'bg-emerald-500' : deal.dealScore >= 60 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${deal.dealScore}%` }} /></div>
                  <span className="text-xs font-bold text-navy-900">{deal.dealScore}/100</span>
                  <span className="text-[10px] text-gray-400">confidence {deal.confidence}%</span>
                </div>
                <button onClick={() => setExpandedCard(expandedCard === deal.interestId ? null : deal.interestId)} className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 font-semibold">{expandedCard === deal.interestId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}{expandedCard === deal.interestId ? 'Hide analysis' : 'Why this ranking?'}</button>
              </div>

              {expandedCard === deal.interestId && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
                  <div><p className="text-xs font-bold text-navy-900 mb-2 flex items-center gap-1"><Info className="w-3.5 h-3.5" />Why ranked #{deal.recommendationRank}</p><ul className="space-y-1.5">{deal.reasons?.map((r, i) => <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span>{r}</li>)}</ul></div>
                  <div><p className="text-xs font-bold text-navy-900 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Warnings</p>{deal.warnings?.length > 0 ? <ul className="space-y-1.5">{deal.warnings.map((w, i) => <li key={i} className="text-xs text-amber-700 flex gap-1.5"><span className="mt-0.5">⚠️</span>{w}</li>)}</ul> : <p className="text-xs text-gray-400">No warnings — this offer looks reliable.</p>}</div>
                </div>
              )}

              {deal.recommendationRank === 1 && deals.length > 1 && (
                <div className="mt-4 bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-start gap-2"><TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-emerald-800"><b>Why recommended:</b> Although another buyer may quote a higher price, this offer gives the best <b>estimated net realization</b> after logistics and other costs.</p></div>
              )}
            </div>
          ))}
          <div className="text-[10px] text-gray-400 text-center py-2">All figures are <b>estimates</b> based on distance and typical costs. Verify logistics costs before committing. AI recommends — you decide.</div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Page
────────────────────────────────────────── */
export default function FarmerHub() {
  const { user, isGuestModeActive, openAuthRequired } = useAuth();
  const [activeTab, setActiveTab] = useState('add');
  const navigate = useNavigate();

  if (isGuestModeActive) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center"><Trophy className="w-5 h-5 text-white" /></div>
              <div><h1 className="text-2xl font-bold text-navy-900">Farmer Hub</h1><p className="text-navy-500 text-sm">Add produce, get AI pricing, manage buyer requests, and compare deals — all in one place.</p></div>
            </div>
            <div className="bg-white rounded-2xl border border-navy-100 p-8 text-center">
              <span className="text-5xl block mb-4">🌾</span>
              <h2 className="text-xl font-bold text-navy-900 mb-2">Sign in to access your hub</h2>
              <p className="text-gray-500 mb-6">List produce, compare deals, and manage buyer requests from one dashboard.</p>
              <button onClick={openAuthRequired} className="px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">Sign In</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center"><Trophy className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Farmer Hub</h1>
              <p className="text-navy-500 text-sm">Add produce, get AI pricing, manage buyer requests, and compare deals — all in one place.</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition ${activeTab === tab.key ? 'bg-mustard-50 text-navy-900 border-mustard-300 shadow-sm' : 'bg-white text-navy-600 border-gray-200 hover:border-mustard-300 hover:text-navy-900'}`}>
                <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-navy-900' : 'text-navy-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'add' && <AddProduceSection user={user} />}
          {activeTab === 'price' && <PriceAdvisorSection />}
          {activeTab === 'requests' && <BuyerRequestsSection user={user} />}
          {activeTab === 'deals' && <DealAdvisorSection user={user} />}
        </div>
      </main>
    </div>
  );
}
