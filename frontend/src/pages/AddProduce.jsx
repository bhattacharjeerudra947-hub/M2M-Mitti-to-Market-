import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { MapPin, Package, X, Camera, Image, FileImage, Loader2, Brain, TrendingUp, TrendingDown, Minus, Info, WifiOff, Save, CloudUpload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiUpload, apiGet } from '../api';
import { saveDraft, queueDraft, deleteDraft, getDraft, useSyncStatus } from '../utils/syncQueue';
import { idbSupported } from '../utils/idb';

export default function AddProduce() {
  const navigate = useNavigate();
  const { user, isGuestModeActive, openAuthRequired } = useAuth();

  // Gate: guests cannot add produce
  if (isGuestModeActive) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-8 lg:pl-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-4">📦</span>
            <p className="text-lg font-semibold text-gray-700 mb-2">Sign in to add produce</p>
            <p className="text-sm text-gray-500 mb-4">You need an account to list and sell your produce.</p>
            <button onClick={openAuthRequired} className="px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">Sign In</button>
          </div>
        </main>
      </div>
    );
  }
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '',
    unit: 'kg',
    grade: 'A',
    pricePerUnit: '',
    location: '',
    readyDate: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageMenu, setShowImageMenu] = useState(false);

  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Offline-first draft state
  const [localDraftId, setLocalDraftId] = useState(null);
  const [draftStatus, setDraftStatus] = useState(''); // '' | saved | pending | synced | failed | needsLogin
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const syncStatus = useSyncStatus();

  // AI Price Advisor state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const categories = ['Vegetables', 'Fruits', 'Grains', 'Spices', 'Dairy', 'Pulses', 'Oilseeds', 'Other'];
  const units = ['kg', 'quintal', 'tonne', 'dozen', 'piece', 'bunch', 'pack'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // When produce name changes, fetch AI price suggestion
    if (name === 'name' && value.trim().length >= 3) {
      fetchAiSuggestion(value.trim(), form.location);
    }
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, location: value }));

    // Re-fetch AI suggestion with new location
    if (form.name.trim().length >= 3 && value.trim().length >= 3) {
      fetchAiSuggestion(form.name.trim(), value.trim());
    }
  };

  const fetchAiSuggestion = useCallback(async (cropName, location) => {
    setAiLoading(true);
    try {
      const data = await apiGet(`/api/price-advisor/${encodeURIComponent(cropName)}?location=${encodeURIComponent(location || '')}&desiredPrice=${form.pricePerUnit || 0}`);
      setAiAnalysis(data);
      setShowAiPanel(true);

      // Auto-set price to AI optimal if not already set
      if (!form.pricePerUnit && data.aiOptimalPrice) {
        setForm(prev => ({ ...prev, pricePerUnit: data.aiOptimalPrice.toString() }));
      }
    } catch {
      setAiAnalysis(null);
      setShowAiPanel(false);
    } finally {
      setAiLoading(false);
    }
  }, [form.pricePerUnit]);

  const handlePriceAdjust = (direction) => {
    if (!aiAnalysis) return;
    const currentPrice = Number(form.pricePerUnit) || aiAnalysis.aiOptimalPrice;
    const step = aiAnalysis.aiOptimalPrice * 0.05; // 5% steps
    const newPrice = direction === 'up' ? currentPrice + step : currentPrice - step;
    setForm(prev => ({ ...prev, pricePerUnit: Math.max(1, Math.round(newPrice * 100) / 100).toString() }));
  };

  const getPriceAdviceColor = () => {
    if (!aiAnalysis || !form.pricePerUnit) return 'text-gray-500';
    const price = Number(form.pricePerUnit);
    if (price >= aiAnalysis.aiSuggestedMinPrice && price <= aiAnalysis.aiSuggestedMaxPrice) return 'text-emerald-600';
    if (price < aiAnalysis.aiSuggestedMinPrice) return 'text-amber-600';
    return 'text-rose-600';
  };

  // ──── Offline-first: autosave draft + offline detection ────

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Restore a draft when navigated from the Offline Drafts page (Edit)
  useEffect(() => {
    const d = location.state?.draft;
    if (d) {
      setForm({
        name: d.name || '',
        category: d.category || 'Vegetables',
        quantity: d.quantity || '',
        unit: d.unit || 'kg',
        grade: d.grade || 'A',
        pricePerUnit: d.pricePerUnit || '',
        location: d.location || '',
        description: d.description || '',
      });
      setLocalDraftId(d.localDraftId);
      setDraftStatus(d.syncStatus === 'SYNCED' ? 'synced' : d.syncStatus === 'FAILED' ? 'failed' : 'saved');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraft = useCallback((id, syncStatusValue = 'LOCAL', imageUrl = null) => ({
    localDraftId: id,
    userId: user?.id,
    name: form.name.trim(),
    category: form.category,
    quantity: form.quantity,
    unit: form.unit,
    grade: form.grade,
    pricePerUnit: form.pricePerUnit,
    location: form.location.trim(),
    description: form.description.trim(),
    image: imageFile ? { name: imageFile.name, type: imageFile.type, size: imageFile.size, blob: imageFile } : null,
    imageStatus: !imageFile ? 'NONE' : imageUrl ? 'UPLOADED' : 'PENDING_UPLOAD',
    imageUrl,
    syncStatus: syncStatusValue,
    lastError: null,
  }), [form, imageFile, user]);

  const autosaveDraft = useCallback(async () => {
    if (!user?.id) return;
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) return;
    const id = localDraftId || crypto.randomUUID();
    setLocalDraftId(id);
    const existing = await getDraft(id).catch(() => null);
    // Preserve PENDING/SYNCING so a queued draft stays queued while being edited
    const keepStatus = existing && ['PENDING', 'SYNCING'].includes(existing.syncStatus) ? existing.syncStatus : 'LOCAL';
    await saveDraft(buildDraft(id, keepStatus));
    setDraftStatus('saved');
  }, [user, form, imageFile, localDraftId, buildDraft]);

  // Debounced autosave while typing
  useEffect(() => {
    if (!user?.id) return;
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) return;
    const t = setTimeout(() => autosaveDraft(), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, imageFile, user?.id]);

  const handleSaveDraft = async () => {
    if (!user?.id) { setError('You must be logged in to save a draft'); return; }
    if (!form.name.trim() && !form.quantity && !form.pricePerUnit && !form.location.trim()) {
      setError('Enter at least a crop name or quantity before saving a draft');
      return;
    }
    if (!idbSupported()) { setError('This browser does not support offline drafts'); return; }
    setError('');
    await autosaveDraft();
    setDraftStatus(offline ? 'pending' : 'saved');
    if (offline) {
      // Queue it so it syncs the moment connection returns
      const id = localDraftId || crypto.randomUUID();
      setLocalDraftId(id);
      await queueDraft(buildDraft(id, 'PENDING'));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowImageMenu(false);
  };

  const triggerFileInput = (accept) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
    setShowImageMenu(false);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Produce name is required'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setError('Valid quantity is required'); return; }
    if (!form.pricePerUnit || Number(form.pricePerUnit) <= 0) { setError('Valid price is required'); return; }
    if (!form.location.trim()) { setError('Location is required'); return; }
    if (!user?.id) { setError('You must be logged in'); return; }

    setLoading(true);

    // OFFLINE → save locally, queue for auto-sync. Never lose the farmer's data.
    if (offline) {
      try {
        const id = localDraftId || crypto.randomUUID();
        setLocalDraftId(id);
        await queueDraft(buildDraft(id, 'PENDING'));
        setDraftStatus('pending');
        setSubmitted(true);
      } catch (err) {
        setError('Could not save listing on this device: ' + (err.message || 'storage unavailable'));
      } finally {
        setLoading(false);
        setUploadingImage(false);
      }
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
        farmerId: user.id,
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        pricePerUnit: Number(form.pricePerUnit),
        readyDate: form.readyDate || null,
        description: form.description.trim(),
        location: form.location.trim(),
        imageUrl: imageUrl,
        idempotencyKey: localDraftId || undefined,
      });

      // Clean up the local draft — the listing now lives on the server
      if (localDraftId) await deleteDraft(localDraftId).catch(() => {});
      setSubmitted(true);
    } catch (err) {
      // Network failure (offline mid-submit, request lost) → queue locally instead of losing data
      if (err.status === 0 && idbSupported()) {
        const id = localDraftId || crypto.randomUUID();
        setLocalDraftId(id);
        await queueDraft(buildDraft(id, 'PENDING'));
        setDraftStatus('pending');
        setSubmitted(true);
      } else {
        setError(err.message || 'Failed to create produce listing');
      }
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen bg-mustard-50/30">
        <Sidebar role="farmer" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
          <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">
                {draftStatus === 'pending' ? 'Listing Saved on This Device!' : 'Produce Listed Successfully!'}
              </h2>
              <p className="text-navy-500 mb-6">
                {draftStatus === 'pending'
                  ? 'You are offline. Your listing is saved and will sync to the marketplace automatically when you reconnect.'
                  : 'Your produce is now visible to verified buyers.'}
              </p>
              {draftStatus === 'pending' && (
                <p className="text-xs text-blue-600 mb-4 flex items-center justify-center gap-1">
                  <CloudUpload className="w-3.5 h-3.5" /> Pending sync — check Offline Drafts in the sidebar
                </p>
              )}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => navigate('/farmer/matches')}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-primary-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-primary-700 transition shadow-md flex items-center gap-1.5"
                >
                  <span>🎉</span> View Matches
                </button>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', category: 'Vegetables', quantity: '', unit: 'kg', grade: 'A', pricePerUnit: '', location: '', readyDate: '', description: '' }); setImageFile(null); setImagePreview(null); setAiAnalysis(null); setShowAiPanel(false); }}
                  className="px-6 py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition"
                >
                  Add Another
                </button>
                <button
                  onClick={() => navigate('/farmer/produce')}
                  className="px-6 py-3 border-2 border-navy-200 text-navy-700 font-semibold rounded-xl hover:bg-mustard-50 transition"
                >
                  View My Produce
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role="farmer" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-navy-900 mb-1">Add Produce</h1>
          <p className="text-navy-500 mb-8">List your harvest — AI will suggest the best price</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {/* ═══ Offline / Draft Status Banner ═══ */}
          {offline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              You're offline. Your listing will be saved and synced when you're back online.
            </div>
          )}
          {!offline && draftStatus === 'saved' && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <Save className="w-4 h-4 flex-shrink-0" /> Saved locally on this device
            </div>
          )}
          {!offline && (draftStatus === 'pending' || syncStatus.pending > 0) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 flex-shrink-0 animate-pulse" /> Pending sync — syncing when connection allows
            </div>
          )}
          {draftStatus === 'failed' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              Sync failed for this draft — open Offline Drafts to retry. Your data is safe on this device.
            </div>
          )}

          {/* ═══ AI Price Advisor Panel ═══ */}
          {showAiPanel && aiAnalysis && (
            <div className="mb-6 bg-gradient-to-br from-mustard-50 to-white rounded-2xl border border-mustard-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-navy-900 rounded-xl flex items-center justify-center">
                  <Brain className="w-4 h-4 text-mustard-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">AI Price Advisor</h3>
                  <p className="text-[10px] text-navy-500">Based on market demand, supply & season</p>
                </div>
                {aiLoading && <Loader2 className="w-4 h-4 animate-spin text-navy-400 ml-auto" />}
              </div>

              {/* Market Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 bg-white rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-500">Demand</p>
                  <p className={`text-xs font-bold ${aiAnalysis.demandLevel === 'HIGH' ? 'text-emerald-600' : aiAnalysis.demandLevel === 'LOW' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {aiAnalysis.demandLevel} {aiAnalysis.demandLevel === 'HIGH' ? '↑' : aiAnalysis.demandLevel === 'LOW' ? '↓' : '→'}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-500">Supply</p>
                  <p className={`text-xs font-bold ${aiAnalysis.supplyLevel === 'LOW' ? 'text-emerald-600' : aiAnalysis.supplyLevel === 'HIGH' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {aiAnalysis.supplyLevel}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-500">Trend</p>
                  <p className={`text-xs font-bold flex items-center justify-center gap-0.5 ${aiAnalysis.trend === 'Increasing' ? 'text-emerald-600' : aiAnalysis.trend === 'Decreasing' ? 'text-rose-600' : 'text-gray-700'}`}>
                    {aiAnalysis.trend === 'Increasing' ? <TrendingUp className="w-3 h-3" /> : aiAnalysis.trend === 'Decreasing' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {aiAnalysis.trend}
                  </p>
                </div>
              </div>

              {/* AI Suggested Price */}
              <div className="p-3 bg-navy-900 rounded-xl mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-300 font-medium">AI Recommended Price Range</p>
                  <span className="text-[10px] text-mustard-300 font-bold">₹{aiAnalysis.aiSuggestedMinPrice} – ₹{aiAnalysis.aiSuggestedMaxPrice}/kg</span>
                </div>
                <p className="text-lg font-bold text-white">₹{aiAnalysis.aiOptimalPrice}/kg <span className="text-[10px] font-normal text-gray-400">optimal</span></p>
              </div>

              {/* Price Adjustment */}
              <div className="p-3 bg-white rounded-xl border border-gray-100 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Your Price</p>
                  <p className={`text-xs font-bold ${getPriceAdviceColor()}`}>
                    {form.pricePerUnit && aiAnalysis.aiSuggestedMinPrice && aiAnalysis.aiSuggestedMaxPrice ? (
                      Number(form.pricePerUnit) >= aiAnalysis.aiSuggestedMinPrice && Number(form.pricePerUnit) <= aiAnalysis.aiSuggestedMaxPrice
                        ? '✓ In AI range'
                        : Number(form.pricePerUnit) < aiAnalysis.aiSuggestedMinPrice
                          ? '⚠ Below AI range'
                          : '⚠ Above AI range'
                    ) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => handlePriceAdjust('down')}
                    className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-100 transition font-bold text-lg">
                    −
                  </button>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      name="pricePerUnit"
                      value={form.pricePerUnit}
                      onChange={handleChange}
                      placeholder={aiAnalysis.aiOptimalPrice?.toString()}
                      min="1"
                      className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-navy-100 rounded-xl text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                    />
                  </div>
                  <button type="button" onClick={() => handlePriceAdjust('up')}
                    className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition font-bold text-lg">
                    +
                  </button>
                </div>
                <p className={`text-[10px] mt-2 ${getPriceAdviceColor()}`}>
                  {aiAnalysis.priceAdvice || 'Adjust the price using +/− buttons'}
                </p>
              </div>

              {/* Reasons */}
              {aiAnalysis.reasons && aiAnalysis.reasons.length > 0 && (
                <div className="space-y-1.5">
                  {aiAnalysis.reasons.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Info className={`w-3 h-3 mt-0.5 flex-shrink-0 ${r.impact === 'positive' ? 'text-emerald-500' : r.impact === 'negative' ? 'text-rose-500' : 'text-gray-400'}`} />
                      <p className="text-[10px] text-gray-600 leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy-100 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageSelect} />

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Harvest Photo *</label>
                <p className="text-xs text-gray-400 mb-2">Upload a real photo of your produce — buyers will see this</p>

                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Produce preview" className="w-full h-56 object-cover rounded-xl" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/50 text-white text-xs rounded-lg">{imageFile?.name}</div>
                  </div>
                ) : (
                  <div className="relative">
                    <button type="button" onClick={() => setShowImageMenu(!showImageMenu)}
                      className="w-full border-2 border-dashed border-navy-200 rounded-xl p-8 text-center hover:border-mustard-400 transition cursor-pointer">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500"><span className="text-navy-700 font-semibold">Add Photo</span> of your harvest</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5MB</p>
                    </button>
                    {showImageMenu && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                        <button type="button" onClick={() => triggerFileInput('image/*')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition">
                          <Camera className="w-5 h-5 text-blue-500" /><div><p className="font-medium text-gray-900">Camera</p><p className="text-xs text-gray-500">Take a new photo</p></div>
                        </button>
                        <button type="button" onClick={() => triggerFileInput('image/*')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100">
                          <Image className="w-5 h-5 text-green-500" /><div><p className="font-medium text-gray-900">Gallery</p><p className="text-xs text-gray-500">Choose from photos</p></div>
                        </button>
                        <button type="button" onClick={() => triggerFileInput('image/*,.jpg,.jpeg,.png,.webp')} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100">
                          <FileImage className="w-5 h-5 text-purple-500" /><div><p className="font-medium text-gray-900">Files</p><p className="text-xs text-gray-500">Browse image files</p></div>
                        </button>
                        <button type="button" onClick={() => setShowImageMenu(false)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition border-t border-gray-100 text-red-600">
                          <X className="w-5 h-5" /><span className="font-medium">Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Produce Name — triggers AI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Produce Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g., Tomato, Onion, Mango, Turmeric" />
                <p className="text-[10px] text-navy-500 mt-1 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {aiLoading ? 'Analyzing market data...' : form.name.length >= 3 ? 'AI is analyzing market demand for this crop' : 'Type 3+ characters to get AI price suggestion'}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select name="category" value={form.category} onChange={handleChange}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="1000" min="1" className="pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                  <select name="unit" value={form.unit} onChange={handleChange}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Price — always visible, so farmers can list even if AI panel fails/slow */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Price (₹ per {form.unit}) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    name="pricePerUnit"
                    value={form.pricePerUnit}
                    onChange={handleChange}
                    placeholder={aiAnalysis?.aiOptimalPrice ? `AI suggests ${aiAnalysis.aiOptimalPrice}` : 'e.g., 25'}
                    min="1"
                    step="0.01"
                    className="pl-9"
                  />
                </div>
                {aiAnalysis && aiAnalysis.aiSuggestedMinPrice && aiAnalysis.aiSuggestedMaxPrice && (
                  <p className={`text-[10px] mt-1 ${getPriceAdviceColor()}`}>
                    AI range: ₹{aiAnalysis.aiSuggestedMinPrice} – ₹{aiAnalysis.aiSuggestedMaxPrice}/kg
                  </p>
                )}
              </div>

              {/* Location — triggers re-analysis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" name="location" value={form.location} onChange={handleLocationChange}
                    placeholder="Nashik, Maharashtra" className="pl-11" />
                </div>
              </div>

              {/* Expected Ready Date — for Matching Engine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Ready / Harvest Date</label>
                <input
                  type="date"
                  name="readyDate"
                  value={form.readyDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Optional. Used by AI to pair with bulk buyers needing delivery by a specific date.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows="3"
                  placeholder="Describe your produce quality, growing conditions, organic certification, etc."
                  className="w-full px-4 py-3 bg-gray-50 border border-navy-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition resize-none" />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleSaveDraft} disabled={loading}
                  className="px-5 py-3.5 bg-white border-2 border-navy-200 text-navy-800 font-semibold rounded-xl hover:bg-navy-50 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{uploadingImage ? 'Uploading image...' : 'Creating listing...'}</>
                  ) : offline ? 'Save & Queue for Sync' : 'List Produce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
