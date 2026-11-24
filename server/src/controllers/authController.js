import { User } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

// Predefined academic demonstration personas aligned with SRS and seeded database
const ALLOWED_DEMO_PERSONAS = [
  {
    personaId: 'user-elena',
    email: 'elena.rostova@wageningen.edu',
    name: 'Elena Rostova',
    role: 'learner',
    roleLabel: 'Agroecology Student',
    institution: 'Wageningen University',
    avatar: 'ER',
    bio: 'Undergraduate student researching living mulch and organic pest resistance in Solanaceae crops.',
  },
  {
    personaId: 'user-marcus',
    email: 'marcus.vance@cornell.edu',
    name: 'Marcus Vance',
    role: 'instructor',
    roleLabel: 'Agricultural Educator',
    institution: 'Cornell Agroecology Lab',
    avatar: 'MV',
    bio: 'Instructor and extension specialist running regenerative soil workshops and organic trial plots.',
  },
  {
    personaId: 'user-sarah',
    email: 'sarah.jenkins@cultivate.org',
    legacyEmail: 'sarah.jenkins@terralearn.org',
    name: 'Dr. Sarah Jenkins',
    role: 'admin',
    roleLabel: 'Curriculum Administrator',
    institution: 'Cultivate Foundation',
    avatar: 'SJ',
    bio: 'Curriculum director overseeing biological farming courses, quiz calibrations, and simulator rule coefficients.',
  },
];

const sanitizeUser = (user) => ({
  _id: user._id.toString(),
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  roleLabel: user.roleLabel,
  institution: user.institution,
  avatar: user.avatar,
  bio: user.bio,
  xp: user.xp || 0,
  level: user.level || 1,
  unlockedBadges: user.unlockedBadges || [],
  createdAt: user.createdAt,
});

/**
 * POST /api/auth/register
 * Register a new learner account. Public registration is strictly restricted to the 'learner' role.
 */
export const register = async (req, res) => {
  const { name, email, password, institution } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid full name (minimum 2 characters).',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Prevent duplicate registration
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'An account with this email address already exists.',
    });
  }

  // Generate initials for avatar
  const initials =
    name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'OL';

  // Enforce security rule: Public registration NEVER assigns privileged roles
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password, // Handled by pre-save bcrypt hash
    role: 'learner',
    roleLabel: 'Student Learner',
    institution: institution?.trim() || 'Independent Organic Learner',
    avatar: initials,
    bio: `Enthusiastic organic farming student exploring regenerative soil biology at ${
      institution || 'TerraLearn'
    }.`,
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Account registered successfully.',
    token,
    user: sanitizeUser(user),
  });
};

/**
 * POST /api/auth/login
 * Authenticate with email & password.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Explicitly select passwordHash
  let user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user && (normalizedEmail === 'sarah.jenkins@cultivate.org' || normalizedEmail === 'sarah.jenkins@terralearn.org')) {
    user = await User.findOne({
      email: { $in: ['sarah.jenkins@cultivate.org', 'sarah.jenkins@terralearn.org'] },
    }).select('+password');
  }
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Authentication successful.',
    token,
    user: sanitizeUser(user),
  });
};

/**
 * POST /api/auth/persona-login
 * One-click demo login for verified academic personas.
 */
export const personaLogin = async (req, res) => {
  // Configurable demo access
  if (process.env.DEMO_PERSONAS_ENABLED === 'false') {
    return res.status(403).json({
      success: false,
      message: 'Demo persona login is disabled in this environment.',
    });
  }

  const { personaId, email } = req.body;

  // Match against predefined allowed personas
  const matchedPersona = ALLOWED_DEMO_PERSONAS.find(
    (p) =>
      (personaId && p.personaId === personaId) ||
      (email && (p.email.toLowerCase() === email.trim().toLowerCase() || (p.legacyEmail && p.legacyEmail.toLowerCase() === email.trim().toLowerCase())))
  );

  if (!matchedPersona) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid persona requested. Only approved academic demo personas are permitted.',
    });
  }

  // Admin persona guard: Always require administrator password
  if (matchedPersona.role === 'admin') {
    const { password } = req.body;
    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication requires the administrator password.',
      });
    }
    const adminUser = await User.findOne({
      email: { $in: [matchedPersona.email, matchedPersona.legacyEmail] },
    }).select('+password');
    if (!adminUser || !(await adminUser.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password.',
      });
    }
  }

  // Retrieve or upsert the persona in database
  let user = await User.findOne({
    email: { $in: [matchedPersona.email, ...(matchedPersona.legacyEmail ? [matchedPersona.legacyEmail] : [])] },
  });
  if (!user) {
    user = await User.create({
      ...matchedPersona,
      password: matchedPersona.role === 'admin' ? 'CultivateAdmin@2026' : 'password123',
    });
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: `Signed in as ${user.name} (${user.roleLabel})`,
    token,
    user: sanitizeUser(user),
  });
};

/**
 * POST /api/auth/logout
 * Server-enforced token invalidation via token versioning.
 */
export const logout = async (req, res) => {
  // Invalidate all tokens issued prior to this call
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Authentication token has been invalidated.',
  });
};

/**
 * GET /api/auth/me
 * Retrieve the current authenticated user's profile.
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

/**
 * PUT /api/auth/profile
 * Update user profile details (name, institution, bio, avatar).
 */
export const updateProfile = async (req, res) => {
  const { name, institution, bio, avatar } = req.body;
  const user = req.user;

  if (name && name.trim().length >= 2) {
    user.name = name.trim();
  }
  if (institution !== undefined) {
    user.institution = institution.trim();
  }
  if (bio !== undefined) {
    user.bio = bio.trim().substring(0, 500);
  }
  if (avatar !== undefined) {
    user.avatar = avatar.trim().substring(0, 5);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    user: sanitizeUser(user),
  });
};

