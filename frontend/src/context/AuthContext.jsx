import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestRole, setGuestRole] = useState(null); // null | 'farmer' | 'business'
  const [roleChoiceOpen, setRoleChoiceOpen] = useState(false);
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);

  useEffect(() => {
    const storedUser = api.getStoredUserData();
    if (storedUser && api.isLoggedIn()) {
      setUser(storedUser);
      // Fetch fresh user profile from backend to ensure verificationStatus, profilePhotoUrl, etc. are accurate
      api.getMe().then((res) => {
        if (res.ok && res.data) {
          setUser(res.data);
          api.setStoredUserData(res.data);
        }
      }).catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role) => {
    // Route to the role-locked backend endpoint. The backend enforces that the
    // account's role matches the portal used, so passing the role here is not
    // authorization by itself — it just selects the correct endpoint.
    let result;
    if (role === 'admin') {
      result = await api.loginAdmin(email, password);
    } else if (role === 'business') {
      result = await api.loginBusiness(email, password);
    } else {
      // role === 'farmer' or unrecognised — use the farmer-locked endpoint
      result = await api.loginFarmer(email, password);
    }
    if (result.ok) {
      const loggedInUser = result.data?.user || result.data;
      setUser(loggedInUser);
      // Clear guest mode on real login
      setGuestRole(null);
      // Let the offline sync queue know a session is available
      window.dispatchEvent(new Event('m2m:login'));
    }
    return result;
  }, []);

  const register = useCallback(async (nameOrPayload, email, phone, password, role, location) => {
    let payload;
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      payload = nameOrPayload;
    } else {
      payload = { name: nameOrPayload, email, phone, password, role, location };
    }
    const result = await api.register(payload.name, payload.email, payload.phone, payload.password, payload.role, payload.location);
    if (result.ok) {
      const registeredUser = result.data?.user || result.data;
      setUser(registeredUser);
      setGuestRole(null);
      window.dispatchEvent(new Event('m2m:login'));
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setGuestRole(null);
  }, []);

  const refreshUser = useCallback(async (userData) => {
    if (userData) {
      setUser(userData);
      api.setStoredUserData(userData);
      return userData;
    } else {
      const res = await api.getMe();
      if (res.ok && res.data) {
        setUser(res.data);
        api.setStoredUserData(res.data);
        return res.data;
      }
    }
  }, []);

  // Guest mode helpers
  const enterGuestMode = useCallback((role) => {
    setGuestRole(role);
    setRoleChoiceOpen(false);
  }, []);

  const exitGuestMode = useCallback(() => {
    setGuestRole(null);
  }, []);

  const openRoleChoice = useCallback(() => setRoleChoiceOpen(true), []);
  const closeRoleChoice = useCallback(() => setRoleChoiceOpen(false), []);
  const openAuthRequired = useCallback(() => setAuthRequiredOpen(true), []);
  const closeAuthRequired = useCallback(() => setAuthRequiredOpen(false), []);

  const isGuest = !!guestRole;
  const isGuestModeActive = isGuest && !user;
  // Compute effective role: real user role takes priority, then guest role
  const effectiveRole = user?.role?.toLowerCase() || guestRole || null;

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    role: user?.role?.toLowerCase() || null,
    isAdmin: user?.role === 'ADMIN',
    // Guest mode
    guestRole,
    isGuest,
    isGuestModeActive,
    effectiveRole,
    enterGuestMode,
    exitGuestMode,
    // Modals
    roleChoiceOpen,
    openRoleChoice,
    closeRoleChoice,
    authRequiredOpen,
    openAuthRequired,
    closeAuthRequired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
