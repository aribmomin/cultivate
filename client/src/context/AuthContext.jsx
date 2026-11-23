import React, { useState } from 'react';
import { AuthContext } from './authContextInstance';
import { authService } from '../services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  const login = (email, password) => {
    const res = authService.login(email, password);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const loginAsPersona = (personaId) => {
    const res = authService.loginAsPersona(personaId);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const register = (params) => {
    const res = authService.register(params);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
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
