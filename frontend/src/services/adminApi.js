import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function adminRequest(method, path, body) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/admin${path}`, {
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

export async function getStats() {
  return adminRequest('GET', '/stats');
}

export async function getUsers(role, verification, status, search, state, district) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (verification) params.append('verification', verification);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  if (state) params.append('state', state);
  if (district) params.append('district', district);
  const q = params.toString() ? `?${params.toString()}` : '';
  return adminRequest('GET', `/users${q}`);
}

export async function getUserDetails(id) {
  return adminRequest('GET', `/users/${id}`);
}

export async function verifyUser(id, notes) {
  return adminRequest('PUT', `/users/${id}/verify`, { notes });
}

export async function rejectVerification(id, reason) {
  return adminRequest('PUT', `/users/${id}/reject`, { reason });
}

export async function requestResubmission(id, reason) {
  return adminRequest('PUT', `/users/${id}/request-resubmission`, { reason });
}

export async function requestDocReupload(docId, reason) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE}/documents/admin/${docId}/request-reupload`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data.data !== undefined ? data.data : data };
    return { ok: false, error: data.message || data.error || 'Request failed' };
  } catch {
    return { ok: false, error: 'Backend unavailable' };
  }
}

export async function suspendUser(id, reason) {
  return adminRequest('PUT', `/users/${id}/suspend`, { reason });
}

export async function unsuspendUser(id, reason) {
  return adminRequest('PUT', `/users/${id}/unsuspend`, { reason });
}

export async function deactivateUser(id, reason) {
  return adminRequest('PUT', `/users/${id}/deactivate`, { reason });
}

export async function restoreUser(id, reason) {
  return adminRequest('PUT', `/users/${id}/restore`, { reason });
}

export async function getVerifications(status, role, state, district, search) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (role) params.append('role', role);
  if (state) params.append('state', state);
  if (district) params.append('district', district);
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return adminRequest('GET', `/verifications${q}`);
}

export async function getReports(status) {
  const q = status ? `?status=${status}` : '';
  return adminRequest('GET', `/reports${q}`);
}

export async function resolveReport(id, status, adminNote, actionType) {
  return adminRequest('PUT', `/reports/${id}/resolve`, { status, adminNote, actionType });
}

export async function getFeedback(category, status) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return adminRequest('GET', `/feedback${q}`);
}

export async function updateFeedback(id, status, adminResponse, adminNote) {
  return adminRequest('PUT', `/feedback/${id}`, { status, adminResponse, adminNote });
}

export async function removeProduce(id, reason) {
  return adminRequest('PUT', `/produce/${id}/remove`, { reason });
}

export async function removeRequirement(id, reason) {
  return adminRequest('PUT', `/requirements/${id}/remove`, { reason });
}

export async function getDeals(status) {
  const q = status ? `?status=${status}` : '';
  return adminRequest('GET', `/deals${q}`);
}

export async function getProduce(status) {
  const q = status ? `?status=${status}` : '';
  return adminRequest('GET', `/produce${q}`);
}

export async function getDisputes(status) {
  const q = status ? `?status=${status}` : '';
  return adminRequest('GET', `/disputes${q}`);
}

export async function getAuditLog() {
  return adminRequest('GET', '/audit-log');
}
