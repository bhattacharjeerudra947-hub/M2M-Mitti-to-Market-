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
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    if (result.ok) {
      setUser(result.data.user);
      // Clear guest mode on real login
      setGuestRole(null);
      // Let the offline sync queue know a session is available
      window.dispatchEvent(new Event('m2m:login'));
    }
    return result;
  }, []);

  const register = useCallback(async (name, email, phone, password, role, location) => {
    const result = await api.register(name, email, phone, password, role, location);
    if (result.ok) {
      setUser(result.data.user);
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

  const refreshUser = useCallback((userData) => {
    setUser(userData);
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
