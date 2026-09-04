import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveFarmerProfile, getFarmerProfile } from '../services/api';
import DocumentUpload from '../components/DocumentUpload';

const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Groundnut', 'Soybean',
  'Tomato', 'Onion', 'Potato', 'Chilli', 'Turmeric', 'Ginger', 'Garlic',
  'Mango', 'Grapes', 'Banana', 'Coconut', 'Pomegranate', 'Orange',
  'Mustard', 'Sunflower', 'Jowar', 'Bajra', 'Tur', 'Moong', 'Urad',
  'Cardamom', 'Black Pepper', 'Cumin', 'Coriander', 'Other',
];

export default function FarmerRegistration() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [form, setForm] = useState({
    farmerCategory: '',
    farmingSeason: '',
    crops: [],
    landAreaAcres: '',
    landOwnership: '',
    farmAddress: '',
    aadhaarLast4: '',
  });

  const [location, setLocation] = useState({ latitude: null, longitude: null, address: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      const result = await getFarmerProfile();
      if (result.ok && result.data?.data) {
        const p = result.data.data;
        setForm({
          farmerCategory: p.farmerCategory || '',
          farmingSeason: p.farmingSeason || '',
          crops: p.crops ? p.crops.split(',') : [],
          landAreaAcres: p.landAreaAcres || '',
          landOwnership: p.landOwnership || '',
          farmAddress: p.farmAddress || '',
          aadhaarLast4: p.aadhaarLast4 || '',
        });
      }
    };
    loadProfile();
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleCrop = (crop) => {
    setForm(f => ({
      ...f,
      crops: f.crops.includes(crop)
        ? f.crops.filter(c => c !== crop)
        : [...f.crops, crop],
    }));
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
        setLocationLoading(false);
      },
      (err) => {
        setError('Could not get location. Please enter manually.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const payload = {
      farmerCategory: form.farmerCategory,
      farmingSeason: form.farmingSeason,
      crops: form.crops.join(','),
      landAreaAcres: form.landAreaAcres ? parseFloat(form.landAreaAcres) : null,
      landOwnership: form.landOwnership,
      farmAddress: form.farmAddress || location.address,
      aadhaarLast4: form.aadhaarLast4,
    };

    const result = await saveFarmerProfile(payload);
    setSaving(false);

    if (result.ok) {
      navigate('/farmer', { replace: true });
    } else {
      setError(result.error || 'Failed to save profile');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return form.farmerCategory !== '';
      case 2: return form.farmingSeason !== '';
      case 3: return form.crops.length > 0;
      case 4: return true; // location is optional
      case 5: return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">What type of farmer are you?</h2>
            <p className="text-sm text-gray-500">Select your farming category</p>
            <div className="space-y-3">
              {[
                { value: 'SINGLE_CROP', label: 'Single-Crop Farmer', emoji: '🌾', desc: 'You grow one primary crop' },
                { value: 'MULTI_CROP', label: 'Multi-Crop Farmer', emoji: '🌿', desc: 'You grow multiple crops' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('farmerCategory', opt.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition flex items-start gap-4
                    ${form.farmerCategory === opt.value
                      ? 'border-mustard-400 bg-mustard-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </div>
                  {form.farmerCategory === opt.value && (
                    <CheckCircle className="w-5 h-5 text-mustard-600 ml-auto mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Farming Season</h2>
            <p className="text-sm text-gray-500">Which season(s) do you farm in?</p>
            <div className="space-y-3">
              {[
                { value: 'KHARIF', label: 'Kharif', desc: 'Jun–Oct (Monsoon crops)', emoji: '🌧️' },
                { value: 'RABI', label: 'Rabi', desc: 'Oct–Mar (Winter crops)', emoji: '❄️' },
                { value: 'ZAID', label: 'Zaid', desc: 'Mar–Jun (Summer crops)', emoji: '☀️' },
                { value: 'MULTIPLE', label: 'Multiple Seasons', desc: 'I farm across multiple seasons', emoji: '📅' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('farmingSeason', opt.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition flex items-start gap-4
                    ${form.farmingSeason === opt.value
                      ? 'border-mustard-400 bg-mustard-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </div>
                  {form.farmingSeason === opt.value && (
                    <CheckCircle className="w-5 h-5 text-mustard-600 ml-auto mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">What crops do you grow?</h2>
            <p className="text-sm text-gray-500">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {CROPS.map(crop => (
                <button
                  key={crop}
                  onClick={() => toggleCrop(crop)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition border
                    ${form.crops.includes(crop)
                      ? 'bg-mustard-500 text-white border-mustard-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-mustard-300'}`}
                >
                  {crop}
                </button>
              ))}
            </div>
            {form.crops.length > 0 && (
              <p className="text-sm text-gray-500">{form.crops.length} crop(s) selected</p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Farm Details</h2>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Farm Location</label>
              <button
                onClick={requestLocation}
                disabled={locationLoading}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center gap-3 hover:bg-gray-100 transition"
              >
                <MapPin className="w-4 h-4 text-gray-400" />
                {locationLoading ? 'Getting location...' : location.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Use My Current Location'}
              </button>
              <input
                type="text"
                value={form.farmAddress}
                onChange={e => update('farmAddress', e.target.value)}
                placeholder="Or enter farm address manually"
                className="mt-2 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>

            {/* Land Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Land Area (acres) — optional</label>
              <input
                type="number"
                value={form.landAreaAcres}
                onChange={e => update('landAreaAcres', e.target.value)}
                placeholder="e.g. 5.5"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>

            {/* Land Ownership */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Land Ownership</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'OWNED', label: 'Owned' },
                  { value: 'LEASED', label: 'Leased' },
                  { value: 'COMMON_LAND', label: 'Common Land' },
                  { value: 'FPO_MANAGED', label: 'FPO Managed' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('landOwnership', opt.value)}
                    className={`p-2.5 rounded-xl border-2 text-sm font-medium transition
                      ${form.landOwnership === opt.value
                        ? 'border-mustard-400 bg-mustard-50 text-navy-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Identity & Documents</h2>
            <p className="text-sm text-gray-500">Upload your identity document for verification</p>

            {/* Aadhaar last 4 digits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aadhaar Last 4 Digits — optional
              </label>
              <input
                type="text"
                maxLength={4}
                value={form.aadhaarLast4}
                onChange={e => update('aadhaarLast4', e.target.value.replace(/\D/g, ''))}
                placeholder="XXXX"
                className="w-32 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
              <p className="text-xs text-gray-400 mt-1">Only last 4 digits — full Aadhaar is never stored</p>
            </div>

            {/* Aadhaar Card Upload */}
            <DocumentUpload
              documentType="AADHAAR_CARD"
              label="Aadhaar Card"
              isPhoto={false}
            />

            {/* Profile Photo */}
            <DocumentUpload
              documentType="PROFILE_PHOTO"
              label="Profile Photo"
              isPhoto={true}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Farmer Registration</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} of {totalSteps}</p>

          {/* Progress bar */}
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-mustard-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
