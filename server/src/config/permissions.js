const ROLE_PERMISSIONS = {
  student: [
    "interview:start",
    "interview:view-own",
    "report:view-own",
    "challenge:participate",
    "readiness:view-own",
    "security:view-own",
  ],
  mentor: [
    "student:view-assigned",
    "student:review",
    "mentor:feedback:create",
    "report:view-assigned",
    "security:view-own",
  ],
  admin: [
    "user:manage",
    "role:manage",
    "platform:view-activity",
    "settings:manage",
    "security:view-all",
    "security:view-own",
    "student:view-all",
    "student:view-assigned",
    "student:review",
    "mentor:feedback:create",
    "interview:start",
    "interview:view-own",
    "report:view-own",
    "challenge:participate",
    "readiness:view-own",
  ],
};

const ALLOWED_ROLES = ["student", "mentor", "admin"];

function getEffectivePermissions(user) {
  if (!user || !user.role) return [];
  const basePermissions = ROLE_PERMISSIONS[user.role] || [];
  const customPermissions = user.permissions || [];
  return Array.from(new Set([...basePermissions, ...customPermissions]));
}

function hasPermission(user, requiredPermission) {
  if (!user) return false;
  const effective = getEffectivePermissions(user);
  return effective.includes(requiredPermission);
}

function hasRole(user, requiredRole) {
  if (!user) return false;
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
}

module.exports = {
  ROLE_PERMISSIONS,
  ALLOWED_ROLES,
  getEffectivePermissions,
  hasPermission,
  hasRole,
};
