const { hasRole, hasPermission } = require("../config/permissions");

/**
 * Middleware enforcing role-based access control
 * @param  {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }

    if (!hasRole(req.user, allowedRoles)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(", ")}`,
        currentRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware enforcing granular permission checks
 * @param {string} requiredPermission
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }

    if (!hasPermission(req.user, requiredPermission)) {
      return res.status(403).json({
        message: `Forbidden: Requires permission '${requiredPermission}'`,
        currentRole: req.user.role,
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requirePermission,
};
