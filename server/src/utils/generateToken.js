import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token containing user identifier, role, and token version.
 * Token versioning allows true server-side token revocation upon logout or password reset.
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'terralearn_super_secure_jwt_secret_change_in_production_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    secret,
    { expiresIn }
  );
};

