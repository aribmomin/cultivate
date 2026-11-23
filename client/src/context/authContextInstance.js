import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: () => {},
  loginAsPersona: () => {},
  register: () => {},
  logout: () => {}
});
