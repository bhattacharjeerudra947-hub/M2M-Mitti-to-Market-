import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Star, Shield, Edit3, Save, X, Loader2, AlertCircle, CheckCircle2, ArrowLeft, FileText, Camera, Clock, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import DocumentUpload from '../components/DocumentUpload';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  VERIFIED: 'bg-green-50 border-green-200 text-green-800',
  REJECTED: 'bg-red-50 border-red-200 text-red-800',
};

const STATUS_LABELS = {
  PENDING: '⏳ Pending',
  VERIFIED: '✅ Verified',
  REJECTED: '❌ Rejected',
};

const DOC_TYPE_LABELS = {
  PROFILE_PHOTO: '📷 Profile Photo',
  AADHAAR_CARD: '🪪 Aadhaar Card',
  IDENTITY_DOC: '📄 Identity Document',
  BUSINESS_REGISTRATION: '📋 Business Registration',
  GST_CERTIFICATE: '📜 GST Certificate',
  PAN_CARD: '💳 PAN Card',
  GOVERNMENT_AUTHORIZATION: '🏛️ Gov Authorization',
  GOVERNMENT_ID: '🪪 Government ID',
  FPO_REGISTRATION: '🤝 FPO Registration',
  AUTHORIZATION_LETTER: '✉️ Authorization Letter',
  ADDRESS_PROOF: '📍 Address Proof',
  OTHER: '📎 Other Document',
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser, role } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', location: '' });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'documents'

  useEffect(() => {
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);

    // 1. Load user profile
    const result = await api.getProfile();
    if (result.ok) {
      const data = result.data?.user || result.data || user;
      setProfileData(data);
      setForm({ name: data?.name || '', phone: data?.phone || '', location: data?.location || '' });
    } else {
      setProfileData(user);
      setForm({ name: user?.name || '', phone: user?.phone || '', location: user?.location || '' });
    }

    // 2. Load documents
    const docsResult = await api.getMyDocuments();
    if (docsResult.ok && docsResult.data?.data) {
      const docs = docsResult.data.data;
      setDocuments(docs);
      const photo = docs.find(d => d.documentType === 'PROFILE_PHOTO' && d.verificationStatus !== 'REJECTED');
      if (photo?.cloudinaryUrl) setProfilePhotoUrl(photo.cloudinaryUrl);
    }

    // 3. Load role-specific profile
    if (role === 'farmer') {
      const fp = await api.getFarmerProfile();
      if (fp.ok && fp.data?.data) setFarmerProfile(fp.data.data);
    } else if (role === 'business') {
      const bp = await api.getBusinessProfile();
      if (bp.ok && bp.data?.data) setBusinessProfile(bp.data.data);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    const result = await api.updateProfile(form);
    setSaving(false);

    if (result.ok) {
      const updated = result.data.user || { ...profileData, ...form };
      setProfileData(updated);
      refreshUser(updated);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to update profile');
    }
  };

  const cancelEdit = () => {
    setForm({ name: profileData?.name || '', phone: profileData?.phone || '', location: profileData?.location || '' });
    setEditing(false);
    setError('');
  };

  const handleDocumentUploaded = () => {
    loadAll(); // Refresh everything
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mustard-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-800 rounded-full animate-spin" />
          <p className="text-sm text-navy-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const dashboardPath = role === 'farmer' ? '/farmer' : '/business';

  // Count documents by status
  const pendingCount = documents.filter(d => d.verificationStatus === 'PENDING').length;
  const verifiedCount = documents.filter(d => d.verificationStatus === 'VERIFIED').length;
  const rejectedCount = documents.filter(d => d.verificationStatus === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-mustard-50/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={dashboardPath} className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* ─── Header with Photo ─── */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-6">
            <div className="flex items-center gap-4">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border-2 border-mustard-400/50" />
              ) : (
                <div className="w-16 h-16 bg-mustard-400/20 rounded-2xl flex items-center justify-center text-3xl">
                  {role === 'farmer' ? '👨‍🌾' : '🏪'}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{profileData?.name || 'User'}</h1>
                <p className="text-sm text-navy-300 capitalize">{role} Account</p>
              </div>
              {profileData?.verified ? (
                <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-semibold text-green-300">Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-300">Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'info' ? 'text-navy-900 border-b-2 border-navy-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Personal Info
            </button>
            <button onClick={() => setActiveTab('documents')}
              className={`flex-1 py-3 text-sm font-semibold transition relative ${activeTab === 'documents' ? 'text-navy-900 border-b-2 border-navy-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Documents
              {pendingCount > 0 && (
                <span className="absolute top-2 ml-1 w-5 h-5 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </button>
          </div>

          <div className="p-6">
            {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
            {success && <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><p className="text-sm text-green-700">{success}</p></div>}

            {/* ═══ Tab: Personal Info ═══ */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Name</label>
                  {editing ? (
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition" /></div>
                  ) : (
                    <p className="text-sm text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{profileData?.name || '—'}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Email</label>
                  <p className="text-sm text-gray-900 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{profileData?.email || '—'}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Phone</label>
                  {editing ? (
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition" /></div>
                  ) : (
                    <p className="text-sm text-gray-900 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{profileData?.phone || '—'}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Location</label>
                  {editing ? (
                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 transition" /></div>
                  ) : (
                    <p className="text-sm text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{profileData?.location || '—'}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Account Type</label>
                  <p className="text-sm text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4 text-gray-400" /><span className="capitalize">{role}</span></p>
                </div>

                {/* Rating */}
                {profileData?.rating > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5">Rating</label>
                    <p className="text-sm text-gray-900 flex items-center gap-2"><Star className="w-4 h-4 text-mustard-500" />{profileData.rating}</p>
                  </div>
                )}

                {/* Farmer-specific info */}
                {role === 'farmer' && farmerProfile && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Farm Details</h3>
                    <div className="space-y-2 text-sm">
                      {farmerProfile.farmerCategory && <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{farmerProfile.farmerCategory.replace('_', ' ')}</span></div>}
                      {farmerProfile.farmingSeason && <div className="flex justify-between"><span className="text-gray-500">Season</span><span className="font-medium">{farmerProfile.farmingSeason}</span></div>}
                      {farmerProfile.crops && <div><span className="text-gray-500">Crops</span><div className="flex flex-wrap gap-1 mt-1">{farmerProfile.crops.split(',').map(c => <span key={c} className="px-2 py-0.5 bg-mustard-50 rounded-full text-xs font-medium border border-mustard-200">{c}</span>)}</div></div>}
                      {farmerProfile.landAreaAcres && <div className="flex justify-between"><span className="text-gray-500">Land</span><span className="font-medium">{farmerProfile.landAreaAcres} acres</span></div>}
                    </div>
                  </div>
                )}

                {/* Business-specific info */}
                {role === 'business' && businessProfile && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Business Details</h3>
                    <div className="space-y-2 text-sm">
                      {businessProfile.businessType && <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{businessProfile.businessType.replace('_', ' ')}</span></div>}
                      {businessProfile.officialName && <div className="flex justify-between"><span className="text-gray-500">Organization</span><span className="font-medium">{businessProfile.officialName}</span></div>}
                      {businessProfile.gstin && <div className="flex justify-between"><span className="text-gray-500">GSTIN</span><span className="font-medium font-mono">{businessProfile.gstin}</span></div>}
                    </div>
                  </div>
                )}

                {/* Edit buttons */}
                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  {editing ? (
                    <>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                      </button>
                      <button onClick={cancelEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Tab: Documents ═══ */}
            {activeTab === 'documents' && (
              <div className="space-y-5">
                {/* Document summary */}
                {(verifiedCount > 0 || rejectedCount > 0) && (
                  <div className="flex gap-2">
                    {verifiedCount > 0 && <span className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg">✅ {verifiedCount} verified</span>}
                    {pendingCount > 0 && <span className="px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold rounded-lg">⏳ {pendingCount} pending</span>}
                    {rejectedCount > 0 && <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">❌ {rejectedCount} rejected</span>}
                  </div>
                )}

                {/* Upload new profile photo */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Profile Photo</h3>
                  <DocumentUpload documentType="PROFILE_PHOTO" label="Upload / Replace Photo" isPhoto={true} onUploadComplete={handleDocumentUploaded} />
                </div>

                {/* Upload role-specific documents */}
                {role === 'farmer' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Identity Document</h3>
                    <DocumentUpload documentType="AADHAAR_CARD" label="Aadhaar Card" isPhoto={false} onUploadComplete={handleDocumentUploaded} />
                  </div>
                )}

                {role === 'business' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Business Documents</h3>
                    <DocumentUpload documentType="BUSINESS_REGISTRATION" label="Business Registration" isPhoto={false} onUploadComplete={handleDocumentUploaded} />
                    <DocumentUpload documentType="GST_CERTIFICATE" label="GST Certificate" isPhoto={false} onUploadComplete={handleDocumentUploaded} />
                  </div>
                )}

                {/* All uploaded documents list */}
                {documents.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Uploaded Documents</h3>
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${STATUS_COLORS[doc.verificationStatus] || STATUS_COLORS.PENDING}`}>
                          {/* Thumbnail for images */}
                          {doc.cloudinaryUrl && doc.mimeType?.startsWith('image/') ? (
                            <img src={doc.cloudinaryUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</p>
                            <p className="text-xs opacity-75">{doc.originalFilename} • {(doc.fileSize / 1024).toFixed(0)} KB</p>
                            {doc.rejectionReason && <p className="text-xs mt-0.5 font-medium">Reason: {doc.rejectionReason}</p>}
                          </div>
                          <span className="text-xs font-semibold whitespace-nowrap">{STATUS_LABELS[doc.verificationStatus]}</span>
                          {doc.cloudinaryUrl && (
                            <a href={doc.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/50 rounded transition">
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
