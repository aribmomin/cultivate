import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Protect middleware:
 * Validates JWT, verifies token signature, checks expiration,
 * and validates server-side tokenVersion for true token invalidation.
 */
export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const secret =
      process.env.JWT_SECRET ||
      'terralearn_super_secure_jwt_secret_change_in_production_2026';
    const decoded = jwt.verify(token, secret);

    // Retrieve active user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Token version check: handles true server-side token invalidation
    if (user.tokenVersion !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'This session has been logged out or revoked. Please sign in again.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

/**
 * Optional authentication middleware:
 * If an Authorization header is provided, populates req.user.
 * If not, allows the request to continue unauthenticated.
 */
export const optionalAuth = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret =
      process.env.JWT_SECRET ||
      'terralearn_super_secure_jwt_secret_change_in_production_2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (user && user.tokenVersion === (decoded.tokenVersion || 0)) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
};

