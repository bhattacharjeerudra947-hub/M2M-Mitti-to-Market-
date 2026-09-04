/**
 * API service layer.
 * Handles auth tokens, auto-refresh, and localStorage persistence.
 *
 * When the backend is running: makes real HTTP requests.
 * When the backend is unavailable: falls back to localStorage-based mock auth
 * so the frontend remains functional during development.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/* ───────── Token management ───────── */

function getStoredTokens() {
  try {
    const raw = localStorage.getItem('m2m_auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeTokens(data) {
  localStorage.setItem('m2m_auth', JSON.stringify({
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
  }));
}

function clearTokens() {
  localStorage.removeItem('m2m_auth');
}

function getStoredUser() {
  const stored = getStoredTokens();
  return stored?.user || null;
}

function getStoredToken() {
  return getStoredTokens()?.token || null;
}

/* ───────── HTTP helper ───────── */

async function request(method, path, body, includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getStoredToken();
  if (includeAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) return { ok: true, data };

    // If 401 and we have a refresh token, try refreshing
    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getStoredToken()}`;
        const retryRes = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok) return { ok: true, data: retryData };
        return { ok: false, error: retryData.error || 'Request failed' };
      }
      // Refresh failed — clear auth
      clearTokens();
      return { ok: false, error: 'Session expired. Please sign in again.' };
    }

    return { ok: false, error: data.error || `Request failed (${res.status})` };
  } catch {
    // Backend unreachable — try mock fallback
    return { ok: false, error: 'Backend unavailable', offline: true };
  }
}

async function tryRefresh() {
  const stored = getStoredTokens();
  if (!stored?.refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    storeTokens(data);
    return true;
  } catch {
    return false;
  }
}

/* ───────── Mock fallback (localStorage-based) ───────── */

function getUsersDb() {
  try {
    return JSON.parse(localStorage.getItem('m2m_users') || '[]');
  } catch { return []; }
}

function saveUsersDb(users) {
  localStorage.setItem('m2m_users', JSON.stringify(users));
}

function mockRegister(name, email, phone, password, role, location) {
  const users = getUsersDb();
  if (users.some((u) => u.email === email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists' };
  }
  const user = {
    id: Date.now(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || '',
    password, // stored for mock auth only
    role: role.toUpperCase(),
    location: location || '',
    verified: false,
    rating: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsersDb(users);

  const token = 'mock_' + Math.random().toString(36).slice(2);
  const refreshToken = 'mock_refresh_' + Math.random().toString(36).slice(2);
  const { password: _, ...safeUser } = user;
  const data = { token, refreshToken, user: safeUser, message: 'Account created successfully' };
  storeTokens(data);
  return { ok: true, data };
}

function mockLogin(email, password) {
  const users = getUsersDb();
  const user = users.find((u) => u.email === email.toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: 'Invalid email or password' };

  const token = 'mock_' + Math.random().toString(36).slice(2);
  const refreshToken = 'mock_refresh_' + Math.random().toString(36).slice(2);
  const { password: _, ...safeUser } = user;
  const data = { token, refreshToken, user: safeUser, message: 'Login successful' };
  storeTokens(data);
  return { ok: true, data };
}

/* ───────── Firebase Phone Authentication ───────── */

/**
 * Authenticate with Firebase ID token (obtained after phone OTP verification).
 * Backend verifies the token, finds/creates user in MySQL, returns auth tokens.
 */
export async function firebaseAuth(idToken, role) {
  const result = await request('POST', '/auth/firebase', { idToken, role }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

/**
 * Update user profile after Firebase phone auth (name, role, location, etc.)
 */
export async function updateFirebaseProfile(profileData) {
  const result = await request('POST', '/auth/update-profile', profileData);
  if (result.ok && result.data?.user) {
    const stored = getStoredTokens();
    if (stored) { stored.user = result.data.user; localStorage.setItem('m2m_auth', JSON.stringify(stored)); }
  }
  return result;
}

/* ───────── Legacy Email/Password (kept for backward compatibility) ───────── */

export async function register(name, email, phone, password, role, location) {
  const result = await request('POST', '/auth/register', { name, email, phone, password, role, location }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

export async function login(email, password) {
  const result = await request('POST', '/auth/login', { email, password }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

export async function refreshToken() {
  const stored = getStoredTokens();
  if (!stored?.refreshToken) return { ok: false, error: 'No refresh token' };
  const result = await request('POST', '/auth/refresh', { refreshToken: stored.refreshToken }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

/** Send OTP to email or phone */
export async function sendOtp(identifier) {
  const result = await request('POST', '/auth/forgot-password', { identifier }, false);
  return result;
}

/** Verify OTP code */
export async function verifyOtp(identifier, otp) {
  const result = await request('POST', '/auth/verify-otp', { identifier, otp }, false);
  return result;
}

/** Reset password using verified OTP */
export async function resetPasswordWithOtp(identifier, otp, newPassword) {
  const result = await request('POST', '/auth/reset-password', { identifier, otp, newPassword }, false);
  return result;
}

export async function forgotPassword(email) {
  return sendOtp(email);
}

export async function resetPassword(token, newPassword) {
  return { ok: false, error: 'Please use the OTP-based reset flow.' };
}

export async function getProfile() {
  const result = await request('GET', '/profile');
  if (result.offline) return { ok: true, data: getStoredUser() };
  return result;
}

export async function updateProfile(data) {
  const result = await request('PUT', '/profile', data);
  if (result.offline) {
    const users = getUsersDb();
    const currentUser = getStoredUser();
    const user = users.find((u) => u.id === currentUser.id);
    if (user) {
      if (data.name) user.name = data.name;
      if (data.phone !== undefined) user.phone = data.phone;
      if (data.location !== undefined) user.location = data.location;
      saveUsersDb(users);
      const { password: _, ...safeUser } = user;
      // Update stored user
      const stored = getStoredTokens();
      if (stored) { stored.user = safeUser; localStorage.setItem('m2m_auth', JSON.stringify(stored)); }
      return { ok: true, data: { message: 'Profile updated successfully', user: safeUser } };
    }
  }
  if (result.ok && result.data?.user) {
    const stored = getStoredTokens();
    if (stored) { stored.user = result.data.user; localStorage.setItem('m2m_auth', JSON.stringify(stored)); }
  }
  return result;
}

export function logout() {
  clearTokens();
}

export function getStoredUserData() {
  return getStoredUser();
}

export function isLoggedIn() {
  return !!getStoredToken();
}



/* ───────── Farmer Profile ───────── */

export async function saveFarmerProfile(profileData) {
  return request('POST', '/farmers/profile', profileData);
}

export async function getFarmerProfile() {
  return request('GET', '/farmers/profile');
}

/* ───────── Business Profile ───────── */

export async function saveBusinessProfile(profileData) {
  return request('POST', '/business/profile', profileData);
}

export async function getBusinessProfile() {
  return request('GET', '/business/profile');
}

/* ───────── Documents ───────── */

/**
 * Upload a document (PDF or image) to the backend.
 * @param {File} file - the file to upload
 * @param {string} documentType - e.g. PROFILE_PHOTO, IDENTITY_DOC, BUSINESS_REGISTRATION
 */
export async function uploadDocument(file, documentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const token = getStoredToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data };
    return { ok: false, error: data.message || data.error || 'Upload failed' };
  } catch {
    return { ok: false, error: 'Backend unavailable' };
  }
}

export async function getMyDocuments() {
  return request('GET', '/documents/my-documents');
}

export async function deleteDocument(documentId) {
  return request('DELETE', `/documents/${documentId}`);
}
