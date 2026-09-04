import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = api.getStoredUserData();
    if (storedUser && api.isLoggedIn()) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    if (result.ok) setUser(result.data.user);
    return result;
  }, []);

  const register = useCallback(async (name, email, phone, password, role, location) => {
    const result = await api.register(name, email, phone, password, role, location);
    if (result.ok) setUser(result.data.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    role: user?.role?.toLowerCase() || null,
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
