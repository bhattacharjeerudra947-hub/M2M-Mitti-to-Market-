import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, MapPin, CheckCircle, AlertCircle,
  ArrowLeft, ArrowRight, Loader2, Building, ShieldCheck, FileCheck, RefreshCw,
  Landmark, AlertTriangle, UploadCloud, Check
} from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES, getDistricts } from '../data/indiaLocations';
import {
  sendMobileOtp, verifyMobileOtp, resendMobileOtp, lookupIfsc,
  uploadDocument, resubmitVerification, getMyDocuments,
  saveFarmerProfile, saveBusinessProfile
} from '../services/api';

export default function SignUp() {
  const navigate = useNavigate();
  const { register, login, user: currentUser, refreshUser } = useAuth();

  // Wizard step: 1 = Role, 2 = Basic + OTP, 3 = Location, 4 = KYC, 5 = Under Verification
  const [step, setStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1
    role: '', // 'farmer' | 'business'

    // Step 2: Basic details
    name: '', // Farmer full name or Business contact person
    businessName: '', // Business name (for business)
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',

    // OTP state
    otpSent: false,
    otpCode: '',
    phoneVerified: false,
    devOtpHint: '',
    timer: 0,

    // Step 3: Location
    country: 'India',
    state: '',
    district: '',
    tehsil: '',
    village: '',
    pincode: '',
    latitude: null,
    longitude: null,

    // Step 4: Farmer KYC
    aadhaarNumber: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    bankBranchName: '',

    // Step 4: Business KYC
    gstin: '',
    panNumber: '',

    // Terms
    agreedToTerms: false,
  });

  // Uploaded documents tracker: docType -> { id, originalFilename, cloudinaryUrl, verificationStatus, rejectionReason }
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploadingDocKey, setUploadingDocKey] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState('');

  // Resend OTP countdown
  useEffect(() => {
    let interval = null;
    if (formData.timer > 0) {
      interval = setInterval(() => {
        setFormData(prev => ({ ...prev, timer: prev.timer - 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [formData.timer]);

  // If user already logged in and visiting verification, load docs
  useEffect(() => {
    if (step === 5) {
      loadUserDocuments();
    }
  }, [step]);

  const loadUserDocuments = async () => {
    const res = await getMyDocuments();
    if (res.ok && Array.isArray(res.data)) {
      const map = {};
      res.data.forEach(d => { map[d.documentType] = d; });
      setUploadedDocs(map);
    }
  };

  const updateField = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setError('');
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Mobile OTP Logic (MSG91)
  // ═══════════════════════════════════════════════════════════════

  const handleSendOtp = async () => {
    const cleaned = formData.phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setOtpLoading(true);
    const res = await sendMobileOtp(cleaned);
    setOtpLoading(false);

    if (res.ok) {
      setFormData(prev => ({
        ...prev,
        otpSent: true,
        timer: 60,
        devOtpHint: res.data?.devOtp || '',
      }));
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otpCode.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError('');
    setOtpLoading(true);
    const res = await verifyMobileOtp(formData.phone, formData.otpCode.trim());
    setOtpLoading(false);

    if (res.ok) {
      setFormData(prev => ({
        ...prev,
        phoneVerified: true,
        devOtpHint: '',
      }));
    } else {
      setError(res.error || 'Invalid OTP. Please check and try again.');
    }
  };

  const handleResendOtp = async () => {
    if (formData.timer > 0) return;
    setError('');
    setOtpLoading(true);
    const res = await resendMobileOtp(formData.phone);
    setOtpLoading(false);

    if (res.ok) {
      setFormData(prev => ({
        ...prev,
        timer: 60,
        devOtpHint: res.data?.devOtp || prev.devOtpHint,
      }));
    } else {
      setError(res.error || 'Failed to resend OTP.');
    }
  };

  const validateStep2 = () => {
    if (formData.role === 'farmer') {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        setError('Full Name is mandatory (minimum 2 characters)');
        return false;
      }
    } else {
      if (!formData.businessName.trim()) {
        setError('Business Name is mandatory');
        return false;
      }
      if (!formData.name.trim()) {
        setError('Contact Person Name is mandatory');
        return false;
      }
    }

    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setError('A valid 10-digit mobile number is mandatory');
      return false;
    }

    if (!formData.phoneVerified) {
      setError('Please verify your mobile number with OTP before continuing');
      return false;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address, or leave it blank');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password is mandatory and must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Location Logic (Dependent dropdowns + GPS)
  // ═══════════════════════════════════════════════════════════════

  const handleStateChange = (newState) => {
    setFormData(prev => ({
      ...prev,
      state: newState,
      district: '', // Reset district when state changes
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError('');
    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));

        // Reverse geocoding via OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // Find matching state
            const detectedState = addr.state || '';
            const matchedState = INDIAN_STATES.find(
              s => s.toLowerCase() === detectedState.toLowerCase()
            ) || '';

            // Find matching district
            const detectedDistrict = addr.state_district || addr.county || addr.district || '';
            const availableDistricts = matchedState ? getDistricts(matchedState) : [];
            const matchedDistrict = availableDistricts.find(
              d => d.toLowerCase().includes(detectedDistrict.toLowerCase()) ||
                   detectedDistrict.toLowerCase().includes(d.toLowerCase())
            ) || '';

            const detectedPincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
            const detectedVillage = addr.village || addr.suburb || addr.neighbourhood || addr.town || addr.city || '';
            const detectedTehsil = addr.subdistrict || addr.tehsil || addr.taluk || '';

            setFormData(prev => ({
              ...prev,
              state: matchedState || prev.state,
              district: matchedDistrict || prev.district,
              pincode: detectedPincode || prev.pincode,
              village: detectedVillage || prev.village,
              tehsil: detectedTehsil || prev.tehsil,
            }));
          }
        } catch (e) {
          console.warn('Reverse geocode lookup error:', e);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setError('Location permission denied or unavailable. Please fill in details manually.');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validateStep3 = () => {
    if (!formData.state) {
      setError('Please select your State');
      return false;
    }
    if (!formData.district) {
      setError('Please select your District');
      return false;
    }
    if (!formData.tehsil.trim()) {
      setError('Tehsil / Taluka is mandatory');
      return false;
    }
    if (!formData.village.trim()) {
      setError('Village is mandatory');
      return false;
    }
    const pin = formData.pincode.replace(/\D/g, '');
    if (pin.length !== 6) {
      setError('6-digit PIN Code is mandatory');
      return false;
    }
    return true;
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: KYC & Bank Lookup
  // ═══════════════════════════════════════════════════════════════

  const handleIfscLookup = async (code) => {
    const clean = (code || formData.bankIfscCode).trim().toUpperCase();
    if (clean.length !== 11) {
      setIfscError('IFSC must be 11 characters');
      return;
    }
    setIfscLoading(true);
    setIfscError('');
    const res = await lookupIfsc(clean);
    setIfscLoading(false);

    if (res.ok) {
      setFormData(prev => ({
        ...prev,
        bankName: res.bank,
        bankBranchName: res.branch,
      }));
    } else {
      setIfscError(res.error || 'Could not find bank branch for this IFSC');
      setFormData(prev => ({ ...prev, bankName: '', bankBranchName: '' }));
    }
  };

  const handleDocumentDirectUpload = async (docType, file) => {
    if (!file) return;
    setUploadingDocKey(docType);
    setError('');
    const res = await uploadDocument(file, docType);
    setUploadingDocKey('');

    if (res.ok && res.data?.data) {
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: res.data.data,
      }));
    } else {
      setError(res.error || `Failed to upload ${docType}`);
    }
  };

  const validateStep4 = () => {
    if (formData.role === 'farmer') {
      const aadhaar = formData.aadhaarNumber.replace(/\D/g, '');
      if (aadhaar.length !== 12) {
        setError('12-digit Aadhaar Number is mandatory');
        return false;
      }
      if (!uploadedDocs['AADHAAR_CARD']) {
        setError('Aadhaar Card document upload is mandatory');
        return false;
      }
      if (!uploadedDocs['LAND_CULTIVATION_PROOF']) {
        setError('Land / Cultivation Proof document upload is mandatory');
        return false;
      }
      if (!formData.bankAccountNumber.trim()) {
        setError('Bank Account Number is mandatory');
        return false;
      }
      if (!formData.bankIfscCode.trim() || formData.bankIfscCode.trim().length !== 11) {
        setError('Valid 11-character IFSC Code is mandatory');
        return false;
      }
    } else {
      if (!formData.gstin.trim() || formData.gstin.trim().length < 15) {
        setError('Mandatory 15-character GSTIN Number is required');
        return false;
      }
      if (!uploadedDocs['GST_CERTIFICATE']) {
        setError('GST Certificate document upload is mandatory');
        return false;
      }
      if (!uploadedDocs['BUSINESS_REGISTRATION']) {
        setError('Business Registration / Company Proof document upload is mandatory');
        return false;
      }
      const pan = formData.panNumber.trim().toUpperCase();
      if (!pan || pan.length !== 10) {
        setError('10-character PAN / Business PAN Number is mandatory');
        return false;
      }
      if (!uploadedDocs['PAN_CARD']) {
        setError('PAN Card document upload is mandatory');
        return false;
      }
    }

    if (!formData.agreedToTerms) {
      setError('You must agree to the Terms & Conditions and Privacy Policy to proceed');
      return false;
    }

    return true;
  };

  // Submit complete application
  const handleSubmitApplication = async () => {
    setError('');
    if (!validateStep4()) return;
    setSubmitting(true);

    const fullLocation = `${formData.village}, ${formData.tehsil}, ${formData.district}, ${formData.state} - ${formData.pincode}`;

    // 1. Register User account
    const registerPayload = {
      name: formData.name.trim(),
      email: formData.email.trim() ? formData.email.trim() : null,
      phone: formData.phone.replace(/\D/g, ''),
      password: formData.password,
      role: formData.role.toUpperCase(),
      location: fullLocation,
      state: formData.state,
      district: formData.district,
      tehsil: formData.tehsil,
      village: formData.village,
      pincode: formData.pincode,
      organizationName: formData.role === 'business' ? formData.businessName.trim() : null,
      contactPersonName: formData.role === 'business' ? formData.name.trim() : null,
    };

    const regRes = await register(registerPayload);
    if (!regRes.ok) {
      setSubmitting(false);
      setError(regRes.error || 'Registration failed. Please check your information.');
      return;
    }

    // 2. Save extended profile details (Aadhaar / Bank or GSTIN / PAN)
    if (formData.role === 'farmer') {
      await saveFarmerProfile({
        farmAddress: fullLocation,
        state: formData.state,
        district: formData.district,
        tehsil: formData.tehsil,
        village: formData.village,
        pincode: formData.pincode,
        aadhaarNumber: formData.aadhaarNumber.replace(/\D/g, ''),
        aadhaarLast4: formData.aadhaarNumber.replace(/\D/g, '').slice(-4),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        bankIfscCode: formData.bankIfscCode.trim().toUpperCase(),
        bankName: formData.bankName,
        bankBranchName: formData.bankBranchName,
      });
    } else {
      await saveBusinessProfile({
        officialName: formData.businessName.trim(),
        authorizedPerson: formData.name.trim(),
        businessAddress: fullLocation,
        state: formData.state,
        district: formData.district,
        tehsil: formData.tehsil,
        village: formData.village,
        pincode: formData.pincode,
        gstin: formData.gstin.trim().toUpperCase(),
        panNumber: formData.panNumber.trim().toUpperCase(),
      });
    }

    setSubmitting(false);
    // Move to step 5: "Under Admin Verification"
    setStep(5);
  };

  // Re-submission of flagged documents in Step 5
  const handleResubmitFlagged = async () => {
    setSubmitting(true);
    const res = await resubmitVerification();
    setSubmitting(false);
    if (res.ok) {
      await loadUserDocuments();
      if (refreshUser) refreshUser({ ...currentUser, verificationStatus: 'PENDING' });
    } else {
      setError(res.error || 'Failed to re-submit application.');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════

  const inputStyle = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition text-gray-900';

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Navigation & Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center">
            <M2MLogo />
          </Link>

          {step > 1 && step < 5 && (
            <button
              onClick={() => { setError(''); setStep(s => s - 1); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}

          {step === 1 && (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          )}
        </div>

        {/* Step Indicator */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <span>Step {step} of 4: {step === 1 ? 'Role Selection' : step === 2 ? 'Basic Details' : step === 3 ? 'Location Details' : 'KYC Verification'}</span>
              <span className="text-navy-900 font-bold">{formData.role ? (formData.role === 'farmer' ? '🌾 Farmer' : '🏢 Business') : ''}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    s < step ? 'bg-emerald-500' : s === step ? 'bg-mustard-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-6 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 1: ROLE SELECTION
             ══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Choose Account Type</h1>
                <p className="text-sm text-gray-500 mt-1">Select whether you are joining as an agricultural producer or buyer</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Farmer Option */}
                <button
                  type="button"
                  onClick={() => updateField('role', 'farmer')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
                    formData.role === 'farmer'
                      ? 'border-mustard-500 bg-mustard-50/50 shadow-md ring-2 ring-mustard-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
                    👨‍🌾
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Farmer / Grower</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Sell your harvested crops directly to bulk buyers, obtain fair mandi prices, and secure advance deals.
                  </p>
                  {formData.role === 'farmer' && (
                    <span className="absolute top-4 right-4 p-1 bg-mustard-500 text-white rounded-full">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>

                {/* Business Option */}
                <button
                  type="button"
                  onClick={() => updateField('role', 'business')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all relative ${
                    formData.role === 'business'
                      ? 'border-navy-600 bg-blue-50/40 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
                    🏢
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Business / Buyer</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Source farm produce directly from verified farmers, place bulk orders, manage contracts, and track supply.
                  </p>
                  {formData.role === 'business' && (
                    <span className="absolute top-4 right-4 p-1 bg-navy-700 text-white rounded-full">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={!formData.role}
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-4"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-navy-700 font-bold hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2: BASIC DETAILS & MSG91 OTP
             ══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {formData.role === 'farmer' ? 'Farmer Registration' : 'Business Registration'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Please fill in your primary details and verify your mobile number.</p>
              </div>

              {/* Farmer Name OR Business Name + Contact Person */}
              {formData.role === 'farmer' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder="e.g. Ramesh Kumar Patel"
                      className={`${inputStyle} pl-10`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Business / Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={e => updateField('businessName', e.target.value)}
                        placeholder="e.g. AgroFresh Foods Pvt Ltd"
                        className={`${inputStyle} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => updateField('name', e.target.value)}
                        placeholder="e.g. Anita Sharma"
                        className={`${inputStyle} pl-10`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Number & MSG91 OTP Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-gray-800 uppercase">
                  Mobile Number (MSG91 OTP Verification) <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-gray-500 pointer-events-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      disabled={formData.phoneVerified}
                      value={formData.phone}
                      onChange={e => updateField('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className={`${inputStyle} pl-12 font-mono ${formData.phoneVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : ''}`}
                    />
                  </div>

                  {!formData.phoneVerified ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || formData.phone.length < 10}
                      className="px-4 py-2.5 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 disabled:opacity-40 transition whitespace-nowrap"
                    >
                      {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : formData.otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Verified
                    </div>
                  )}
                </div>

                {/* OTP Input Block */}
                {formData.otpSent && !formData.phoneVerified && (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Enter 6-digit OTP sent to +91 {formData.phone}</span>
                      {formData.timer > 0 ? (
                        <span className="text-[11px] text-gray-400">Resend in {formData.timer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="text-xs text-navy-700 font-bold hover:underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.otpCode}
                        onChange={e => updateField('otpCode', e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-mono tracking-widest font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || formData.otpCode.length < 6}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Code'}
                      </button>
                    </div>

                    {formData.devOtpHint && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-mono">
                        Demo / Test Mode: OTP is <strong>{formData.devOtpHint}</strong> (or enter <strong>123456</strong>)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Email Address
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">(Optional)</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="you@example.com (optional)"
                    className={`${inputStyle} pl-10`}
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => updateField('password', e.target.value)}
                      placeholder="Min 6 characters"
                      className={`${inputStyle} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={e => updateField('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                      className={`${inputStyle} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2"
                >
                  Proceed to Location Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 3: LOCATION DETAILS (COMMON FOR BOTH)
             ══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Location Details</h2>
                  <p className="text-xs text-gray-500 mt-1">Specify your operating address in India.</p>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={detectingLocation}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-mustard-50 text-navy-900 border border-mustard-300 rounded-xl text-xs font-bold hover:bg-mustard-100 transition shadow-sm"
                >
                  {detectingLocation ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting...</>
                  ) : (
                    <><MapPin className="w-3.5 h-3.5 text-mustard-600" /> Use Current Location</>
                  )}
                </button>
              </div>

              {/* Country (India Fixed) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Country</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 cursor-not-allowed">
                  <span className="text-lg">🇮🇳</span> India (Not Changeable)
                </div>
              </div>

              {/* State & Dependent District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={e => handleStateChange(e.target.value)}
                    className={inputStyle}
                  >
                    <option value="">-- Select State --</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.district}
                    disabled={!formData.state}
                    onChange={e => updateField('district', e.target.value)}
                    className={`${inputStyle} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {!formData.state ? 'Select state first' : '-- Select District --'}
                    </option>
                    {getDistricts(formData.state).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tehsil/Taluka, Village & 6-digit PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Tehsil / Taluka <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tehsil}
                    onChange={e => updateField('tehsil', e.target.value)}
                    placeholder="e.g. Barasat"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Village / Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={e => updateField('village', e.target.value)}
                    placeholder="e.g. Nabapally"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    6-Digit PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={e => updateField('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 700124"
                    className={`${inputStyle} font-mono`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep3()) setStep(4);
                  }}
                  className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2"
                >
                  Proceed to KYC Verification <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 4: KYC DETAILS (FARMER OR BUSINESS)
             ══════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {formData.role === 'farmer' ? 'Farmer KYC Verification' : 'Business KYC Verification'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Upload verification documents. All files are encrypted and processed securely.
                </p>
              </div>

              {/* ────────────────── FARMER KYC ────────────────── */}
              {formData.role === 'farmer' && (
                <div className="space-y-5">
                  {/* Identity Verification */}
                  <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" /> Identity & Land Documents
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        12-Digit Aadhaar Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.aadhaarNumber}
                        onChange={e => updateField('aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                        placeholder="1234 5678 9012"
                        className={`${inputStyle} font-mono tracking-widest`}
                      />
                    </div>

                    {/* Aadhaar Card Upload */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          Aadhaar Card Photo / PDF <span className="text-red-500">*</span>
                        </span>
                        {uploadedDocs['AADHAAR_CARD'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('AADHAAR_CARD', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'AADHAAR_CARD' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>

                    {/* Land / Cultivation Proof Upload */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          Land / Cultivation Proof (Khasra / Khatiyan / Lease Deed) <span className="text-red-500">*</span>
                        </span>
                        {uploadedDocs['LAND_CULTIVATION_PROOF'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('LAND_CULTIVATION_PROOF', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'LAND_CULTIVATION_PROOF' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>

                    {/* Farmer ID Document (Optional) */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          Farmer ID Document <span className="text-gray-400 font-normal">(Optional)</span>
                        </span>
                        {uploadedDocs['FARMER_ID'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('FARMER_ID', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'FARMER_ID' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bank Details & IFSC Auto-Branch Lookup */}
                  <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-blue-600" /> Bank Details
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={e => updateField('bankAccountNumber', e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 000123456789"
                        className={`${inputStyle} font-mono`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        IFSC Code (Auto-fetches Bank & Branch) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={11}
                          value={formData.bankIfscCode}
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            updateField('bankIfscCode', val);
                            if (val.length === 11) handleIfscLookup(val);
                          }}
                          placeholder="e.g. SBIN0000001"
                          className={`${inputStyle} font-mono uppercase`}
                        />
                        <button
                          type="button"
                          onClick={() => handleIfscLookup()}
                          disabled={ifscLoading || formData.bankIfscCode.length < 11}
                          className="px-4 py-2.5 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 disabled:opacity-40 transition whitespace-nowrap"
                        >
                          {ifscLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Branch'}
                        </button>
                      </div>

                      {ifscError && (
                        <p className="text-[11px] text-red-600 mt-1">{ifscError}</p>
                      )}

                      {/* Display retrieved Bank and Branch */}
                      {formData.bankBranchName && (
                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">{formData.bankName || 'Verified Bank'}</p>
                            <p className="text-[11px] text-emerald-800">Branch: {formData.bankBranchName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────── BUSINESS KYC ────────────────── */}
              {formData.role === 'business' && (
                <div className="space-y-5">
                  <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" /> Business Credentials & Documents
                    </h3>

                    {/* GSTIN */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        GSTIN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={formData.gstin}
                        onChange={e => updateField('gstin', e.target.value.toUpperCase())}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        className={`${inputStyle} font-mono uppercase`}
                      />
                    </div>

                    {/* GST Certificate Upload */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          GST Certificate Upload (PDF or Image) <span className="text-red-500">*</span>
                        </span>
                        {uploadedDocs['GST_CERTIFICATE'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('GST_CERTIFICATE', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'GST_CERTIFICATE' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>

                    {/* Business Registration / Company Proof Upload */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          Business Registration / Company Proof (Certificate of Incorporation / Trade License) <span className="text-red-500">*</span>
                        </span>
                        {uploadedDocs['BUSINESS_REGISTRATION'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('BUSINESS_REGISTRATION', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'BUSINESS_REGISTRATION' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>

                    {/* PAN / Business PAN */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                        PAN / Business PAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.panNumber}
                        onChange={e => updateField('panNumber', e.target.value.toUpperCase())}
                        placeholder="e.g. ABCDE1234F"
                        className={`${inputStyle} font-mono uppercase`}
                      />
                    </div>

                    {/* PAN Card Upload */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800">
                          PAN Card Document / Photo Upload <span className="text-red-500">*</span>
                        </span>
                        {uploadedDocs['PAN_CARD'] && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleDocumentDirectUpload('PAN_CARD', e.target.files[0])}
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                      />
                      {uploadingDocKey === 'PAN_CARD' && (
                        <p className="text-[11px] text-navy-600 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading to secure storage...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms & Conditions Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={e => updateField('agreedToTerms', e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-mustard-600 rounded border-gray-300 focus:ring-mustard-400"
                  />
                  <span className="text-xs text-gray-600">
                    I agree to the{' '}
                    <Link to="/pricing" className="text-navy-700 font-bold hover:underline">Terms & Conditions</Link>
                    {' '}and{' '}
                    <Link to="/about-us" className="text-navy-700 font-bold hover:underline">Privacy Policy</Link>.
                    All submitted verification information is accurate.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitting || !formData.agreedToTerms}
                  className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Submit Application</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 5: UNDER ADMIN VERIFICATION STATUS
             ══════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                  ⏳
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Application Under Admin Verification
                </h1>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Thank you for submitting your application to <span className="notranslate" translate="no">Mitti2Market</span>.
                  Our verification team is reviewing your details and documents.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mt-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Status: Under Review
                </div>
              </div>

              {/* Re-upload Flag Banner if any document is flagged */}
              {Object.values(uploadedDocs).some(d => d.verificationStatus === 'RE_UPLOAD_REQUESTED') && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Action Required: Document Re-upload Requested</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    The admin team has requested replacement for one or more documents below. Please upload a clear or valid replacement and re-submit.
                  </p>
                </div>
              )}

              {/* Submitted Details Breakdown */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-2">
                <h3 className="font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Application Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div><span className="font-medium text-gray-900">Name:</span> {formData.name}</div>
                  <div><span className="font-medium text-gray-900">Role:</span> {formData.role?.toUpperCase()}</div>
                  <div><span className="font-medium text-gray-900">Mobile:</span> +91 {formData.phone}</div>
                  <div><span className="font-medium text-gray-900">State:</span> {formData.state || 'N/A'}</div>
                  <div><span className="font-medium text-gray-900">District:</span> {formData.district || 'N/A'}</div>
                  <div><span className="font-medium text-gray-900">PIN Code:</span> {formData.pincode || 'N/A'}</div>
                  {formData.role === 'farmer' && formData.bankBranchName && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-900">Bank:</span> {formData.bankName} ({formData.bankBranchName})
                    </div>
                  )}
                  {formData.role === 'business' && formData.gstin && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-900">GSTIN:</span> <span className="font-mono">{formData.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submitted Documents Status & Re-upload Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Document Verification Status
                </h3>

                {Object.keys(uploadedDocs).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No documents attached or loading...</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.values(uploadedDocs).map(doc => {
                      const isFlagged = doc.verificationStatus === 'RE_UPLOAD_REQUESTED';
                      return (
                        <div
                          key={doc.id || doc.documentType}
                          className={`p-3.5 rounded-xl border text-xs transition-all ${
                            isFlagged
                              ? 'bg-amber-50 border-amber-300 shadow-sm'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{doc.documentType}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              doc.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isFlagged
                                ? 'bg-amber-200 text-amber-900 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {doc.verificationStatus === 'VERIFIED' ? '✅ VERIFIED' : isFlagged ? '⚠️ RE-UPLOAD NEEDED' : '⏳ UNDER REVIEW'}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500 mt-1 truncate">{doc.originalFilename}</p>

                          {/* Flag Reason */}
                          {isFlagged && doc.rejectionReason && (
                            <div className="mt-2 p-2 bg-amber-100 text-amber-900 rounded-lg text-xs">
                              <strong>Admin Note:</strong> {doc.rejectionReason}
                            </div>
                          )}

                          {/* Replacement Document Uploader */}
                          {isFlagged && (
                            <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-900">Upload replacement file:</span>
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={e => handleDocumentDirectUpload(doc.documentType, e.target.files[0])}
                                className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Re-submit button if any document was flagged */}
              {Object.values(uploadedDocs).some(d => d.verificationStatus === 'RE_UPLOAD_REQUESTED') && (
                <button
                  type="button"
                  onClick={handleResubmitFlagged}
                  disabled={submitting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Re-submit for Verification'}
                </button>
              )}

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(formData.role === 'farmer' ? '/farmer' : '/business')}
                  className="flex-1 py-3 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition text-center"
                >
                  Go to Dashboard (View Mode)
                </button>
                <button
                  type="button"
                  onClick={loadUserDocuments}
                  className="px-4 py-3 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
