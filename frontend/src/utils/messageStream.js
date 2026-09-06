/**
 * Real-time message stream (Server-Sent Events).
 *
 * A single shared EventSource per tab; every component subscribes through
 * onMessage(). New messages are pushed by the backend and delivered to
 * listeners instantly — no waiting for the poll interval.
 */

const STREAM_URL = 'http://localhost:8080/api/messages/events';
const RECONNECT_MS = 5000;

let es = null;
let listeners = new Set();
let reconnectTimer = null;
let lastUserId = null;

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('m2m_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function connect() {
  const auth = getStoredAuth();
  const userId = auth?.user?.id;
  const token = auth?.token;
  if (!userId || !token) return;

  lastUserId = userId;
  if (es) es.close();

  es = new EventSource(`${STREAM_URL}?token=${encodeURIComponent(token)}`);

  es.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    listeners.forEach((fn) => {
      try { fn(payload); } catch { /* listener errors must not break the stream */ }
    });
  });

  es.onerror = () => {
    if (es) { es.close(); es = null; }
    // Auto-reconnect (e.g. after a network blip or backend restart)
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      const current = getStoredAuth();
      if (current?.user?.id === lastUserId && current?.token) connect();
    }, RECONNECT_MS);
  };
}

/** Subscribe to incoming messages. Returns an unsubscribe function. */
export function onMessage(fn) {
  listeners.add(fn);
  if (!es) connect();
  return () => {
    listeners.delete(fn);
    // Keep the stream open if other listeners exist; close if idle
    if (listeners.size === 0 && es) {
      es.close();
      es = null;
    }
  };
}

/** Drop the connection (e.g. on logout). */
export function closeMessageStream() {
  listeners.clear();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (es) { es.close(); es = null; }
}