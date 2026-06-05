import { Router } from 'express';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireMinRole } from '../middleware/rbac.middleware.js';
import { generateReport, triggerExport } from '../services/excel.service.js';
import { getReportFileInfo, REPORT_PATH } from '../services/localExport.service.js';
import prisma from '../utils/prisma.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate, requireMinRole('FACILITY_MANAGER'));

// Generate a fresh full-history report, save locally, and stream it to the browser
router.post('/generate-report', async (req, res, next) => {
  try {
    await triggerExport(null, 'MANUAL_DOWNLOAD');
    ok(res, { message: 'Report generated and saved successfully.' });
  } catch (err) { next(err); }
});

// Stream the saved local report file as a download
router.get('/download-report', async (req, res, next) => {
  try {
    const info = getReportFileInfo();
    if (!info) {
      // No file yet — generate on the fly
      const buffer = await generateReport();
      res.setHeader('Content-Disposition', 'attachment; filename="Nokia_Scrap_Report.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.setHeader('Content-Disposition', 'attachment; filename="Nokia_Scrap_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', info.size);
    fs.createReadStream(REPORT_PATH).pipe(res);
  } catch (err) { next(err); }
});

// Report file info (size, last modified)
router.get('/report-info', async (req, res, next) => {
  try {
    const info = getReportFileInfo();
    ok(res, info ?? { exists: false });
  } catch (err) { next(err); }
});

// Export log history
router.get('/export-log', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
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
