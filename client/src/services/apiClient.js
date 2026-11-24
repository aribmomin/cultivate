import axios from 'axios';

/**
 * Centralized Axios API client.
 * Configured with baseURL, request token injection, and unified error handling.
 * Normalizes VITE_API_URL for production cloud deployments (Render, Vercel).
 */
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return 'http://localhost:5000/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds to gracefully accommodate free-tier cold starts
});

// Request interceptor: Attach JWT token to outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem('cultivate_auth_token_v1') ||
        (() => {
          const userRaw = localStorage.getItem('cultivate_auth_user_v1');
          if (userRaw) {
            const user = JSON.parse(userRaw);
            return user.token;
          }
          return null;
        })();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore localStorage read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract consistent error messages + handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';

    // On 401 (token expired / invalid), force logout via custom event
    // Skip for auth endpoints themselves to avoid logout loops
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/register') &&
      !error.config?.url?.includes('/auth/persona-login')
    ) {
      try {
        window.dispatchEvent(new CustomEvent('cultivate:force-logout'));
      } catch {
        // ignore
      }
    }

    return Promise.reject({
      ...error,
      extractedMessage: message,
    });
  }
);
