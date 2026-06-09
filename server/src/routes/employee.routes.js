import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, requireMinRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employee.schema.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();
router.use(authenticate);

router.get('/me', (req, res) => {
  const { password_hash, ...user } = req.user;
  ok(res, user);
});

router.get('/', requireRole('ADMIN', 'FACILITY_MANAGER'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { emp_no: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: { id: true, emp_no: true, name: true, email: true, role: true, production_function: true, zone: true, is_active: true, created_at: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);

    ok(res, { employees, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN'), validate(createEmployeeSchema), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const password_hash = await bcrypt.hash(password, 12);
    const employee = await prisma.employee.create({
      data: { ...rest, password_hash },
      select: { id: true, emp_no: true, name: true, email: true, role: true, production_function: true, zone: true, is_active: true },
    });
    await logAudit({
      userId: req.user.id,
      action: 'EMPLOYEE_CREATED',
      entity: 'employees',
      entityId: employee.id,
      newValue: { emp_no: employee.emp_no, name: employee.name, role: employee.role },
      ipAddress: req.ip,
    });
    ok(res, employee, 201);
  } catch (err) { next(err); }
});

router.patch('/:id', requireMinRole('FACILITY_MANAGER'), validate(updateEmployeeSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN' && req.body.role) {
      throw new AppError('Only ADMIN can change roles', 403, 'FORBIDDEN');
    }
    const employee = await prisma.employee.update({
      where: { id },
      data: req.body,
      select: { id: true, emp_no: true, name: true, email: true, role: true, production_function: true, zone: true, is_active: true },
    });
    const action = 'is_active' in req.body
      ? (req.body.is_active ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED')
      : 'EMPLOYEE_UPDATED';
    await logAudit({
      userId: req.user.id,
      action,
      entity: 'employees',
      entityId: id,
      newValue: { emp_no: employee.emp_no, name: employee.name, ...req.body },
      ipAddress: req.ip,
    });
    ok(res, employee);
  } catch (err) { next(err); }
});

export default router;
