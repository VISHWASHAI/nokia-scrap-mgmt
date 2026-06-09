import { Router } from 'express';
import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/audit-logs', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const { action, user_id, search, date_from, date_to } = req.query;

    const where = {};

    if (action)    where.action  = action;
    if (user_id)   where.user_id = user_id;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = dayjs(date_from).startOf('day').toDate();
      if (date_to)   where.created_at.lte = dayjs(date_to).endOf('day').toDate();
    }

    // Full-name / emp_no search via relation filter
    if (search) {
      where.user = {
        OR: [
          { name:   { contains: search, mode: 'insensitive' } },
          { emp_no: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, emp_no: true, role: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    ok(res, { logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// Distinct action types present in the log (for filter dropdown)
router.get('/audit-logs/actions', async (req, res, next) => {
  try {
    const rows = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    ok(res, rows.map(r => r.action));
  } catch (err) { next(err); }
});

// All employees (minimal) for the user filter dropdown
router.get('/employees-list', async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, emp_no: true, role: true },
      orderBy: { name: 'asc' },
    });
    ok(res, employees);
  } catch (err) { next(err); }
});

export default router;
