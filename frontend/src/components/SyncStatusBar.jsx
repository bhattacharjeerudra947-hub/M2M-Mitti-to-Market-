import { useNavigate } from 'react-router-dom';
import { useSyncStatus } from '../utils/syncQueue';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react';

/**
 * Compact network + sync status bar for the sidebar.
 * States: ONLINE / OFFLINE / SYNCING / SYNC_FAILED / NEEDS_LOGIN
 */
export default function SyncStatusBar({ role = 'farmer' }) {
  const navigate = useNavigate();
  const status = useSyncStatus();
  const { online, syncing, pending, failed, offlineDrafts } = status;

  const needsLogin = offlineDrafts > 0 && !localStorage.getItem('m2m_auth');

  // Nothing to show when everything is fine
  if (online && !syncing && pending === 0 && failed === 0 && offlineDrafts === 0) return null;

  const goToDrafts = () => navigate(`/${role}/offline-drafts`);

  let content;
  let classes = 'bg-gray-100 text-gray-600 border-gray-200';
  let icon = null;

  if (!online) {
    content = '📡 Offline — changes will sync automatically';
    classes = 'bg-amber-50 text-amber-800 border-amber-200';
    icon = <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />;
  } else if (syncing) {
    content = pending > 0 ? `🔄 Syncing ${pending} pending listing${pending > 1 ? 's' : ''}...` : '🔄 Syncing...';
    classes = 'bg-blue-50 text-blue-800 border-blue-200';
    icon = <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />;
  } else if (failed > 0) {
    content = `⚠ ${failed} listing${failed > 1 ? 's' : ''} failed to sync. Tap to retry.`;
    classes = 'bg-red-50 text-red-700 border-red-200';
    icon = <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />;
  } else if (needsLogin) {
    content = 'Login required to sync offline drafts';
    classes = 'bg-blue-50 text-blue-800 border-blue-200';
    icon = <LogIn className="w-3.5 h-3.5 flex-shrink-0" />;
  } else if (offlineDrafts > 0) {
    content = `📋 ${offlineDrafts} offline draft${offlineDrafts > 1 ? 's' : ''} saved on this device`;
    classes = 'bg-gray-100 text-gray-700 border-gray-200';
    icon = <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />;
  } else if (pending > 0) {
    content = `🔄 ${pending} listing${pending > 1 ? 's' : ''} waiting to sync`;
    classes = 'bg-blue-50 text-blue-800 border-blue-200';
    icon = <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />;
  }

  return (
    <button
      onClick={goToDrafts}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium text-left transition hover:shadow-sm ${classes}`}
      title="Offline drafts & sync"
    >
      {icon || <Wifi className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate">{content}</span>
    </button>
  );
}