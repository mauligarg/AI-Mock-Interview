export type Role = "student" | "mentor" | "admin";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
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

export function getEffectivePermissions(role?: Role, customPermissions: string[] = []): string[] {
  if (!role) return [];
  const base = ROLE_PERMISSIONS[role] || [];
  return Array.from(new Set([...base, ...customPermissions]));
}

export function checkHasRole(userRole?: string, allowedRoles?: Role | Role[]): boolean {
  if (!userRole || !allowedRoles) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(userRole as Role);
  }
  return userRole === allowedRoles;
}

export function checkHasPermission(
  userRole?: Role,
  userPermissions: string[] = [],
  requiredPermission?: string
): boolean {
  if (!userRole || !requiredPermission) return false;
  const effective = getEffectivePermissions(userRole, userPermissions);
  return effective.includes(requiredPermission);
}
