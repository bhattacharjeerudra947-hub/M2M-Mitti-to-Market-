const API_BASE = 'http://localhost:8080';

function getStoredToken() {
  try {
    const raw = localStorage.getItem('m2m_auth');
    return raw ? JSON.parse(raw)?.token : null;
  } catch { return null; }
}

function authHeaders(extra = {}) {
  const h = { ...extra };
  const t = getStoredToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

/** Create an Error carrying the HTTP status so callers (sync queue) can classify failures. */
function apiError(message, status) {
  const err = new Error(message);
  err.status = status || 0;
  return err;
}

async function apiGet(path) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  } catch {
    throw apiError('Network error — you may be offline', 0);
  }
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw apiError('Session expired. Please log in again.', 401);
  }
  let data;
  try { data = await res.json(); } catch { throw apiError('Invalid server response', res.status); }
  if (!data.success) throw apiError(data.message || 'API error', res.status);
  return data.data;
}

async function apiPost(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
  } catch {
    throw apiError('Network error — you may be offline', 0);
  }
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw apiError('Session expired. Please log in again.', 401);
  }
  let data;
  try { data = await res.json(); } catch { throw apiError('Invalid server response', res.status); }
  if (!data.success) throw apiError(data.message || 'API error', res.status);
  return data.data;
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

async function apiPut(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
  } catch {
    throw apiError('Network error — you may be offline', 0);
  }
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw apiError('Session expired. Please log in again.', 401);
  }
  let data;
  try { data = await res.json(); } catch { throw apiError('Invalid server response', res.status); }
  if (!data.success) throw apiError(data.message || 'API error', res.status);
  return data.data;
}

/**
 * Upload a file to the backend (multipart/form-data).
 * The backend uploads it to Cloudinary and returns the URL.
 */
async function apiUpload(path, file, extraFields = {}) {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
  } catch {
    throw apiError('Network error — you may be offline', 0);
  }
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw apiError('Session expired. Please log in again.', 401);
  }
  let data;
  try { data = await res.json(); } catch { throw apiError('Invalid server response', res.status); }
  if (!res.ok || !data.success) throw apiError(data.message || 'Upload failed', res.status);
  return data.data;
}

export { API_BASE, apiGet, apiPost, apiPatch, apiPut, apiUpload };
