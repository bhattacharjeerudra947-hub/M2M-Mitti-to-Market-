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

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API error');
  return data.data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API error');
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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    localStorage.removeItem('m2m_auth');
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API error');
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

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
  return data.data;
}

export { API_BASE, apiGet, apiPost, apiPatch, apiPut, apiUpload };
