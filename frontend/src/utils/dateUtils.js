/**
 * Date formatting utilities for Mitti-to-Market (M2M).
 * Ensures consistent DD/MM/YYYY format across the application.
 */

/**
 * Formats an ISO string, Date object, or timestamp into DD/MM/YYYY format.
 * Example: "13/09/2026"
 * Returns fallback (default: '—') if invalid or empty.
 */
export function formatDate(val, fallback = '—') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats an ISO string, Date object, or timestamp into DD/MM/YYYY, HH:MM AM/PM format.
 * Example: "13/09/2026, 02:45 PM"
 * Returns fallback (default: '—') if invalid or empty.
 */
export function formatDateTime(val, fallback = '—') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats an ISO string, Date object, or timestamp into DD/MM/YYYY, HH:MM:SS AM/PM format.
 */
export function formatDateTimeWithSeconds(val, fallback = '—') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats time only: HH:MM AM/PM.
 */
export function formatTime(val, fallback = '—') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return fallback;
  }
}
