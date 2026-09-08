import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request(method, path, body) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data.data !== undefined ? data.data : data };
    return { ok: false, error: data.message || data.error || `Request failed (${res.status})` };
  } catch (err) {
    return { ok: false, error: 'Backend unavailable' };
  }
}

export async function submitFeedback(feedbackData) {
  return request('POST', '/feedback', feedbackData);
}

export async function getMyFeedback() {
  return request('GET', '/feedback/my');
}
