/**
 * Offline GPS point queue.
 *
 * When the driver loses connectivity during an active trip, GPS points are
 * queued in IndexedDB (timestamps preserved, duplicates prevented, bounded
 * storage). When connectivity returns the queued points are flushed to the
 * backend in order.
 *
 * The UI must never say "Live" for queued points — each point carries its
 * own recordedAt timestamp so staleness is always visible.
 */
import { idbPut, idbGetAll, idbDelete, idbSupported } from './idb';

const MAX_QUEUED_POINTS = 200; // bounded storage
let flushing = false;

function pointId(p) {
  return `${p.logisticsId}:${p.recordedAt}`;
}

/** Queue a GPS point locally (called when a live upload fails / is offline). */
export async function queueGpsPoint({ logisticsId, latitude, longitude, accuracy, speed, heading, recordedAt }) {
  if (!idbSupported()) return false;
  const point = {
    pointId: pointId({ logisticsId, recordedAt }),
    logisticsId,
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    recordedAt: recordedAt || new Date().toISOString(),
    queuedAt: new Date().toISOString(),
  };
  try {
    // Prevent unbounded growth — drop the oldest points beyond the cap
    const all = await idbGetAll('gpsQueue');
    if (all.length >= MAX_QUEUED_POINTS) {
      const sorted = [...all].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
      await idbDelete('gpsQueue', sorted[0].pointId);
    }
    await idbPut('gpsQueue', point);
    return true;
  } catch {
    return false; // storage failure — warn, never pretend it saved
  }
}

/** Number of points waiting to sync. */
export async function countQueuedGpsPoints() {
  if (!idbSupported()) return 0;
  try { return (await idbGetAll('gpsQueue')).length; } catch { return 0; }
}

/**
 * Flush queued points to the backend. Uses a single-flight guard so
 * reconnect + manual retry cannot double-send.
 */
export async function flushGpsQueue(updateFn) {
  if (flushing) return 0;
  if (!idbSupported()) return 0;
  const points = await idbGetAll('gpsQueue');
  if (points.length === 0) return 0;

  flushing = true;
  let synced = 0;
  try {
    const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (const p of sorted) {
      try {
        await updateFn(p); // caller posts to POST/PUT location endpoint
        await idbDelete('gpsQueue', p.pointId);
        synced++;
      } catch (e) {
        if (e.status >= 400 && e.status < 500) {
          // Permanent rejection (unauthorized, invalid) — drop it, don't retry forever
          await idbDelete('gpsQueue', p.pointId);
          synced++;
        } else {
          // Network / 5xx — keep queued and stop; retry on next flush
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
  return synced;
}