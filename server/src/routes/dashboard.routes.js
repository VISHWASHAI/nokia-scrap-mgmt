import { Router } from 'express';
import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const today = dayjs().startOf('day').toDate();
    const weekStart = dayjs().subtract(6, 'day').startOf('day').toDate();

    const [todayLedger, weekLedger, pendingCount, activeCount] = await Promise.all([
      prisma.generationDisposalLedger.aggregate({
        where: { date: { gte: today } },
        _sum: { waste_for_day: true },
      }),
      prisma.generationDisposalLedger.aggregate({
        where: { date: { gte: weekStart } },
        _sum: { waste_for_day: true },
      }),
      prisma.scrapDeclaration.count({
        where: { status: { notIn: ['DRAFT', 'COMPLETED'] } },
      }),
      prisma.scrapDeclaration.count({
        where: { status: { in: ['SUBMITTED', 'DEPT_APPROVED', 'IREP_AUTHORIZED'] } },
      }),
    ]);

    ok(res, {
      today_total_kg: Number(todayLedger._sum.waste_for_day ?? 0),
      week_total_kg: Number(weekLedger._sum.waste_for_day ?? 0),
      pending_approvals: pendingCount,
      active_declarations: activeCount,
    });
  } catch (err) { next(err); }
});

router.get('/ledger', async (req, res, next) => {
  try {
    const dateFrom = req.query.date_from || dayjs().subtract(29, 'day').format('YYYY-MM-DD');
    const dateTo = req.query.date_to || dayjs().format('YYYY-MM-DD');
    const source = req.query.source;

    const where = {
      date: { gte: new Date(dateFrom), lte: new Date(dateTo + 'T23:59:59Z') },
    };
    if (source && source !== 'ALL') where.source = source;

    const ledger = await prisma.generationDisposalLedger.findMany({
      where,
      orderBy: [{ date: 'asc' }, { category: 'asc' }],
    });

    // Group by category + source for bar chart
    const byCategory = {};
    ledger.forEach(l => {
      if (!byCategory[l.category]) byCategory[l.category] = { category: l.category, BAT: 0, SOFT: 0, COMBINED: 0 };
      byCategory[l.category][l.source] = (byCategory[l.category][l.source] || 0) + Number(l.waste_for_day);
    });

    ok(res, {
      raw: ledger,
      by_category: Object.values(byCategory),
    });
  } catch (err) { next(err); }
});

router.get('/trends', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = dayjs().subtract(days - 1, 'day').startOf('day').toDate();
    // Accept single ?category= OR repeated ?categories=a&categories=b (sub-group expansion)
    const cats = [].concat(req.query.categories || req.query.category || []).filter(Boolean);

    const where = { date: { gte: from } };
    if (cats.length === 1) where.category = cats[0];
    else if (cats.length > 1) where.category = { in: cats };

    const ledger = await prisma.generationDisposalLedger.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Aggregate by date + source
    const byDate = {};
    ledger.forEach(l => {
      const d = dayjs(l.date).format('YYYY-MM-DD');
      if (!byDate[d]) byDate[d] = { date: d, BAT: 0, SOFT: 0, COMBINED: 0 };
      byDate[d][l.source] = (byDate[d][l.source] || 0) + Number(l.waste_for_day);
    });

    ok(res, Object.values(byDate));
  } catch (err) { next(err); }
});

router.get('/circularity', async (req, res, next) => {
  try {
    const weekStart = dayjs().startOf('week').toDate();

    const ledger = await prisma.generationDisposalLedger.findMany({
      where: { date: { gte: weekStart } },
    });

    const matrix = {};
    ledger.forEach(l => {
      if (!matrix[l.category]) matrix[l.category] = { category: l.category, GENERAL: 0, HAZARDOUS: 0, EWASTE: 0 };
      matrix[l.category][l.waste_type] = (matrix[l.category][l.waste_type] || 0) + Number(l.waste_for_day);
    });

    // Donut breakdown by waste_type
    const byType = { GENERAL: 0, HAZARDOUS: 0, EWASTE: 0 };
    ledger.forEach(l => { byType[l.waste_type] += Number(l.waste_for_day); });

    ok(res, { by_function: Object.values(matrix), by_type: byType });
  } catch (err) { next(err); }
});

export default router;
