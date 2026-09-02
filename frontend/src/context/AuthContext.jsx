import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8080';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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
}
