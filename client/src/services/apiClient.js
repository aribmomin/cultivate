import axios from 'axios';

/**
 * Centralized Axios API client.
 * Configured with baseURL, request token injection, and unified error handling.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT token to outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    try {
      // Check for standalone token or session user token
      const token =
        localStorage.getItem('terralearn_auth_token_v1') ||
        (() => {
          const userRaw = localStorage.getItem('terralearn_auth_user_v1');
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

// Response interceptor: Extract consistent error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';
    return Promise.reject({
      ...error,
      extractedMessage: message,
    });
  }
);

