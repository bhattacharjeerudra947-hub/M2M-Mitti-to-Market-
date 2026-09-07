/**
 * Offline-first produce sync queue.
 *
 * Drafts live in IndexedDB (produceDrafts). When a farmer saves a listing
 * while offline (or the submit fails temporarily), a CREATE_PRODUCE operation
 * is queued (syncQueue). When connectivity returns, queued operations are
 * processed against the backend with a client-generated idempotency key, so
 * retries never create duplicate listings.
 *
 * NEVER store passwords / tokens / identity documents in IndexedDB.
 */
import { useState, useEffect } from 'react';
import { idbPut, idbGet, idbGetAll, idbDelete } from './idb';
import { apiPost, apiUpload } from '../api';
import { isLowDataMode } from './lowDataMode';

const MAX_RETRIES = 6;

// ──── global status store (network + sync) ────

const state = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  failed: 0,
  lastSyncAt: null,
  offlineDrafts: 0,
};

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

function recomputeCounts() {
  // async helper — recompute from stores
  Promise.all([idbGetAll('syncQueue'), idbGetAll('produceDrafts')])
    .then(([queue, drafts]) => {
      state.pending = queue.filter((q) => q.status === 'PENDING').length;
      state.failed = queue.filter((q) => q.status === 'FAILED').length;
      state.offlineDrafts = drafts.filter((d) => d.syncStatus !== 'SYNCED').length;
      notify();
    })
    .catch(() => {});
}

// ──── auth token (never persisted to IndexedDB) ────

function getToken() {
  try {
    const raw = localStorage.getItem('m2m_auth');
    return raw ? JSON.parse(raw)?.token : null;
  } catch {
    return null;
  }
}

// ──── draft CRUD ────

export async function saveDraft(draft) {
  const now = new Date().toISOString();
  const existing = await idbGet('produceDrafts', draft.localDraftId);
  const merged = {
    ...draft,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastSavedAt: now,
  };
  await idbPut('produceDrafts', merged);
  recomputeCounts();
  return merged;
}

