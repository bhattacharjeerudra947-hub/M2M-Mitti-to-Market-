/**
 * API service layer.
 * Handles auth tokens, auto-refresh, and localStorage persistence.
 *
 * Makes real HTTP requests to the Spring Boot backend.
 * No mock/localStorage auth fallback — passwords must never be stored client-side.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

export function getStoredToken() {
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

    // Backend wraps responses in ApiResponse: { success, message, data }
    // Unwrap the inner data field for convenience
    if (res.ok) return { ok: true, data: data.data !== undefined ? data.data : data };

    // If 401 and we have a refresh token, try refreshing for non-auth requests
    const isAuthEndpoint = path.startsWith('/auth/');
    if (res.status === 401 && !isAuthEndpoint && getStoredToken()) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getStoredToken()}`;
        const retryRes = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok) return { ok: true, data: retryData.data !== undefined ? retryData.data : retryData };
        return { ok: false, error: retryData.error || retryData.message || 'Request failed' };
      }
      // Refresh failed — clear auth
      clearTokens();
      return { ok: false, error: 'Session expired. Please sign in again.' };
    }

    return { ok: false, error: data.error || data.message || `Request failed (${res.status})` };
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

/* ───────── Firebase Phone Authentication (removed — not in use) ───────── */

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

export async function register(nameOrPayload, email, phone, password, role, location) {
  let body;
  if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
    body = nameOrPayload;
  } else {
    body = { name: nameOrPayload, email, phone, password, role, location };
  }
  const result = await request('POST', '/auth/register', body, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

export async function login(email, password) {
  const result = await request('POST', '/auth/login', { email, password }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

/**
 * Role-locked login endpoints. Each endpoint accepts only the matching account role.
 * The backend rejects a wrong-role account with 401 + a clear message — frontend does
 * not decide authorization here.
 */
export async function loginFarmer(email, password) {
  const result = await request('POST', '/auth/farmer/login', { email, password }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

export async function loginBusiness(email, password) {
  const result = await request('POST', '/auth/business/login', { email, password }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

export async function loginAdmin(email, password) {
  const result = await request('POST', '/auth/admin/login', { email, password }, false);
  if (result.ok) storeTokens(result.data);
  return result;
}

/* ───────── MSG91 Mobile OTP ───────── */

export async function sendMobileOtp(phone) {
  return request('POST', '/auth/otp/send', { phone }, false);
}

export async function verifyMobileOtp(phone, otp) {
  return request('POST', '/auth/otp/verify', { phone, otp }, false);
}

export async function resendMobileOtp(phone) {
  return request('POST', '/auth/otp/retry', { phone }, false);
}

/* ───────── Bank IFSC Lookup ───────── */

export async function lookupIfsc(ifscCode) {
  if (!ifscCode || ifscCode.trim().length !== 11) {
    return { ok: false, error: 'IFSC must be 11 characters' };
  }
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${ifscCode.trim().toUpperCase()}`);
    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        bank: data.BANK,
        branch: data.BRANCH,
        city: data.CITY,
        state: data.STATE,
        address: data.ADDRESS,
      };
    }
    return { ok: false, error: 'Bank branch not found for this IFSC code' };
  } catch {
    return { ok: false, error: 'Could not connect to IFSC service' };
  }
}

/* ───────── Verification Re-submission ───────── */

export async function resubmitVerification() {
  return request('PUT', '/documents/resubmit');
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

export async function getMe() {
  const result = await request('GET', '/auth/me');
  if (result.ok && result.data) {
    const stored = getStoredTokens();
    if (stored) {
      stored.user = result.data;
      localStorage.setItem('m2m_auth', JSON.stringify(stored));
    }
  }
  return result;
}

export async function getProfile() {
  const result = await request('GET', '/profile');
  if (result.ok && (result.data?.user || result.data)) {
    const userData = result.data?.user || result.data;
    const stored = getStoredTokens();
    if (stored) {
      stored.user = userData;
      localStorage.setItem('m2m_auth', JSON.stringify(stored));
    }
  }
  if (result.offline) return { ok: true, data: getStoredUser() };
  return result;
}

export async function updateProfile(data) {
  const result = await request('PUT', '/profile', data);
  if (result.ok && (result.data?.user || result.data)) {
    const userData = result.data?.user || result.data;
    const stored = getStoredTokens();
    if (stored) {
      stored.user = userData;
      localStorage.setItem('m2m_auth', JSON.stringify(stored));
    }
  }
  return result;
}

export async function updateProfilePhoto(photoUrl) {
  const result = await request('POST', '/profile/photo', { profilePhotoUrl: photoUrl });
  if (result.ok) {
    const stored = getStoredTokens();
    if (stored && stored.user) {
      stored.user.profilePhotoUrl = photoUrl;
      localStorage.setItem('m2m_auth', JSON.stringify(stored));
    }
  }
  return result;
}

export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getStoredToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/users/profile-picture`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const userData = data.data || data;
      const stored = getStoredTokens();
      if (stored && userData) {
        stored.user = { ...stored.user, ...userData };
        localStorage.setItem('m2m_auth', JSON.stringify(stored));
      }
      return { ok: true, data: userData };
    }
    return { ok: false, error: data.message || data.error || 'Upload failed' };
  } catch {
    return { ok: false, error: 'Backend unavailable' };
  }
}

export function logout() {
  clearTokens();
}

export function getStoredUserData() {
  return getStoredUser();
}

export function setStoredUserData(user) {
  const stored = getStoredTokens();
  if (stored) {
    stored.user = user;
    localStorage.setItem('m2m_auth', JSON.stringify(stored));
  }
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

export async function getFarmerPublicProfile(id) {
  return request('GET', `/users/${id}/public-profile`);
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
