import React, { useState, useEffect } from 'react';
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
      });
    }
    return () => {
      isMounted = false;
    };
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

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

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