/** Queue a draft for backend sync (PENDING). */
export async function queueDraft(draft) {
  const now = new Date().toISOString();
  const idempotencyKey = draft.idempotencyKey || crypto.randomUUID();
  await idbPut('produceDrafts', { ...draft, idempotencyKey, syncStatus: 'PENDING', lastError: null, updatedAt: now });
  await idbPut('syncQueue', {
    operationId: idempotencyKey,
    idempotencyKey,
    operationType: 'CREATE_PRODUCE',
    userId: draft.userId,
    localDraftId: draft.localDraftId,
    status: 'PENDING',
    retryCount: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
  recomputeCounts();
  scheduleProcess();
}

/** Re-queue a previously failed draft. */
export async function retryDraft(localDraftId) {
  const draft = await idbGet('produceDrafts', localDraftId);
  if (!draft) return;
  const existing = (await idbGetAll('syncQueue')).find((q) => q.localDraftId === localDraftId);
  if (existing) {
    await idbPut('syncQueue', { ...existing, status: 'PENDING', retryCount: 0, lastError: null, updatedAt: new Date().toISOString() });
  } else {
    await queueDraft(draft);
  }
  recomputeCounts();
  scheduleProcess();
}

/** Delete a draft and its queue operation. */
export async function deleteDraft(localDraftId) {
  await idbDelete('produceDrafts', localDraftId);
  const queue = await idbGetAll('syncQueue');
  for (const item of queue) {
    if (item.localDraftId === localDraftId) await idbDelete('syncQueue', item.operationId);
  }
  recomputeCounts();
}

export async function getDraftsForUser(userId) {
  const all = await idbGetAll('produceDrafts');
  return all
    .filter((d) => String(d.userId) === String(userId))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function getDraft(localDraftId) {
  return idbGet('produceDrafts', localDraftId);
}

// ──── processing ────

let processing = false;
let processTimer = null;
let backoffTimer = null;

export function scheduleProcess(delayMs = 400) {
  if (processTimer) clearTimeout(processTimer);
  processTimer = setTimeout(() => processSyncQueue(), delayMs);
}

function scheduleBackoff(retryCount) {
  const base = Math.min(1000 * 2 ** retryCount, 30000);
  const delay = isLowDataMode() ? base * 2 : base; // low data mode = fewer retry attempts
  if (backoffTimer) clearTimeout(backoffTimer);
  backoffTimer = setTimeout(() => processSyncQueue(), delay);
}

async function processSyncQueue() {
  if (processing) return;
  processing = true;
  state.syncing = true;
  notify();
  try {
    for (;;) {
      const items = (await idbGetAll('syncQueue'))
        .filter((q) => q.status === 'PENDING')
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      if (items.length === 0) {
        state.lastSyncAt = new Date().toISOString();
        break;
      }

      const item = items[0];
      const now = new Date().toISOString();
      await idbPut('syncQueue', { ...item, status: 'SYNCING', updatedAt: now });
      notify();

      const draft = await idbGet('produceDrafts', item.localDraftId);
      if (!draft) {
        await idbDelete('syncQueue', item.operationId);
        continue;
      }

      const token = getToken();
      if (!token) {
        // Session missing — preserve the draft, ask for login
        await idbPut('produceDrafts', { ...draft, syncStatus: 'NEEDS_LOGIN', lastError: 'Login required to sync', updatedAt: now });
        await idbPut('syncQueue', { ...item, status: 'FAILED', lastError: 'LOGIN_REQUIRED', updatedAt: now });
        recomputeCounts();
        continue;
      }

      try {
        // 1) Upload image first if it is pending (only possible while online)
        let imageUrl = draft.imageUrl || null;
        if (draft.image?.blob && draft.imageStatus === 'PENDING_UPLOAD' && !imageUrl) {
          try {
            const up = await apiUpload('/api/produce/upload-image', draft.image.blob);
            imageUrl = up.imageUrl;
          } catch {
            // Keep PENDING_UPLOAD — listing is created without image, image retried on next sync
          }
        }

        // 2) Create the produce listing (idempotency key prevents duplicates)
        const created = await apiPost('/api/produce', {
          farmerId: item.userId,
          name: draft.name,
          category: draft.category,
          quantity: Number(draft.quantity),
          unit: draft.unit,
          pricePerUnit: Number(draft.pricePerUnit),
          description: draft.description || '',
          location: draft.location || '',
          imageUrl,
          idempotencyKey: item.idempotencyKey,
        });

        await idbPut('produceDrafts', {
          ...draft,
          syncStatus: 'SYNCED',
          serverProduceId: created?.id || null,
          imageUrl: imageUrl || draft.imageUrl,
          imageStatus: imageUrl ? 'UPLOADED' : draft.imageStatus,
          lastError: null,
          updatedAt: now,
        });
        await idbDelete('syncQueue', item.operationId);
        recomputeCounts();
      } catch (err) {
        const status = err?.status || 0;
        if (status === 401 || status === 403) {
          // Session expired — preserve draft, request login, do not hammer
          await idbPut('produceDrafts', { ...draft, syncStatus: 'NEEDS_LOGIN', lastError: 'Login required to sync', updatedAt: now });
          await idbPut('syncQueue', { ...item, status: 'FAILED', lastError: 'LOGIN_REQUIRED', updatedAt: now });
          state.syncing = false;
          notify();
          return; // stop — nothing else can sync without a session
        } else if (status >= 400 && status < 500) {
          // Validation / business error — surface it, do not auto-retry
          await idbPut('produceDrafts', { ...draft, syncStatus: 'FAILED', lastError: err.message, updatedAt: now });
          await idbPut('syncQueue', { ...item, status: 'FAILED', lastError: err.message, updatedAt: now });
        } else {
          // Network / timeout / 5xx — retry with exponential backoff
          item.retryCount += 1;
          if (item.retryCount <= MAX_RETRIES) {
            await idbPut('syncQueue', { ...item, status: 'PENDING', updatedAt: now });
            await idbPut('produceDrafts', { ...draft, syncStatus: 'PENDING', lastError: null, updatedAt: now });
            recomputeCounts();
            scheduleBackoff(item.retryCount);
            return; // wait for the backoff timer
          }
          await idbPut('produceDrafts', { ...draft, syncStatus: 'FAILED', lastError: err.message || 'Sync failed after multiple attempts', updatedAt: now });
          await idbPut('syncQueue', { ...item, status: 'FAILED', lastError: err.message || 'Sync failed after multiple attempts', updatedAt: now });
        }
        recomputeCounts();
      }
    }
  } finally {
    processing = false;
    state.syncing = false;
    recomputeCounts();
    notify();
  }
}

export function requestSync() {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    scheduleProcess(100);
  }
}

// ──── network listeners + startup ────

let initialized = false;

export function initSyncListeners() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    state.online = true;
    notify();
    requestSync(); // auto-sync when connection returns
  });
  window.addEventListener('offline', () => {
    state.online = false;
    notify();
  });

  // After a fresh login, try to sync anything that was waiting for a session
  window.addEventListener('m2m:login', () => requestSync());

  // Startup: process pending operations if we are online
  recomputeCounts();
  requestSync();
}

// ──── React hook ────

export function useSyncStatus() {
  const [snapshot, setSnapshot] = useState({ ...state });
  useEffect(() => {
    const fn = () => setSnapshot({ ...state });
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return snapshot;
}