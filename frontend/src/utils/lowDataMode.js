/**
 * Low Data Mode — the rural / 2G differentiator.
 *
 * When enabled:
 *  - polling intervals are stretched (fewer network calls)
 *  - images use Cloudinary compressed thumbnails
 *  - heavy features (maps, autoplay) are deferred
 *
 * The setting is persisted in localStorage so it survives reloads.
 */

const STORAGE_KEY = 'm2m_low_data_mode';
const listeners = new Set();

export function isLowDataMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLowDataMode(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
  listeners.forEach(fn => fn(enabled));
}

export function toggleLowDataMode() {
  const next = !isLowDataMode();
  setLowDataMode(next);
  return next;
}

/** Subscribe to changes; returns an unsubscribe function. */
export function onLowDataModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Polling interval helper — longer intervals in low data mode. */
export function pollInterval(normalMs, lowDataMs) {
  return isLowDataMode() ? lowDataMs : normalMs;
}

/**
 * Cloudinary thumbnail helper.
 * If the URL is from Cloudinary (res.cloudinary.com), appends image
 * transformation params so low-data mode loads a small compressed
 * version instead of the original. Non-Cloudinary URLs pass through.
 */
export function optimizeImage(url, { width = 300, lowData = isLowDataMode() } = {}) {
  if (!url) return url;
  if (!lowData) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com')) {
      // Insert transformation segment before the public id
      const parts = u.pathname.split('/');
      // pathname like /cloud-name/image/upload/v123/public-id.jpg
      const uploadIdx = parts.findIndex(p => p === 'upload');
      if (uploadIdx !== -1 && uploadIdx + 1 < parts.length) {
        parts.splice(uploadIdx + 1, 0, `w_${width},q_auto,f_auto`);
        u.pathname = parts.join('/');
      }
      return u.toString();
    }
  } catch {}
  return url;
}

/** Heavy feature guard — used for maps, autoplay, etc. */
export function shouldDeferHeavyFeature() {
  return isLowDataMode();
}