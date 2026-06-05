import { AppError } from '../utils/AppError.js';

const ROLE_RANK = {
  EMPLOYEE: 1,
  ZONE_MANAGER: 2,
  DEPT_HEAD: 3,
  IREP: 4,
  SECURITY: 5,
  FACILITY_MANAGER: 6,
  ADMIN: 7,
};

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    if ((ROLE_RANK[req.user.role] ?? 0) < (ROLE_RANK[minRole] ?? 99)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}
