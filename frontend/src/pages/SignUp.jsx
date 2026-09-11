import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User, Mail, Phone, Lock, MapPin, Loader2, AlertCircle, CheckCircle,
  Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, Building,
  Upload, FileText, Trash2, Check, RefreshCw, Compass, Building2, CreditCard
} from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { useAuth } from '../context/AuthContext';
import {
  sendMobileOtp, verifyMobileOtp, resendMobileOtp, lookupIfsc,
  uploadDocument, saveFarmerProfile, saveBusinessProfile, updateProfile,
  isLoggedIn
} from '../services/api';
import { INDIAN_STATES, getDistricts } from '../data/indiaLocations';
import DocumentModalPreview from '../components/DocumentModalPreview';
import TermsModal from '../components/TermsModal';
import { FARMER_TERMS, BUSINESS_TERMS } from '../data/termsAndConditions';

const DRAFT_STORAGE_KEY = 'm2m_signup_wizard_draft';

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: authRegister, user, isAuthenticated, refreshUser } = useAuth();

  // Load existing draft or initialize
  const getInitialState = () => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      step: 1, // 1: Account Type, 2: Basic Details, 3: Location, 4: KYC, 5: Submitted Confirmation
      accountType: location.state?.role || '', // 'farmer' | 'business'
      // Basic Details
      name: '',
      businessName: '',
      contactPerson: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      otp: '',
      otpSent: false,
      otpVerified: false,
      devOtpHint: '',
      // Location Details
      country: 'India',
      state: '',
      district: '',
      tehsil: '',
      village: '',
      pincode: '',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      gpsStatus: '',
      // Farmer KYC Details
      aadhaarNumber: '',
      aadhaarDoc: null,
      farmerIdDoc: null,
      landProofDoc: null,
      bankAccountNumber: '',
      bankIfscCode: '',
      bankName: '',
      bankBranchName: '',
      bankPassbookDoc: null,
      farmerAgreeTerms: false,
      // Business KYC Details
      gstin: '',
      gstCertDoc: null,
      businessProofDoc: null,
      panNumber: '',
      panCardDoc: null,
      businessAgreeTerms: false,
    };
  };

  const [formData, setFormData] = useState(getInitialState);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  // IFSC state
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState('');

  // Geolocation loading
  const [geoLoading, setGeoLoading] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState({ isOpen: false, title: '', url: '', mimeType: '' });

  // Terms & Conditions Modal
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalRole, setTermsModalRole] = useState('farmer');

  // Uploading states per document slot
  const [uploadingSlot, setUploadingSlot] = useState(null);

  // Persist draft to sessionStorage whenever formData changes
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch {}
  }, [formData]);

  // Handle countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // If user is already authenticated with PENDING verification, default to Step 5
  useEffect(() => {
    if (isAuthenticated && user?.verificationStatus === 'PENDING') {
      setFormData((prev) => ({ ...prev, step: 5 }));
    }
  }, [isAuthenticated, user]);

  // Check if session is authenticated
  const isUserAuthenticated = isAuthenticated || isLoggedIn();

  const handleAcceptTermsFromModal = (acceptedRole) => {
    if (acceptedRole === 'farmer' || formData.accountType === 'farmer') {
      update('farmerAgreeTerms', true);
    }
    if (acceptedRole === 'business' || formData.accountType === 'business') {
      update('businessAgreeTerms', true);
    }
  };

  const update = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    setGlobalError('');
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    update('phone', val);
    // If phone changed after verification, reset verified state
    if (formData.otpVerified) {
      setFormData((prev) => ({ ...prev, phone: val, otpVerified: false, otpSent: false, otp: '' }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Step Navigation with Back button
  // ─────────────────────────────────────────────────────────────
  const goToStep = (targetStep) => {
    setGlobalError('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData((prev) => ({ ...prev, step: targetStep }));
  };

  const handleBack = () => {
    if (formData.step === 1) {
      navigate(-1);
    } else if (formData.step === 2) {
      goToStep(1);
    } else if (formData.step === 3) {
      goToStep(2);
    } else if (formData.step === 4) {
      goToStep(3);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. OTP Verification (MSG91)
  // ─────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length !== 10) {
      setFieldErrors((prev) => ({ ...prev, phone: 'Enter a valid 10-digit mobile number' }));
      return;
    }
    setOtpLoading(true);
    setGlobalError('');

    const res = await sendMobileOtp(formData.phone);
    setOtpLoading(false);

    if (res.ok) {
      setFormData((prev) => ({
        ...prev,
        otpSent: true,
        devOtpHint: res.data?.devOtp ? String(res.data.devOtp) : '123456',
      }));
      setTimerSeconds(60);
    } else {
      setGlobalError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp || formData.otp.trim().length < 4) {
      setFieldErrors((prev) => ({ ...prev, otp: 'Please enter the OTP sent to your phone' }));
      return;
    }
    setOtpLoading(true);
    setGlobalError('');

    const res = await verifyMobileOtp(formData.phone, formData.otp.trim());
    setOtpLoading(false);

    if (res.ok) {
      setFormData((prev) => ({ ...prev, otpVerified: true }));
      setFieldErrors((prev) => ({ ...prev, otp: '' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, otp: res.error || 'Invalid or expired OTP. You can use 123456 for testing.' }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Step 2 Validation & Account Provisioning
  // ─────────────────────────────────────────────────────────────
  const validateStep2 = () => {
    const errs = {};
    const isFarmer = formData.accountType === 'farmer';

    if (isFarmer) {
      if (!formData.name.trim()) errs.name = 'Full name is mandatory';
      else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    } else {
      // Business
      if (!formData.businessName.trim()) errs.businessName = 'Business name is mandatory';
      if (!formData.contactPerson.trim()) errs.contactPerson = 'Contact person name is mandatory';
      if (!formData.email.trim()) errs.email = 'Email address is mandatory';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Please enter a valid business email address';
      }
    }

    if (!formData.phone || formData.phone.length !== 10) {
      errs.phone = 'Mandatory 10-digit mobile number required';
    }

    if (!formData.otpVerified) {
      errs.otp = 'Please verify your mobile number with OTP before continuing';
    }

    if (!formData.password) {
      errs.password = 'Password is mandatory';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep2Submit = async (e) => {
    e?.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setGlobalError('');

    // If not already authenticated as this user, provision or authenticate the account
    if (!isAuthenticated) {
      const regPayload = {
        name: formData.accountType === 'farmer' ? formData.name.trim() : formData.businessName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.accountType === 'farmer' ? 'FARMER' : 'BUSINESS',
        contactPersonName: formData.accountType === 'business' ? formData.contactPerson.trim() : undefined,
        organizationName: formData.accountType === 'business' ? formData.businessName.trim() : undefined,
      };

      const res = await authRegister(regPayload);
      setLoading(false);

      if (!res.ok) {
        setGlobalError(res.error || 'Failed to create account. Please check your mobile or email.');
        return;
      }
    } else {
      setLoading(false);
    }

    goToStep(3);
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Step 3: Location Details & Current GPS
  // ─────────────────────────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGlobalError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGlobalError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          gpsAccuracy: acc,
          gpsStatus: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E (±${acc}m accuracy)`,
        }));

        // Attempt reverse geocoding via OpenStreetMap Nominatim
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            const addr = data.address || {};

            // Auto-fill state if found in list
            if (addr.state) {
              const matchedState = INDIAN_STATES.find(
                (s) => s.toLowerCase() === addr.state.toLowerCase()
              );
              if (matchedState) {
                setFormData((prev) => {
                  const dists = getDistricts(matchedState);
                  const matchedDistrict = dists.find((d) =>
                    [addr.state_district, addr.county, addr.city, addr.district]
                      .filter(Boolean)
                      .some((raw) => d.toLowerCase() === raw.toLowerCase())
                  );
                  return {
                    ...prev,
                    state: matchedState,
                    district: matchedDistrict || prev.district,
                    pincode: addr.postcode && addr.postcode.length === 6 ? addr.postcode : prev.pincode,
                    village: addr.village || addr.suburb || addr.neighbourhood || prev.village,
                    tehsil: addr.county || addr.subdistrict || prev.tehsil,
                  };
                });
              }
            }
          }
        } catch {}

        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGlobalError('Could not access current location. Please fill details manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const validateStep3 = () => {
    const errs = {};
    if (!formData.state) errs.state = 'Please select your State';
    if (!formData.district) errs.district = 'Please select your District';
    if (!formData.tehsil.trim()) errs.tehsil = 'Tehsil / Taluka is mandatory';
    if (!formData.village.trim()) errs.village = 'Village name is mandatory';
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) {
      errs.pincode = 'Mandatory 6-digit PIN code required';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep3Submit = async (e) => {
    e?.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    // Sync location with backend user profile
    const locationStr = `${formData.village.trim()}, ${formData.tehsil.trim()}, ${formData.district}, ${formData.state} - ${formData.pincode.trim()}`;
    await updateProfile({
      location: locationStr,
      state: formData.state,
      district: formData.district,
      tehsil: formData.tehsil.trim(),
      village: formData.village.trim(),
      pincode: formData.pincode.trim(),
      latitude: formData.latitude,
      longitude: formData.longitude,
    });
    setLoading(false);

    goToStep(4);
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Automatic IFSC Lookup
  // ─────────────────────────────────────────────────────────────
  const handleIfscChange = async (val) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    update('bankIfscCode', cleaned);
    setIfscError('');

    if (cleaned.length === 11) {
      setIfscLoading(true);
      const res = await lookupIfsc(cleaned);
      setIfscLoading(false);
      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          bankIfscCode: cleaned,
          bankName: res.bank || '',
          bankBranchName: res.branch || '',
        }));
      } else {
        setIfscError(res.error || 'Invalid IFSC code or branch not found');
        setFormData((prev) => ({ ...prev, bankName: '', bankBranchName: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, bankName: '', bankBranchName: '' }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Document Upload Helper
  // ─────────────────────────────────────────────────────────────
  const handleDocumentFileSelect = async (file, docType, slotKey) => {
    if (!file) return;

    if (!isUserAuthenticated) {
      setGlobalError('Authentication required. Please complete your account registration in Step 2 or sign in before uploading verification documents.');
      return;
    }

    setUploadingSlot(slotKey);
    setGlobalError('');

    const res = await uploadDocument(file, docType);
    setUploadingSlot(null);

    if (res.ok && res.data?.data) {
      update(slotKey, res.data.data);
    } else {
      setGlobalError(res.error || 'Document upload failed. Ensure file is under 5MB (PDF or JPG/PNG).');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Step 4 Validation & Final KYC Submission
  // ─────────────────────────────────────────────────────────────
  const validateStep4 = () => {
    const errs = {};
    const isFarmer = formData.accountType === 'farmer';

    if (isFarmer) {
      // Aadhaar
      const cleanAadhaar = formData.aadhaarNumber.replace(/\D/g, '');
      if (!cleanAadhaar || cleanAadhaar.length !== 12) {
        errs.aadhaarNumber = 'Mandatory 12-digit Aadhaar number required';
      }
      if (!formData.aadhaarDoc) {
        errs.aadhaarDoc = 'Aadhaar card document/photo is mandatory';
      }
      // Land proof
      if (!formData.landProofDoc) {
        errs.landProofDoc = 'Land / Cultivation proof document is mandatory';
      }
      // Bank details
      if (!formData.bankAccountNumber.trim() || formData.bankAccountNumber.trim().length < 8) {
        errs.bankAccountNumber = 'Valid Bank Account Number is mandatory';
      }
      if (!formData.bankIfscCode || formData.bankIfscCode.length !== 11) {
        errs.bankIfscCode = 'Valid 11-character IFSC code is mandatory';
      }
      if (!formData.bankBranchName) {
        errs.bankIfscCode = 'Valid IFSC required to auto-fetch branch name';
      }
      if (!formData.bankPassbookDoc) {
        errs.bankPassbookDoc = 'Bank Passbook / Cancelled Cheque upload is mandatory';
      }
      if (!formData.farmerAgreeTerms) {
        errs.farmerAgreeTerms = 'You must agree to the Terms & Conditions and Privacy Policy';
      }
    } else {
      // Business KYC
      const cleanGst = formData.gstin.trim().toUpperCase();
      if (!cleanGst || cleanGst.length < 15) {
        errs.gstin = 'Valid 15-character GSTIN number is mandatory';
      }
      if (!formData.gstCertDoc) {
        errs.gstCertDoc = 'GST Certificate upload is mandatory';
      }
      if (!formData.businessProofDoc) {
        errs.businessProofDoc = 'Business Registration / Company Proof document is mandatory';
      }
      const cleanPan = formData.panNumber.trim().toUpperCase();
      if (!cleanPan || cleanPan.length !== 10) {
        errs.panNumber = 'Valid 10-character PAN / Business PAN is mandatory';
      }
      if (!formData.panCardDoc) {
        errs.panCardDoc = 'PAN Card document upload is mandatory';
      }
      if (!formData.businessAgreeTerms) {
        errs.businessAgreeTerms = 'You must agree to the Terms & Conditions and Privacy Policy';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFinalSubmit = async () => {
    if (!validateStep4()) return;
    setLoading(true);
    setGlobalError('');

    const isFarmer = formData.accountType === 'farmer';

    if (isFarmer) {
      const payload = {
        aadhaarNumber: formData.aadhaarNumber.replace(/\D/g, ''),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        bankIfscCode: formData.bankIfscCode.trim(),
        bankName: formData.bankName,
        bankBranchName: formData.bankBranchName,
        state: formData.state,
        district: formData.district,
        tehsil: formData.tehsil,
        village: formData.village,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };
      const res = await saveFarmerProfile(payload);
      setLoading(false);
      if (res.ok) {
        goToStep(5);
      } else {
        setGlobalError(res.error || 'Failed to submit Farmer KYC application');
      }
    } else {
      const payload = {
        officialName: formData.businessName.trim(),
        authorizedPerson: formData.contactPerson.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        state: formData.state,
        district: formData.district,
        tehsil: formData.tehsil,
        village: formData.village,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };
      const res = await saveBusinessProfile(payload);
      setLoading(false);
      if (res.ok) {
        goToStep(5);
      } else {
        setGlobalError(res.error || 'Failed to submit Business KYC application');
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Document Upload Slot Component
  // ─────────────────────────────────────────────────────────────
  const DocumentSlot = ({ label, slotKey, docType, mandatory = true, existingDoc }) => {
    const fileRef = useRef(null);
    const isUploading = uploadingSlot === slotKey;
    const hasError = fieldErrors[slotKey];

    return (
      <div className={`p-4 rounded-2xl border transition-all ${
        hasError
          ? 'border-red-300 bg-red-50/40'
          : existingDoc
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-semibold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
              {label}
              {mandatory ? (
                <span className="text-red-500 font-bold">*</span>
              ) : (
                <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              )}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">PDF, JPG, PNG or WebP up to 5MB</p>
          </div>

          {existingDoc && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <Check className="w-3 h-3" /> Uploaded
            </span>
          )}
        </div>

        {existingDoc ? (
          <div className="mt-3 flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-100 text-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate font-medium text-gray-700">{existingDoc.originalFilename || 'Document Uploaded'}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {existingDoc.cloudinaryUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc({
                    isOpen: true,
                    title: label,
                    url: existingDoc.cloudinaryUrl,
                    mimeType: existingDoc.mimeType,
                  })}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                >
                  Preview
                </button>
              )}
              <button
                type="button"
                onClick={() => update(slotKey, null)}
                className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition"
                title="Remove and replace"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <input
              type="file"
              ref={fileRef}
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleDocumentFileSelect(e.target.files[0], docType, slotKey);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
              className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:border-mustard-400 hover:bg-mustard-50/40 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-mustard-600" />
                  Uploading securely to cloud...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  Select & Upload {label}
                </>
              )}
            </button>
          </div>
        )}

        {hasError && <p className="text-[11px] text-red-500 mt-1.5">{hasError}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Top Header & Logo */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center"><M2MLogo /></Link>
          <Link to="/login" className="text-xs font-semibold text-navy-700 hover:underline">
            Already registered? Sign In
          </Link>
        </div>

        {/* Wizard Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md">
          {/* Header Navigation / Step Title */}
          {formData.step < 5 && (
            <div className="mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition py-1 px-2.5 rounded-lg hover:bg-gray-100"
                >
                  {formData.step === 1 
                    ? <><ArrowLeft className="w-4 h-4" /> Back to Account Type</> 
                    : <><ArrowLeft className="w-4 h-4" /> Back</>}
                </button>
                <span className="text-xs font-bold text-mustard-700 bg-mustard-50 px-3 py-1 rounded-full">
                  Step {formData.step} of 4
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex gap-1.5 mt-3">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      s <= formData.step ? 'bg-mustard-500' : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global Alert Notification */}
          {globalError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl mb-6 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Unauthenticated Session Guard Banner for Steps 3 and 4 */}
          {!isUserAuthenticated && formData.step >= 3 && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 mb-6 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">Active Session Required for KYC & Verification</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    You need an authenticated account to save location details and upload government verification documents. Please complete your registration at Step 2 or sign in if your account is already created.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Go to Step 2 (Create Account)
                </button>
                <Link
                  to="/login"
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 rounded-xl text-xs font-semibold transition shadow-2xs"
                >
                  Sign In to Existing Account
                </Link>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 1: Account Type Selection
              ═══════════════════════════════════════════════════════════════ */}
          {formData.step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Select Account Type</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Choose how you will participate in the <span className="font-semibold text-navy-900 notranslate" translate="no">Mitti2Market</span> agricultural network
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Farmer Option */}
                <button
                  type="button"
                  onClick={() => {
                    update('accountType', 'farmer');
                    goToStep(2);
                  }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group hover:shadow-md ${
                    formData.accountType === 'farmer'
                      ? 'border-mustard-500 bg-mustard-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-mustard-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="text-4xl block mb-3">👨‍🌾</span>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Farmer</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Sell harvests directly to verified institutional buyers, get daily mandi price intelligence, and secure payment locks.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs font-bold text-navy-900 group-hover:text-mustard-700">
                    <span>Register as Farmer</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Business / Buyer Option */}
                <button
                  type="button"
                  onClick={() => {
                    update('accountType', 'business');
                    goToStep(2);
                  }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group hover:shadow-md ${
                    formData.accountType === 'business'
                      ? 'border-mustard-500 bg-mustard-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-mustard-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="text-4xl block mb-3">🏪</span>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Business / Buyer</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Source quality-checked crops directly from verified farms across Indian states with verified GST invoices and logistics.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs font-bold text-navy-900 group-hover:text-mustard-700">
                    <span>Register as Business</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 2: Basic Details + MSG91 Mobile OTP
              ═══════════════════════════════════════════════════════════════ */}
          {formData.step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {formData.accountType === 'farmer' ? 'Farmer Basic Details' : 'Business Basic Details'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verify your mobile number and set account credentials
                </p>
              </div>

              {/* Farmer specific: Full Name */}
              {formData.accountType === 'farmer' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                        fieldErrors.name ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
              ) : (
                /* Business specific: Business Name + Contact Person */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => update('businessName', e.target.value)}
                        placeholder="e.g. Bharat Agro Foods Pvt Ltd"
                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                          fieldErrors.businessName ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {fieldErrors.businessName && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.businessName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) => update('contactPerson', e.target.value)}
                        placeholder="e.g. Amit Sharma"
                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                          fieldErrors.contactPerson ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {fieldErrors.contactPerson && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.contactPerson}</p>}
                  </div>
                </div>
              )}

              {/* Mobile Number + MSG91 OTP Verification Box */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-500">+91</span>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="9876543210"
                        maxLength={10}
                        className={`w-full pl-12 pr-4 py-2.5 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                          fieldErrors.phone ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {!formData.otpVerified && (
                      <button
                        type="button"
                        disabled={otpLoading || timerSeconds > 0 || formData.phone.length !== 10}
                        onClick={handleSendOtp}
                        className="px-4 py-2.5 bg-navy-900 text-white font-semibold rounded-xl text-xs hover:bg-navy-800 disabled:opacity-50 transition shrink-0 flex items-center gap-1.5"
                      >
                        {otpLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : timerSeconds > 0 ? (
                          `Resend (${timerSeconds}s)`
                        ) : formData.otpSent ? (
                          'Resend OTP'
                        ) : (
                          'Send OTP'
                        )}
                      </button>
                    )}
                  </div>
                  {fieldErrors.phone && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.phone}</p>}
                </div>

                {/* OTP Input & Verification Row */}
                {formData.otpSent && !formData.otpVerified && (
                  <div className="pt-2 border-t border-gray-200/80 animate-in fade-in space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-gray-700">Enter MSG91 OTP</label>
                      {formData.devOtpHint && (
                        <span className="text-[11px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded">
                          Dev OTP: {formData.devOtpHint}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => update('otp', e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code (or 123456)"
                        className={`flex-1 px-4 py-2 bg-white border rounded-xl text-xs tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                          fieldErrors.otp ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={otpLoading || !formData.otp}
                        onClick={handleVerifyOtp}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5"
                      >
                        {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify OTP'}
                      </button>
                    </div>
                    {fieldErrors.otp && <p className="text-[11px] text-red-500">{fieldErrors.otp}</p>}
                  </div>
                )}

                {/* Verified Indicator Badge */}
                {formData.otpVerified && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mobile number verified</span>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address {formData.accountType === 'farmer' ? <span className="text-gray-400 font-normal">(Optional)</span> : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="user@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                      fieldErrors.email ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                </div>
                {fieldErrors.email && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                        fieldErrors.password ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                        fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>

              {/* Continue button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading || !formData.otpVerified}
                  className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl text-xs hover:bg-navy-800 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Provisioning account...
                    </>
                  ) : (
                    <>
                      Proceed to Location Details <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                {!formData.otpVerified && (
                  <p className="text-[11px] text-center text-amber-700 mt-2 font-medium">
                    ⚠️ Verify mobile number with OTP above to unlock the next step
                  </p>
                )}
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 3: Location Details (Common)
              ═══════════════════════════════════════════════════════════════ */}
          {formData.step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Location Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select your Indian state and district, and enter village/taluka details
                </p>
              </div>

              {/* Country Locked to India */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-not-allowed">
                  <span className="text-lg">🇮🇳</span>
                  <span>India</span>
                  <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                    Only Available Country
                  </span>
                </div>
              </div>

              {/* State & District Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* State Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => {
                      update('state', e.target.value);
                      update('district', ''); // Reset dependent district
                    }}
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                      fieldErrors.state ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.state && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.state}</p>}
                </div>

                {/* District Dependent Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.district}
                    disabled={!formData.state}
                    onChange={(e) => update('district', e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 disabled:bg-gray-100 disabled:text-gray-400 ${
                      fieldErrors.district ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    <option value="">{formData.state ? 'Select District' : 'Select state first'}</option>
                    {getDistricts(formData.state).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.district && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.district}</p>}
                </div>
              </div>

              {/* Manual Location Details: Tehsil, Village, PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tehsil / Taluka <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tehsil}
                    onChange={(e) => update('tehsil', e.target.value)}
                    placeholder="e.g. Barasat"
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                      fieldErrors.tehsil ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {fieldErrors.tehsil && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.tehsil}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Village <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => update('village', e.target.value)}
                    placeholder="e.g. Rampur"
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                      fieldErrors.village ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {fieldErrors.village && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.village}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    6-digit PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => update('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="700001"
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-mustard-400 ${
                      fieldErrors.pincode ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {fieldErrors.pincode && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.pincode}</p>}
                </div>
              </div>

              {/* Use Current Location Button & GPS Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-600" /> Device Geolocation
                    </span>
                    <p className="text-[11px] text-gray-500">Capture exact farm/business GPS coordinates</p>
                  </div>
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={handleUseCurrentLocation}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shrink-0 flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {geoLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5" /> Use Current Location
                      </>
                    )}
                  </button>
                </div>

                {formData.gpsStatus && (
                  <div className="p-2.5 bg-emerald-100/60 border border-emerald-300/60 rounded-xl text-xs text-emerald-900 font-mono flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>📍 GPS Captured: {formData.gpsStatus}</span>
                  </div>
                )}
              </div>

              {/* Proceed to KYC button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl text-xs hover:bg-navy-800 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Proceed to {formData.accountType === 'farmer' ? 'Farmer KYC' : 'Business KYC'} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 4: KYC Verification (Role-specific)
              ═══════════════════════════════════════════════════════════════ */}
          {formData.step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {formData.accountType === 'farmer' ? 'Farmer KYC Verification' : 'Business KYC Verification'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload mandatory identity and verification documents for admin review
                </p>
              </div>

              {/* ────────────────── FARMER KYC ────────────────── */}
              {formData.accountType === 'farmer' ? (
                <div className="space-y-5">
                  {/* 1. Aadhaar Verification */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Aadhaar Verification
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        12-digit Aadhaar Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.aadhaarNumber}
                        onChange={(e) => update('aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                        placeholder="123456789012"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs tracking-widest font-mono ${
                          fieldErrors.aadhaarNumber ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {fieldErrors.aadhaarNumber && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.aadhaarNumber}</p>}
                    </div>

                    <DocumentSlot
                      label="Aadhaar Card Document / Photo"
                      slotKey="aadhaarDoc"
                      docType="AADHAAR_CARD"
                      mandatory={true}
                      existingDoc={formData.aadhaarDoc}
                    />
                  </div>

                  {/* 2. Farmer Identification (Optional) */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <DocumentSlot
                      label="Farmer ID (e.g. Kisan Credit Card / PM-Kisan ID)"
                      slotKey="farmerIdDoc"
                      docType="FARMER_ID"
                      mandatory={false}
                      existingDoc={formData.farmerIdDoc}
                    />
                  </div>

                  {/* 3. Land Verification */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <DocumentSlot
                      label="Land / Cultivation Proof Document"
                      slotKey="landProofDoc"
                      docType="LAND_CULTIVATION_PROOF"
                      mandatory={true}
                      existingDoc={formData.landProofDoc}
                    />
                  </div>

                  {/* 4. Bank Details with Automatic IFSC Lookup & Passbook Upload */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Bank Account Details
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={(e) => update('bankAccountNumber', e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter full bank account number"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-mono ${
                          fieldErrors.bankAccountNumber ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {fieldErrors.bankAccountNumber && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.bankAccountNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Bank IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={11}
                          value={formData.bankIfscCode}
                          onChange={(e) => handleIfscChange(e.target.value)}
                          placeholder="e.g. SBIN0000001"
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-mono uppercase tracking-widest ${
                            fieldErrors.bankIfscCode || ifscError ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                        {ifscLoading && (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3 top-3" />
                        )}
                      </div>
                      {ifscError && <p className="text-[11px] text-red-500 mt-1">{ifscError}</p>}
                      {fieldErrors.bankIfscCode && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.bankIfscCode}</p>}
                    </div>

                    {/* Auto-retrieved Bank Name and Branch Name */}
                    {formData.bankName && formData.bankBranchName && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Bank & Branch Verified
                        </div>
                        <p className="text-gray-700">
                          <strong>Bank Name:</strong> {formData.bankName}
                        </p>
                        <p className="text-gray-700">
                          <strong>Branch Name:</strong> {formData.bankBranchName}
                        </p>
                      </div>
                    )}

                    {/* Integrated Bank Passbook Upload Slot */}
                    <DocumentSlot
                      label="Bank Passbook / Cancelled Cheque"
                      slotKey="bankPassbookDoc"
                      docType="BANK_PASSBOOK"
                      mandatory={true}
                      existingDoc={formData.bankPassbookDoc}
                    />
                  </div>

                  {/* 5. Terms & Conditions Agreement */}
                  <div className="pt-2">
                    <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl transition ${
                      fieldErrors.farmerAgreeTerms
                        ? 'bg-red-50 border-2 border-red-300'
                        : 'bg-amber-50/50 border border-amber-200/80 hover:border-amber-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.farmerAgreeTerms}
                        onChange={(e) => update('farmerAgreeTerms', e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-navy-900 rounded border-gray-300 focus:ring-mustard-400"
                      />
                      <span className="text-xs text-gray-700 leading-relaxed">
                        I have read, understood, and agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTermsModalRole('farmer');
                            setTermsModalOpen(true);
                          }}
                          className="font-bold text-navy-900 underline hover:text-mustard-700 inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-mustard-600 inline" />
                          Terms & Conditions
                        </button>
                        , Code of Conduct, Document Verification Policies, and Privacy Policy. I confirm all submitted documents and bank details are authentic.
                        <span className="text-red-500 font-bold ml-1">*</span>
                      </span>
                    </label>
                    {fieldErrors.farmerAgreeTerms && (
                      <p className="text-[11px] text-red-500 mt-1 px-1 font-semibold">{fieldErrors.farmerAgreeTerms}</p>
                    )}
                  </div>
                </div>
              ) : (
                /* ────────────────── BUSINESS KYC ────────────────── */
                <div className="space-y-5">
                  {/* 1. GST Verification */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" /> GST Verification
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        GSTIN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={formData.gstin}
                        onChange={(e) => update('gstin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="e.g. 19AAAAA0000A1Z5"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs tracking-widest font-mono uppercase ${
                          fieldErrors.gstin ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {fieldErrors.gstin && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.gstin}</p>}
                    </div>

                    <DocumentSlot
                      label="GST Certificate Document"
                      slotKey="gstCertDoc"
                      docType="GST_CERTIFICATE"
                      mandatory={true}
                      existingDoc={formData.gstCertDoc}
                    />
                  </div>

                  {/* 2. Business Registration */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <DocumentSlot
                      label="Business Registration / Company Proof Document"
                      slotKey="businessProofDoc"
                      docType="BUSINESS_REGISTRATION"
                      mandatory={true}
                      existingDoc={formData.businessProofDoc}
                    />
                  </div>

                  {/* 3. PAN Verification */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> PAN Verification
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        PAN / Business PAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.panNumber}
                        onChange={(e) => update('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="e.g. ABCDE1234F"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs tracking-widest font-mono uppercase ${
                          fieldErrors.panNumber ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {fieldErrors.panNumber && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.panNumber}</p>}
                    </div>

                    <DocumentSlot
                      label="PAN Card Document"
                      slotKey="panCardDoc"
                      docType="PAN_CARD"
                      mandatory={true}
                      existingDoc={formData.panCardDoc}
                    />
                  </div>

                  {/* 4. Terms & Conditions Agreement */}
                  <div className="pt-2">
                    <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl transition ${
                      fieldErrors.businessAgreeTerms
                        ? 'bg-red-50 border-2 border-red-300'
                        : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.businessAgreeTerms}
                        onChange={(e) => update('businessAgreeTerms', e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-navy-900 rounded border-gray-300 focus:ring-mustard-400"
                      />
                      <span className="text-xs text-gray-700 leading-relaxed">
                        I have read, understood, and agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTermsModalRole('business');
                            setTermsModalOpen(true);
                          }}
                          className="font-bold text-navy-900 underline hover:text-navy-700 inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-navy-800 inline" />
                          Terms & Conditions
                        </button>
                        , Procurement Code of Conduct, Document Verification Requirements, and Privacy Policy. I confirm our enterprise credentials are valid.
                        <span className="text-red-500 font-bold ml-1">*</span>
                      </span>
                    </label>
                    {fieldErrors.businessAgreeTerms && (
                      <p className="text-[11px] text-red-500 mt-1 px-1 font-semibold">{fieldErrors.businessAgreeTerms}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Final Submit Button */}
              <div className="pt-4">
                <button
                  type="button"
                  disabled={
                    loading ||
                    (formData.accountType === 'farmer' ? !formData.farmerAgreeTerms : !formData.businessAgreeTerms)
                  }
                  onClick={handleFinalSubmit}
                  className="w-full py-4 bg-navy-900 text-white font-bold rounded-2xl text-xs sm:text-sm hover:bg-navy-800 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting for Admin Verification...
                    </>
                  ) : (
                    <>
                      Submit for Verification <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 5: Confirmation — "Under Admin Verification"
              ═══════════════════════════════════════════════════════════════ */}
          {formData.step === 5 && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                ⏳
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs">
                  Under Admin Verification
                </span>
                <h1 className="text-2xl font-bold text-gray-900">Application Submitted for Verification</h1>
                <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Your registration and KYC documents have been submitted successfully.
                  Our compliance admin team is currently reviewing your application credentials.
                </p>
              </div>

              {/* Summary of submitted info */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left text-xs space-y-3 max-w-lg mx-auto">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider border-b pb-2">
                  Application Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-800">Account Type:</span>{' '}
                    {formData.accountType === 'farmer' ? 'Farmer' : 'Business / Buyer'}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Applicant:</span>{' '}
                    {formData.accountType === 'farmer' ? formData.name : formData.businessName}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Mobile:</span> +91 {formData.phone}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Location:</span> {formData.district}, {formData.state}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Country:</span> India 🇮🇳
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Status:</span>{' '}
                    <span className="font-bold text-amber-700">Pending Review</span>
                  </p>
                </div>
              </div>

              {/* Next Steps Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-lg mx-auto text-xs text-emerald-900 space-y-1 text-left">
                <p className="font-bold">What happens next?</p>
                <p className="text-emerald-800 leading-relaxed">
                  1. An admin will verify your identity, location, and submitted proof documents.
                </p>
                <p className="text-emerald-800 leading-relaxed">
                  2. If any document is unclear or expired, a document re-upload request will be issued with notes.
                </p>
                <p className="text-emerald-800 leading-relaxed">
                  3. Once approved, you can start listing produce or placing wholesale deal orders!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
                    navigate(formData.accountType === 'farmer' ? '/farmer' : '/business', { replace: true });
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-navy-900 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition"
                >
                  Go to Dashboard
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Modal Preview */}
      <DocumentModalPreview
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc((prev) => ({ ...prev, isOpen: false }))}
        docTitle={previewDoc.title}
        docUrl={previewDoc.url}
        mimeType={previewDoc.mimeType}
      />

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        role={termsModalRole}
        onAccept={handleAcceptTermsFromModal}
      />
    </div>
  );
}