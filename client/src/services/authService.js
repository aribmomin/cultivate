// Mock Authentication Service for Phase 1
// Clean client-side session management ready to swap for Express JWT REST endpoints in Phase 2

const AUTH_STORAGE_KEY = 'terralearn_auth_user_v1';

export const DEMO_PERSONAS = [
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@wageningen.edu',
    role: 'learner',
    roleLabel: 'Agroecology Student',
    institution: 'Wageningen University',
    avatar: 'ER',
    bio: 'Undergraduate student researching living mulch and organic pest resistance in Solanaceae crops.'
  },
  {
    id: 'user-marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@cornell.edu',
    role: 'instructor',
    roleLabel: 'Agricultural Educator',
    institution: 'Cornell Agroecology Lab',
    avatar: 'MV',
    bio: 'Instructor and extension specialist running regenerative soil workshops and organic trial plots.'
  },
  {
    id: 'user-sarah',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@terralearn.org',
    role: 'admin',
    roleLabel: 'Curriculum Administrator',
    institution: 'TerraLearn Foundation',
    avatar: 'SJ',
    bio: 'Curriculum director overseeing biological farming courses, quiz calibrations, and simulator rule coefficients.'
  }
];

export const authService = {
  // Retrieve currently active session
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

  // Save session
  setCurrentUser(user) {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  },

  // Login with credentials
  login(email, password) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, reason: 'Please enter a valid email address.' };
    }

    if (!password || password.length < 6) {
      return { success: false, reason: 'Password must be at least 6 characters.' };
    }

    // Check if it matches a demo persona
    const persona = DEMO_PERSONAS.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );

    const user = persona || {
      id: `user-${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: email.trim().toLowerCase(),
      role: 'learner',
      roleLabel: 'Student Grower',
      institution: 'Independent Organic Learner',
      avatar: email.substring(0, 2).toUpperCase(),
      bio: 'Enthusiastic organic farming student exploring regenerative soil and 2D simulation.'
    };

    const sessionUser = {
      ...user,
      token: `mock-jwt-token-${Date.now()}`,
      loggedInAt: new Date().toISOString()
    };

    this.setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  },

  // Quick 1-click login for demo personas
  loginAsPersona(personaId) {
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId) || DEMO_PERSONAS[0];
    const sessionUser = {
      ...persona,
      token: `mock-jwt-token-${persona.id}-${Date.now()}`,
      loggedInAt: new Date().toISOString()
    };

    this.setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  },

  // Register a new learner account
  register({ name, email, password, role = 'learner', institution }) {
    if (!name || name.trim().length < 2) {
      return { success: false, reason: 'Please provide your full name (at least 2 characters).' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, reason: 'Please provide a valid academic or personal email.' };
    }

    if (!password || password.length < 6) {
      return { success: false, reason: 'Password must be at least 6 characters long.' };
    }

    const initials = name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'OL';

    const roleLabelMap = {
      learner: 'Student Learner',
      instructor: 'Organic Educator',
      admin: 'Platform Administrator'
    };

    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      roleLabel: roleLabelMap[role] || 'Student Learner',
      institution: institution?.trim() || 'Independent Organic Grower',
      avatar: initials,
      bio: `Registered organic agroecology learner at ${institution || 'TerraLearn'}.`,
      token: `mock-jwt-token-${Date.now()}`,
      registeredAt: new Date().toISOString(),
      loggedInAt: new Date().toISOString()
    };

    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
  },

  // Logout
  logout() {
    this.setCurrentUser(null);
    return { success: true };
  }
};
