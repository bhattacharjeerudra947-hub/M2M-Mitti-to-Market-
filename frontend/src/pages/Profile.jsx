import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Star, Shield, Edit3, Save, X, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await api.getProfile();
      if (result.ok) {
        const data = result.data?.user || result.data || user;
        setProfileData(data);
        setForm({ name: data?.name || '', phone: data?.phone || '', location: data?.location || '' });
      } else {
        setProfileData(user);
        setForm({ name: user?.name || '', phone: user?.phone || '', location: user?.location || '' });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    const result = await api.updateProfile(form);
    setSaving(false);

    if (result.ok) {
      setProfileData(result.data.user || { ...profileData, ...form });
      refreshUser(result.data.user || { ...profileData, ...form });
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

  return (
    <div className="min-h-screen bg-mustard-50/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={dashboardPath} className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-mustard-400/20 rounded-2xl flex items-center justify-center text-3xl">
                {role === 'farmer' ? '👨‍🌾' : '🏪'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{profileData?.name || 'User'}</h1>
                <p className="text-sm text-navy-300 capitalize">{role} Account</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
            {success && <div className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl mb-4"><CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" /><p className="text-sm text-primary-700">{success}</p></div>}

            {/* Profile fields */}
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

              {/* Email (read-only) */}
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

              {/* Role (read-only) */}
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
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
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
        </div>
      </div>
    </div>
  );
}
