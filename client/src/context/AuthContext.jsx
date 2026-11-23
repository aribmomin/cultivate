import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance';
import { authService } from '../services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  // Background profile synchronization on initial load
  useEffect(() => {
    let isMounted = true;
    if (authService.getCurrentUser()) {
      authService.getProfile().then((fresh) => {
        if (isMounted && fresh) setUser(fresh);
      }).catch(() => {
        // If profile fetch fails (401 = expired token), force logout
        if (isMounted) {
          authService.setCurrentUser(null);
          setUser(null);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for forced logout events (e.g., from apiClient 401 interceptor)
  useEffect(() => {
    const handleForceLogout = () => {
      authService.setCurrentUser(null);
      setUser(null);
    };
    window.addEventListener('cultivate:force-logout', handleForceLogout);
    return () => window.removeEventListener('cultivate:force-logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const loginAsPersona = async (personaId) => {
    const res = await authService.loginAsPersona(personaId);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const register = async (params) => {
    const res = await authService.register(params);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const logout = useCallback(async () => {
    // Clear server token first (best effort)
    await authService.logout();
    // Immediately clear React state — this triggers re-renders in all subscribers
    setUser(null);
    // Dispatch storage event so any non-React code can react
    try {
      window.dispatchEvent(new CustomEvent('cultivate:logout'));
    } catch {
      // ignore
    }
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        loginAsPersona,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
