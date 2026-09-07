import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { getDraftsForUser, deleteDraft, retryDraft, useSyncStatus } from '../utils/syncQueue';
import { Package, Pencil, RefreshCw, Trash2, WifiOff, CheckCircle2, AlertTriangle, LogIn, CloudUpload } from 'lucide-react';

const STATUS_BADGE = {
  LOCAL: '📝 Draft',
  PENDING: '📡 Pending Sync',
  SYNCING: '🔄 Syncing...',
  SYNCED: '✅ Synced',
  FAILED: '⚠️ Sync Failed',
  NEEDS_LOGIN: '🔑 Login Required',
};

const STATUS_COLORS = {
  LOCAL: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-blue-50 text-blue-700',
  SYNCING: 'bg-indigo-50 text-indigo-700',
  SYNCED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  NEEDS_LOGIN: 'bg-amber-50 text-amber-700',
};

export default function OfflineDrafts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const status = useSyncStatus();

  const role = user?.role?.toLowerCase() === 'farmer' ? 'farmer' : 'business';

  const load = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setDrafts(await getDraftsForUser(user.id));
    } catch { setDrafts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Refresh list when global sync status changes (pending/syncing/failed counts)
  useEffect(() => { if (!status.syncing) load(); /* eslint-disable-line */ }, [status.pending, status.syncing, status.failed]);

  const handleRetry = async (id) => {
    await retryDraft(id);
    setTimeout(load, 800);
  };

  const handleDelete = async (draft) => {
    if (!window.confirm(`Delete offline draft "${draft.name || 'Untitled'}"? This cannot be undone.`)) return;
    await deleteDraft(draft.localDraftId);
    load();
  };

  const handleEdit = (draft) => {
    navigate('/farmer/add-produce', { state: { draft } });
  };

  return (
    <div className="flex min-h-screen bg-mustard-50/30">
      <Sidebar role={role} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pl-0">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-900 mb-1">Offline Drafts</h1>
            <p className="text-sm text-navy-500">
              Listings saved on this device. They sync automatically when you're back online.
            </p>
          </div>

          {/* Global sync banner */}
          {!status.online && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
              <WifiOff className="w-4 h-4 flex-shrink-0" /> You're offline. Drafts are saved locally and will sync when you reconnect.
            </div>
          )}
          {status.syncing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 flex-shrink-0 animate-pulse" /> Syncing your listings...
            </div>
          )}
          {status.failed > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {status.failed} listing{status.failed > 1 ? 's' : ''} could not be synced. Tap retry on the draft.
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading drafts...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-navy-100">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">No offline drafts</p>
              <p className="text-sm text-gray-500 mb-4">When you lose connection while listing produce, your draft is saved here.</p>
              <button onClick={() => navigate('/farmer/add-produce')}
                className="px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
                Add Produce
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((d) => (
                <div key={d.localDraftId} className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-navy-900 truncate">{d.name || 'Untitled crop'}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${STATUS_COLORS[d.syncStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_BADGE[d.syncStatus] || d.syncStatus}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {d.quantity || '—'} {d.unit || 'kg'} · ₹{d.pricePerUnit || '—'}/{d.unit || 'kg'}
                        {d.location ? ` · ${d.location}` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Saved {d.lastSavedAt ? new Date(d.lastSavedAt).toLocaleString() : ''}
                        {d.syncStatus === 'SYNCED' && d.serverProduceId ? ` · Server ID #${d.serverProduceId}` : ''}
                      </p>
                      {d.image?.name && d.imageStatus === 'PENDING_UPLOAD' && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <CloudUpload className="w-3 h-3" /> Image "{d.image.name}" will upload when online
                        </p>
                      )}
                      {d.syncStatus === 'FAILED' && d.lastError && (
                        <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {d.lastError}
                        </p>
                      )}
                      {d.syncStatus === 'NEEDS_LOGIN' && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <LogIn className="w-3 h-3 flex-shrink-0" /> Login required to sync — your draft is safe on this device.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEdit(d)} title="Edit draft"
                        className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {d.syncStatus !== 'SYNCED' && (
                        <button onClick={() => handleRetry(d.localDraftId)} title="Retry sync"
                          className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 hover:bg-blue-100 transition">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(d)} title="Delete draft"
                        className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {d.syncStatus === 'SYNCED' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Synced to the marketplace — visible to buyers.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}