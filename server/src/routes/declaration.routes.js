import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireMinRole } from '../middleware/rbac.middleware.js';
import { createDeclarationSchema } from '../schemas/declaration.schema.js';
import {
  createDeclaration,
  submitDeclaration,
  approveDeclaration,
  getDeclarations,
  getDeclarationById,
} from '../services/declaration.service.js';
import { generateReport } from '../services/excel.service.js';
import { uploadToOneDrive } from '../services/graph.upload.js';
import { ok } from '../utils/response.js';
import dayjs from 'dayjs';

const router = Router();
router.use(authenticate);

router.post('/', validate(createDeclarationSchema), async (req, res, next) => {
  try {
    const decl = await createDeclaration(req.body, req.user);
    ok(res, decl, 201);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await getDeclarations(req.query, req.user);
    ok(res, result);
  } catch (err) { next(err); }
});

router.get('/export/excel', requireMinRole('ZONE_MANAGER'), async (req, res, next) => {
  try {
    const dateFrom = req.query.date_from || dayjs().format('YYYY-MM-DD');
    const dateTo = req.query.date_to || dayjs().format('YYYY-MM-DD');
    const buffer = await generateReport(dateFrom, dateTo);
    const filename = `Nokia_Scrap_Report_${dayjs().format('YYYYMMDD')}.xlsx`;

    // Log manual download
    const { uploadToOneDrive: upload } = await import('../services/graph.upload.js');
    upload(buffer, filename, null, 'MANUAL_DOWNLOAD').catch(() => {});

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const decl = await getDeclarationById(req.params.id, req.user);
    ok(res, decl);
  } catch (err) { next(err); }
});

router.patch('/:id/submit', async (req, res, next) => {
  try {
    const updated = await submitDeclaration(req.params.id, req.user, req.ip);
    ok(res, updated);
  } catch (err) { next(err); }
});

router.patch('/:id/approve', requireMinRole('ZONE_MANAGER'), async (req, res, next) => {
  try {
    const updated = await approveDeclaration(req.params.id, req.user, req.ip);
    ok(res, updated);
  } catch (err) { next(err); }
});

export default router;
