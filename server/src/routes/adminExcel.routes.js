import { Router } from 'express';
import dayjs from 'dayjs';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireMinRole } from '../middleware/rbac.middleware.js';
import { generateReport } from '../services/excel.service.js';
import { uploadToOneDrive } from '../services/graph.upload.js';
import prisma from '../utils/prisma.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate, requireMinRole('FACILITY_MANAGER'));

router.post('/push-to-onedrive', async (req, res, next) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const buffer = await generateReport(today, today);
    const filename = `Nokia_Scrap_Report_${dayjs().format('YYYYMMDD_HHmm')}_manual.xlsx`;
    const result = await uploadToOneDrive(buffer, filename, null, 'MANUAL_DOWNLOAD');
    ok(res, result);
  } catch (err) { next(err); }
});

router.get('/export-log', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const [items, total] = await Promise.all([
      prisma.excelExportLog.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.excelExportLog.count(),
    ]);

    ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
