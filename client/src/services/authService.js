import { apiClient } from './apiClient';

const AUTH_STORAGE_KEY = 'cultivate_auth_user_v1';
const TOKEN_STORAGE_KEY = 'cultivate_auth_token_v1';
const PROGRESS_PREFIX = 'cultivate_progress_';
const FARM_STORAGE_KEY = 'cultivate_farm_simulator_v2';
const ADMIN_CONFIG_KEY = 'cultivate_admin_config_v1';

// DEMO_PERSONAS is kept for reference but no longer rendered in AuthPage UI
export const DEMO_PERSONAS = [
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@wageningen.edu',
    role: 'learner',
    roleLabel: 'Agroecology Student',
    institution: 'Wageningen University',
    avatar: 'ER',
    bio: 'Undergraduate student researching living mulch and organic pest resistance in Solanaceae crops.',
  },
  {
    id: 'user-marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@cornell.edu',
    role: 'instructor',
    roleLabel: 'Agricultural Educator',
    institution: 'Cornell Agroecology Lab',
    avatar: 'MV',
    bio: 'Instructor and extension specialist running regenerative soil workshops and organic trial plots.',
  },
  {
    id: 'user-sarah',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@cultivate.org',
    role: 'admin',
    roleLabel: 'Curriculum Administrator',
    institution: 'Cultivate Foundation',
    avatar: 'SJ',
    bio: 'Curriculum director overseeing biological farming courses, quiz calibrations, and simulator rule coefficients.',
  },
];

/** Clear all user-namespaced caches from localStorage */
function clearAllUserCaches() {
  try {
    // Clear progress caches (all users)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PROGRESS_PREFIX) || k === 'cultivate_learning_progress_v1')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Clear farm simulator cache
    localStorage.removeItem(FARM_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export const authService = {
  // Retrieve currently active session synchronously from local cache
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore parse errors
    }
    return null;
  },

  // Save session to localStorage
  setCurrentUser(user, token = null) {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        if (token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
        }
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  },

  // Login with credentials via backend API
  async login(email, password) {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data?.success && res.data.user) {
        const sessionUser = {
          ...res.data.user,
          token: res.data.token,
          loggedInAt: new Date().toISOString(),
        };
        this.setCurrentUser(sessionUser, res.data.token);
        return { success: true, user: sessionUser };
      }
      return { success: false, reason: res.data?.message || 'Login failed.' };
    } catch (err) {
      const reason = err.extractedMessage || 'Invalid email or password.';
      return { success: false, reason };
    }
  },

  // Persona login for academic demo accounts — requires server validation
  async loginAsPersona(personaId) {
    try {
      const res = await apiClient.post('/auth/persona-login', { personaId });
      if (res.data?.success && res.data.user) {
        const sessionUser = {
          ...res.data.user,
          token: res.data.token,
          loggedInAt: new Date().toISOString(),
        };
        this.setCurrentUser(sessionUser, res.data.token);
        return { success: true, user: sessionUser };
      }
      return { success: false, reason: res.data?.message || 'Persona login failed.' };
    } catch (err) {
      // No offline fallback — persona login requires server validation
      return {
        success: false,
        reason: err.extractedMessage || 'Persona login failed. Please check your connection.',
      };
    }
  },

  // Register a new learner account via backend API
  async register({ name, email, password, institution }) {
    try {
      const res = await apiClient.post('/auth/register', {
        name,
        email,
        password,
        institution,
      });

      if (res.data?.success && res.data.user) {
        const sessionUser = {
          ...res.data.user,
          token: res.data.token,
          registeredAt: new Date().toISOString(),
          loggedInAt: new Date().toISOString(),
        };
        this.setCurrentUser(sessionUser, res.data.token);
        return { success: true, user: sessionUser };
      }
      return { success: false, reason: res.data?.message || 'Registration failed.' };
    } catch (err) {
      return {
        success: false,
        reason: err.extractedMessage || 'Registration failed. Please check your inputs.',
      };
    }
  },

  // Logout via backend API to revoke token, then clear ALL cached user data
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network errors on logout — still clear local state
    } finally {
      clearAllUserCaches();
      this.setCurrentUser(null);
    }
    return { success: true };
  },

  // Fetch current user from server and update cached profile
  async getProfile() {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.success && res.data.user) {
        const current = this.getCurrentUser();
        const updated = { ...current, ...res.data.user };
        this.setCurrentUser(updated);
        return updated;
      }
    } catch {
      // ignore profile fetch errors
    }
    return this.getCurrentUser();
  },
};
