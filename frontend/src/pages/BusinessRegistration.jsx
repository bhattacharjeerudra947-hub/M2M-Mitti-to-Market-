import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveBusinessProfile, getBusinessProfile } from '../services/api';
import DocumentUpload from '../components/DocumentUpload';

const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Groundnut', 'Soybean',
  'Tomato', 'Onion', 'Potato', 'Chilli', 'Turmeric', 'Ginger', 'Garlic',
  'Mango', 'Grapes', 'Banana', 'Coconut', 'Pomegranate', 'Orange',
  'Mustard', 'Sunflower', 'Jowar', 'Bajra', 'Pulses', 'Spices', 'Other',
];

export default function BusinessRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [form, setForm] = useState({
    businessType: '',
    officialName: '',
    gstin: '',
    registrationNumber: '',
    businessAddress: '',
    departmentName: '',
    authorizedPerson: '',
    requiredCrops: [],
    monthlyRequirementKg: '',
  });

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      const result = await getBusinessProfile();
      if (result.ok && result.data?.data) {
        const p = result.data.data;
        setForm({
          businessType: p.businessType || '',
          officialName: p.officialName || '',
          gstin: p.gstin || '',
          registrationNumber: p.registrationNumber || '',
          businessAddress: p.businessAddress || '',
          departmentName: p.departmentName || '',
          authorizedPerson: p.authorizedPerson || '',
          requiredCrops: p.requiredCrops ? p.requiredCrops.split(',') : [],
          monthlyRequirementKg: p.monthlyRequirementKg || '',
        });
      }
    };
    loadProfile();
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleCrop = (crop) => {
    setForm(f => ({
      ...f,
      requiredCrops: f.requiredCrops.includes(crop)
        ? f.requiredCrops.filter(c => c !== crop)
        : [...f.requiredCrops, crop],
    }));
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => { setError('Could not get location'); setLocationLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const payload = {
      businessType: form.businessType,
      officialName: form.officialName,
      gstin: form.gstin,
      registrationNumber: form.registrationNumber,
      businessAddress: form.businessAddress,
      departmentName: form.departmentName,
      authorizedPerson: form.authorizedPerson,
      requiredCrops: form.requiredCrops.join(','),
      monthlyRequirementKg: form.monthlyRequirementKg ? parseInt(form.monthlyRequirementKg) : null,
    };

    const result = await saveBusinessProfile(payload);
    setSaving(false);

    if (result.ok) {
      navigate('/business', { replace: true });
    } else {
      setError(result.error || 'Failed to save profile');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return form.businessType !== '';
      case 2: return form.officialName.trim() !== '';
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">What type of organization?</h2>
            <p className="text-sm text-gray-500">Select your business category</p>
            <div className="space-y-3">
              {[
                { value: 'PRIVATE_BUSINESS', label: 'Private Company', emoji: '🏢', desc: 'Private business or company' },
                { value: 'GOVERNMENT', label: 'Government Agency', emoji: '🏛️', desc: 'Government department or agency' },
                { value: 'FPO_COOPERATIVE', label: 'FPO / Cooperative', emoji: '🤝', desc: 'Farmer Producer Organization or cooperative' },
                { value: 'OTHER', label: 'Other Organization', emoji: '📋', desc: 'Any other organization type' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('businessType', opt.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition flex items-start gap-4
                    ${form.businessType === opt.value
                      ? 'border-mustard-400 bg-mustard-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </div>
                  {form.businessType === opt.value && (
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
            <h2 className="text-xl font-bold text-gray-900">Business Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {form.businessType === 'GOVERNMENT' ? 'Department / Agency Name' : 'Organization Name'} *
              </label>
              <input
                type="text"
                value={form.officialName}
                onChange={e => update('officialName', e.target.value)}
                placeholder={form.businessType === 'GOVERNMENT' ? 'e.g. Ministry of Agriculture' : 'e.g. Fresh Foods Pvt Ltd'}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>

            {form.businessType === 'GOVERNMENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Government Department</label>
                <input
                  type="text"
                  value={form.departmentName}
                  onChange={e => update('departmentName', e.target.value)}
                  placeholder="e.g. Department of Agriculture, Maharashtra"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
                />
              </div>
            )}

            {form.businessType === 'PRIVATE_BUSINESS' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN — optional</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={form.gstin}
                    onChange={e => update('gstin', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mustard-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Number — optional</label>
                  <input
                    type="text"
                    value={form.registrationNumber}
                    onChange={e => update('registrationNumber', e.target.value)}
                    placeholder="Company registration number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Authorized Contact Person</label>
              <input
                type="text"
                value={form.authorizedPerson}
                onChange={e => update('authorizedPerson', e.target.value)}
                placeholder="Contact person name"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Location & Requirements</h2>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Location</label>
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
                value={form.businessAddress}
                onChange={e => update('businessAddress', e.target.value)}
                placeholder="Or enter business address manually"
                className="mt-2 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>

            {/* Required Crops */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crops You're Looking For</label>
              <div className="flex flex-wrap gap-2">
                {CROPS.map(crop => (
                  <button
                    key={crop}
                    onClick={() => toggleCrop(crop)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border
                      ${form.requiredCrops.includes(crop)
                        ? 'bg-mustard-500 text-white border-mustard-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-mustard-300'}`}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Requirement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Requirement (kg) — optional</label>
              <input
                type="number"
                value={form.monthlyRequirementKg}
                onChange={e => update('monthlyRequirementKg', e.target.value)}
                placeholder="e.g. 10000"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Legal Documents</h2>
            <p className="text-sm text-gray-500">Upload your organization verification documents</p>

            {/* ─── Private Business ─── */}
            {form.businessType === 'PRIVATE_BUSINESS' && (
              <>
                <DocumentUpload
                  documentType="BUSINESS_REGISTRATION"
                  label="Business Registration Certificate"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="GST_CERTIFICATE"
                  label="GST Certificate (optional)"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="PAN_CARD"
                  label="PAN Card (optional)"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="ADDRESS_PROOF"
                  label="Business Address Proof (optional)"
                  isPhoto={false}
                />
              </>
            )}

            {/* ─── Government Body ─── */}
            {form.businessType === 'GOVERNMENT' && (
              <>
                <DocumentUpload
                  documentType="GOVERNMENT_AUTHORIZATION"
                  label="Government Authorization Document"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="GOVERNMENT_ID"
                  label="Department / Institution ID"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="AUTHORIZATION_LETTER"
                  label="Official Authorization Letter (optional)"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="OTHER"
                  label="Other Supporting Document (optional)"
                  isPhoto={false}
                />
              </>
            )}

            {/* ─── FPO / Cooperative ─── */}
            {form.businessType === 'FPO_COOPERATIVE' && (
              <>
                <DocumentUpload
                  documentType="FPO_REGISTRATION"
                  label="FPO / Cooperative Registration"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="GST_CERTIFICATE"
                  label="GST Certificate (optional)"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="PAN_CARD"
                  label="PAN Card (optional)"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="OTHER"
                  label="Other Supporting Document (optional)"
                  isPhoto={false}
                />
              </>
            )}

            {/* ─── Other ─── */}
            {form.businessType === 'OTHER' && (
              <>
                <DocumentUpload
                  documentType="OTHER"
                  label="Organization Registration Document"
                  isPhoto={false}
                />
                <DocumentUpload
                  documentType="OTHER"
                  label="Additional Supporting Document (optional)"
                  isPhoto={false}
                />
              </>
            )}

            {/* Profile Photo / Logo — always shown */}
            <DocumentUpload
              documentType="PROFILE_PHOTO"
              label="Business Logo / Profile Photo"
              isPhoto={true}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
            <p className="text-sm text-gray-500">Please review your information before submitting</p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Organization Type</span>
                <span className="font-medium">{form.businessType?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{form.officialName}</span>
              </div>
              {form.gstin && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GSTIN</span>
                  <span className="font-medium font-mono">{form.gstin}</span>
                </div>
              )}
              {form.authorizedPerson && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Person</span>
                  <span className="font-medium">{form.authorizedPerson}</span>
                </div>
              )}
              {form.requiredCrops.length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Required Crops</span>
                  <div className="flex flex-wrap gap-1">
                    {form.requiredCrops.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-white rounded-full text-xs font-medium border">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {form.businessAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="font-medium text-right max-w-[60%]">{form.businessAddress}</span>
                </div>
              )}
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Business Registration</h1>
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
