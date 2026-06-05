export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  ZONE_MANAGER: 'ZONE_MANAGER',
  DEPT_HEAD: 'DEPT_HEAD',
  IREP: 'IREP',
  SECURITY: 'SECURITY',
  FACILITY_MANAGER: 'FACILITY_MANAGER',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  ZONE_MANAGER: 'Zone Manager',
  DEPT_HEAD: 'Dept Head',
  IREP: 'IREP Officer',
  SECURITY: 'Security Officer',
  FACILITY_MANAGER: 'Facility Manager',
  ADMIN: 'Admin',
};

export const ROLE_RANK = {
  EMPLOYEE: 1,
  ZONE_MANAGER: 2,
  DEPT_HEAD: 3,
  IREP: 4,
  SECURITY: 5,
  FACILITY_MANAGER: 6,
  ADMIN: 7,
};

export function hasMinRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 99);
}
