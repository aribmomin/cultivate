import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/**
 * ProtectedRoute — renders children only if the user is authenticated.
 * On unauthenticated access, redirects to /login and preserves the
 * intended destination so the user can be redirected back after login.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

