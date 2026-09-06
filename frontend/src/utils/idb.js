/**
 * Lightweight IndexedDB wrapper for offline data.
 *
 * Stores:
 *  - produceDrafts : farmer's locally-saved crop listings (keyPath: localDraftId)
 *  - syncQueue     : operations waiting to reach the backend (keyPath: operationId)
 *
 * Never store passwords, tokens, or identity documents here.
 */

const DB_NAME = 'mitti2market-offline';
const DB_VERSION = 1;
const STORES = ['produceDrafts', 'syncQueue'];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('produceDrafts')) {
        db.createObjectStore('produceDrafts', { keyPath: 'localDraftId' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'operationId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Promise-based transaction helper. */
async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function idbPut(storeName, value) {
  return tx(storeName, 'readwrite', (store) => store.put(value));
}

export async function idbGet(storeName, key) {
  return tx(storeName, 'readonly', (store) => store.get(key));
}

export async function idbGetAll(storeName) {
  return tx(storeName, 'readonly', (store) => store.getAll());
}

export async function idbDelete(storeName, key) {
  return tx(storeName, 'readwrite', (store) => store.delete(key));
}

export async function idbClear(storeName) {
  return tx(storeName, 'readwrite', (store) => store.clear());
}

export function idbSupported() {
  return typeof indexedDB !== 'undefined';
}