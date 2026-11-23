/**
 * Role-Based Authorization Middleware (RBAC)
 * Restricts access to endpoints based on user roles ('learner', 'instructor', 'admin').
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Requires one of [${roles.join(', ')}] roles, but user has role '${req.user.role}'.`,
      });
    }

    next();
  };
};

