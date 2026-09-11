/**
 * Real-time message and notification stream (Server-Sent Events).
 *
 * A single shared EventSource per tab; components subscribe through
 * onMessage() and onNotification(). New messages and notifications
 * are pushed by the backend and delivered to listeners instantly.
 */

const STREAM_URL = 'http://localhost:8080/api/messages/events';
const RECONNECT_MS = 5000;

let es = null;
let messageListeners = new Set();
let notificationListeners = new Set();
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

  // Listen to message events
  es.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    messageListeners.forEach((fn) => {
      try { fn(payload); } catch { /* listener errors must not break the stream */ }
    });
  });

  // Listen to notification events (e.g. NEW_MATCH, DEAL_STARTED, DEAL_LOCKED)
  es.addEventListener('notification', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    notificationListeners.forEach((fn) => {
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
  messageListeners.add(fn);
  if (!es) connect();
  return () => {
    messageListeners.delete(fn);
    checkIdleAndClose();
  };
}

/** Subscribe to incoming notifications (matches, deals, offers). Returns an unsubscribe function. */
export function onNotification(fn) {
  notificationListeners.add(fn);
  if (!es) connect();
  return () => {
    notificationListeners.delete(fn);
    checkIdleAndClose();
  };
}

function checkIdleAndClose() {
  if (messageListeners.size === 0 && notificationListeners.size === 0 && es) {
    es.close();
    es = null;
  }
}

/** Drop the connection (e.g. on logout). */
export function closeMessageStream() {
  messageListeners.clear();
  notificationListeners.clear();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (es) { es.close(); es = null; }
}