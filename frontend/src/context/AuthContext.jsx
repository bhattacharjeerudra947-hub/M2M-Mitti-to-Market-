import { createContext, useContext, useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import * as api from '../services/api';

=======

const API_BASE = 'http://localhost:8080';
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
<<<<<<< HEAD
  const [loading, setLoading] = useState(true); // true until initial auth check completes

  // Check for existing session on mount
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
    }
    return result;
  }, []);

  const register = useCallback(async (name, email, phone, password, role, location) => {
    const result = await api.register(name, email, phone, password, role, location);
    if (result.ok) {
      setUser(result.data.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (userData) => {
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
=======
  const [loading, setLoading] = useState(true);

  // On mount: check if there's a stored user and validate it still exists in the backend
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      // Validate with backend that this user still exists
      fetch(`${API_BASE}/api/users/${parsed.id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('User not found');
        })
        .then((data) => {
          if (data.success) {
            setUser(data.data);
          } else {
            localStorage.removeItem('user');
            localStorage.removeItem('role');
          }
        })
        .catch(() => {
          localStorage.removeItem('user');
          localStorage.removeItem('role');
        })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('role', userData.role.toLowerCase());
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setUser(null);
  }, []);

  const value = { user, loading, login, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
>>>>>>> 8842d0d097e028a5bf77b37e25309ec8041f382c
}
