import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { parseLedgerWorkbook, buildPreview, commitLedgerImport } from '../services/ledgerImport.service.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (/sheet|excel|spreadsheet|\.xlsx?$/i.test(file.mimetype) || /\.xlsx?$/i.test(file.originalname)) cb(null, true);
    else cb(new AppError('Only Excel (.xlsx) files are accepted', 422, 'INVALID_FILE_TYPE'));
  },
});

// Preview a workbook — detected sheets, materials, waste types, dates, row counts. Nothing saved.
router.post('/preview', requireRole('ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No Excel file uploaded', 422, 'NO_FILE');
    ok(res, buildPreview(parseLedgerWorkbook(req.file.buffer)));
  } catch (err) { next(err); }
});

// Commit — write parsed rows into the ledger tagged with the chosen source.
router.post('/commit', requireRole('ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No Excel file uploaded', 422, 'NO_FILE');
    const result = await commitLedgerImport(req.file.buffer, req.body.source, req.user);
    ok(res, result, 201);
  } catch (err) { next(err); }
});

export default router;
