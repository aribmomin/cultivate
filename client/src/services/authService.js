import { apiClient } from './apiClient';

const AUTH_STORAGE_KEY = 'terralearn_auth_user_v1';
const TOKEN_STORAGE_KEY = 'terralearn_auth_token_v1';

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
    email: 'sarah.jenkins@terralearn.org',
    role: 'admin',
    roleLabel: 'Curriculum Administrator',
    institution: 'TerraLearn Foundation',
    avatar: 'SJ',
    bio: 'Curriculum director overseeing biological farming courses, quiz calibrations, and simulator rule coefficients.',
  },
];

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

  // 1-Click login for academic demo personas via backend API
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
      // Fallback to offline demo persona if server is temporarily unreachable
      const persona = DEMO_PERSONAS.find((p) => p.id === personaId) || DEMO_PERSONAS[0];
      const sessionUser = {
        ...persona,
        token: `offline-token-${persona.id}-${Date.now()}`,
        loggedInAt: new Date().toISOString(),
      };
      this.setCurrentUser(sessionUser, sessionUser.token);
      return { success: true, user: sessionUser };
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

  // Logout via backend API to revoke token
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      this.setCurrentUser(null);
    }
    return { success: true };
  },

  // Fetch current user from server
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
