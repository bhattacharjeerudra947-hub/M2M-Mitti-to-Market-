import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  getBusinessProfile,
  saveBusinessProfile,
} from '../services/api';

import DocumentUpload from '../components/DocumentUpload';
import TermsModal from '../components/TermsModal';

const CROPS = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Groundnut',
  'Soybean',
  'Tomato',
  'Onion',
  'Potato',
  'Chilli',
  'Turmeric',
  'Ginger',
  'Garlic',
  'Mango',
  'Grapes',
  'Banana',
  'Coconut',
  'Pomegranate',
  'Orange',
  'Mustard',
  'Sunflower',
  'Jowar',
  'Bajra',
  'Pulses',
  'Spices',
  'Other',
];

const ORGANIZATION_TYPES = [
  {
    value: 'PRIVATE_BUSINESS',
    label: 'Private Company',
    emoji: '🏢',
    description: 'Private business or company',
  },
  {
    value: 'GOVERNMENT',
    label: 'Government Agency',
    emoji: '🏛️',
    description: 'Government department or agency',
  },
  {
    value: 'FPO_COOPERATIVE',
    label: 'FPO / Cooperative',
    emoji: '🤝',
    description:
      'Farmer Producer Organization or cooperative',
  },
  {
    value: 'OTHER',
    label: 'Other Organization',
    emoji: '📋',
    description: 'Any other organization type',
  },
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

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // ============================================================
  // LOAD EXISTING BUSINESS PROFILE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await getBusinessProfile();

        if (!mounted) {
          return;
        }

        if (result?.ok && result?.data?.data) {
          const profile = result.data.data;

          let requiredCrops = [];

          if (profile.requiredCrops) {
            if (Array.isArray(profile.requiredCrops)) {
              requiredCrops = profile.requiredCrops
                .map((crop) => String(crop).trim())
                .filter(Boolean);
            } else {
              requiredCrops = String(profile.requiredCrops)
                .split(',')
                .map((crop) => crop.trim())
                .filter(Boolean);
            }
          }

          setForm({
            businessType: profile.businessType || '',
            officialName: profile.officialName || '',
            gstin: profile.gstin || '',
            registrationNumber:
              profile.registrationNumber || '',
            businessAddress:
              profile.businessAddress || '',
            departmentName:
              profile.departmentName || '',
            authorizedPerson:
              profile.authorizedPerson || '',
            requiredCrops,
            monthlyRequirementKg:
              profile.monthlyRequirementKg !== null &&
              profile.monthlyRequirementKg !== undefined
                ? profile.monthlyRequirementKg
                : '',
          });

          if (
            profile.latitude !== null &&
            profile.latitude !== undefined &&
            profile.longitude !== null &&
            profile.longitude !== undefined
          ) {
            setLocation({
              latitude: Number(profile.latitude),
              longitude: Number(profile.longitude),
            });
          }
        }
      } catch (err) {
        console.error(
          'Failed to load business profile:',
          err
        );

        if (mounted) {
          setError(
            'Could not load your existing business profile.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // FORM UPDATE
  // ============================================================

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // ============================================================
  // CROP SELECTION
  // ============================================================

  const toggleCrop = (crop) => {
    setForm((current) => {
      const alreadySelected =
        current.requiredCrops.includes(crop);

      return {
        ...current,
        requiredCrops: alreadySelected
          ? current.requiredCrops.filter(
              (item) => item !== crop
            )
          : [...current.requiredCrops, crop],
      };
    });
  };

  // ============================================================
  // CURRENT LOCATION
  // ============================================================

  const requestLocation = () => {
    setError('');

    if (!navigator.geolocation) {
      setError(
        'Geolocation is not supported by this browser.'
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocation({
          latitude,
          longitude,
        });

        setLocationLoading(false);
      },
      (geoError) => {
        console.error('Location error:', geoError);

        let message =
          'Could not get your current location.';

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message =
              'Location permission was denied. Please allow location access in your browser.';
            break;

          case geoError.POSITION_UNAVAILABLE:
            message =
              'Your location is currently unavailable.';
            break;

          case geoError.TIMEOUT:
            message =
              'Location request timed out. Please try again.';
            break;

          default:
            message =
              'Could not get your current location.';
        }

        setError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // ============================================================
  // VALIDATION
  // ============================================================

  const canProceed = () => {
    switch (step) {
      case 1:
        return Boolean(form.businessType);

      case 2:
        return Boolean(form.officialName.trim());

      case 3:
        return true;

      case 4:
        return true;

      case 5:
        return agreeTerms;

      default:
        return false;
    }
  };

  // ============================================================
  // NEXT
  // ============================================================

  const goNext = () => {
    setError('');

    if (!canProceed()) {
      if (step === 1) {
        setError(
          'Please select your organization type.'
        );
      }

      if (step === 2) {
        setError(
          'Please enter your organization name.'
        );
      }

      if (step === 5) {
        setError(
          'Please accept the Business Buyer Terms & Conditions before submitting.'
        );
      }

      return;
    }

    setStep((current) =>
      Math.min(current + 1, totalSteps)
    );
  };

  // ============================================================
  // BACK
  // ============================================================

  const goBack = () => {
    setError('');

    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }

    navigate(-1);
  };

  // ============================================================
  // SAVE BUSINESS PROFILE
  // ============================================================

  const handleSave = async () => {
    setError('');

    if (!agreeTerms) {
      setError(
        'Please accept the Business Buyer Terms & Conditions before submitting.'
      );
      return;
    }

    if (!form.businessType) {
      setError(
        'Please select your organization type.'
      );
      setStep(1);
      return;
    }

    if (!form.officialName.trim()) {
      setError(
        'Please enter your organization name.'
      );
      setStep(2);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        businessType: form.businessType,

        officialName:
          form.officialName.trim(),

        gstin:
          form.gstin.trim(),

        registrationNumber:
          form.registrationNumber.trim(),

        businessAddress:
          form.businessAddress.trim(),

        departmentName:
          form.departmentName.trim(),

        authorizedPerson:
          form.authorizedPerson.trim(),

        requiredCrops:
          form.requiredCrops.join(','),

        monthlyRequirementKg:
          form.monthlyRequirementKg
            ? parseInt(
                form.monthlyRequirementKg,
                10
              )
            : null,
      };

      const result =
        await saveBusinessProfile(payload);

      if (result?.ok) {
        navigate('/business', {
          replace: true,
        });
        return;
      }

      setError(
        result?.error ||
          'Failed to save business profile.'
      );
    } catch (err) {
      console.error(
        'Business profile save error:',
        err
      );

      setError(
        err?.message ||
          'Something went wrong while saving your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // STEP 1
  // ============================================================

  const renderStepOne = () => {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            What type of organization?
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Select your business category
          </p>
        </div>

        <div className="space-y-3">
          {ORGANIZATION_TYPES.map((option) => {
            const selected =
              form.businessType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  update(
                    'businessType',
                    option.value
                  )
                }
                className={`w-full p-4 rounded-xl border-2 text-left transition flex items-start gap-4 ${
                  selected
                    ? 'border-mustard-400 bg-mustard-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl shrink-0">
                  {option.emoji}
                </span>

                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {option.label}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {option.description}
                  </p>
                </div>

                {selected && (
                  <CheckCircle className="w-5 h-5 text-mustard-600 shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // STEP 2
  // ============================================================

  const renderStepTwo = () => {
    const isGovernment =
      form.businessType === 'GOVERNMENT';

    const isPrivate =
      form.businessType === 'PRIVATE_BUSINESS';

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Business Information
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Enter your organization details
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isGovernment
              ? 'Department / Agency Name'
              : 'Organization Name'}{' '}
            *
          </label>

          <input
            type="text"
            value={form.officialName}
            onChange={(event) =>
              update(
                'officialName',
                event.target.value
              )
            }
            placeholder={
              isGovernment
                ? 'e.g. Ministry of Agriculture'
                : 'e.g. Fresh Foods Pvt Ltd'
            }
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
          />
        </div>

        {isGovernment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Government Department
            </label>

            <input
              type="text"
              value={form.departmentName}
              onChange={(event) =>
                update(
                  'departmentName',
                  event.target.value
                )
              }
              placeholder="e.g. Department of Agriculture, Maharashtra"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
            />
          </div>
        )}

        {isPrivate && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                GSTIN — optional
              </label>

              <input
                type="text"
                maxLength={15}
                value={form.gstin}
                onChange={(event) =>
                  update(
                    'gstin',
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Registration Number — optional
              </label>

              <input
                type="text"
                value={form.registrationNumber}
                onChange={(event) =>
                  update(
                    'registrationNumber',
                    event.target.value
                  )
                }
                placeholder="Company registration number"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Authorized Contact Person
          </label>

          <input
            type="text"
            value={form.authorizedPerson}
            onChange={(event) =>
              update(
                'authorizedPerson',
                event.target.value
              )
            }
            placeholder="Contact person name"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // STEP 3
  // ============================================================

  const renderStepThree = () => {
    const hasLocation =
      location.latitude !== null &&
      location.longitude !== null;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Location & Requirements
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Tell farmers where and what you need
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Location
          </label>

          <button
            type="button"
            onClick={requestLocation}
            disabled={locationLoading}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center gap-3 hover:bg-gray-100 transition disabled:opacity-60"
          >
            {locationLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <MapPin className="w-4 h-4 text-gray-400" />
            )}

            <span>
              {locationLoading
                ? 'Getting location...'
                : hasLocation
                  ? `${location.latitude.toFixed(
                      4
                    )}, ${location.longitude.toFixed(4)}`
                  : 'Use My Current Location'}
            </span>
          </button>

          <input
            type="text"
            value={form.businessAddress}
            onChange={(event) =>
              update(
                'businessAddress',
                event.target.value
              )
            }
            placeholder="Or enter business address manually"
            className="mt-2 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
          />

          {hasLocation && (
            <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Current location captured
            </p>
          )}
        </div>

        {/* Crops */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Crops You're Looking For
          </label>

          <div className="flex flex-wrap gap-2">
            {CROPS.map((crop) => {
              const selected =
                form.requiredCrops.includes(crop);

              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => toggleCrop(crop)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                    selected
                      ? 'bg-mustard-500 text-white border-mustard-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-mustard-300'
                  }`}
                >
                  {crop}
                </button>
              );
            })}
          </div>
        </div>

        {/* Monthly Requirement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Monthly Requirement (kg) — optional
          </label>

          <input
            type="number"
            min="0"
            value={form.monthlyRequirementKg}
            onChange={(event) =>
              update(
                'monthlyRequirementKg',
                event.target.value
              )
            }
            placeholder="e.g. 10000"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400"
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // STEP 4
  // ============================================================

  const renderStepFour = () => {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Legal Documents
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Upload your organization verification documents
          </p>
        </div>

        {/* Private Business */}
        {form.businessType ===
          'PRIVATE_BUSINESS' && (
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

        {/* Government */}
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

        {/* FPO / Cooperative */}
        {form.businessType ===
          'FPO_COOPERATIVE' && (
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

        {/* Other */}
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

        {/* Profile Photo */}
        <DocumentUpload
          documentType="PROFILE_PHOTO"
          label="Business Logo / Profile Photo"
          isPhoto={true}
        />
      </div>
    );
  };

  // ============================================================
  // STEP 5
  // ============================================================

  const renderStepFive = () => {
    const organizationType =
      form.businessType
        ? form.businessType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) =>
              character.toUpperCase()
            )
        : '—';

    const hasLocation =
      location.latitude !== null &&
      location.longitude !== null;

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Review & Submit
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Please review your information before submitting
          </p>
        </div>

        {/* Review Card */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">
              Organization Type
            </span>

            <span className="font-medium text-right">
              {organizationType}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-500">
              Name
            </span>

            <span className="font-medium text-right">
              {form.officialName || '—'}
            </span>
          </div>

          {form.gstin && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                GSTIN
              </span>

              <span className="font-medium font-mono text-right">
                {form.gstin}
              </span>
            </div>
          )}

          {form.registrationNumber && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Registration Number
              </span>

              <span className="font-medium text-right">
                {form.registrationNumber}
              </span>
            </div>
          )}

          {form.departmentName && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Government Department
              </span>

              <span className="font-medium text-right max-w-[60%]">
                {form.departmentName}
              </span>
            </div>
          )}

          {form.authorizedPerson && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Contact Person
              </span>

              <span className="font-medium text-right">
                {form.authorizedPerson}
              </span>
            </div>
          )}

          {form.requiredCrops.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">
                Required Crops
              </span>

              <div className="flex flex-wrap gap-1">
                {form.requiredCrops.map((crop) => (
                  <span
                    key={crop}
                    className="px-2 py-0.5 bg-white rounded-full text-xs font-medium border"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {form.monthlyRequirementKg && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Monthly Requirement
              </span>

              <span className="font-medium">
                {Number(
                  form.monthlyRequirementKg
                ).toLocaleString('en-IN')}{' '}
                kg
              </span>
            </div>
          )}

          {form.businessAddress && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Address
              </span>

              <span className="font-medium text-right max-w-[60%]">
                {form.businessAddress}
              </span>
            </div>
          )}

          {hasLocation && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Location Coordinates
              </span>

              <span className="font-medium text-right">
                {location.latitude.toFixed(4)}
                {', '}
                {location.longitude.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-navy-800 shrink-0" />

              <span className="text-xs font-bold text-gray-900">
                Business Buyer Terms & Governance
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setTermsModalOpen(true)
              }
              className="px-2.5 py-1 bg-white border border-slate-300 text-navy-900 rounded-lg text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-navy-700" />

              Read Terms
            </button>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(event) =>
                setAgreeTerms(
                  event.target.checked
                )
              }
              className="mt-0.5 w-4 h-4 text-navy-900 rounded border-gray-300 focus:ring-mustard-400"
            />

            <span className="text-xs text-gray-700 leading-relaxed">
              I agree to the{' '}
              <strong className="text-navy-900">
                Business Buyer Terms & Conditions
              </strong>
              , Commercial Procurement Code,
              Statutory Verification Requirements,
              and DPDP Privacy Policy.

              <span className="text-red-500 font-bold ml-1">
                *
              </span>
            </span>
          </label>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER CURRENT STEP
  // ============================================================

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStepOne();

      case 2:
        return renderStepTwo();

      case 3:
        return renderStepThree();

      case 4:
        return renderStepFour();

      case 5:
        return renderStepFive();

      default:
        return null;
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-navy-900" />

          <p className="text-sm text-gray-500">
            Loading business profile...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={goBack}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-2xl font-bold text-gray-900">
            Business Registration
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Step {step} of {totalSteps}
          </p>

          {/* Progress */}
          <div className="flex gap-1.5 mt-4">
            {Array.from(
              { length: totalSteps },
              (_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    index < step
                      ? 'bg-mustard-500'
                      : 'bg-gray-200'
                  }`}
                />
              )
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step < totalSteps ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next

              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving || !agreeTerms
              }
              className="flex-1 py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={termsModalOpen}
        onClose={() =>
          setTermsModalOpen(false)
        }
        role="business"
        onAccept={() => {
          setAgreeTerms(true);
          setTermsModalOpen(false);
        }}
      />
    </div>
  );
}