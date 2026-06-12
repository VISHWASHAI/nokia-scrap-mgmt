import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { createDisposalInvoiceSchema } from '../schemas/disposalInvoice.schema.js';
import { parseInvoiceBuffer, createDisposalInvoice, getDisposalInvoices, getStockFor, DISPOSAL_ROLES } from '../services/disposal.service.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new AppError('Only PDF files are accepted', 422, 'INVALID_FILE_TYPE'));
  },
});

// Parse an uploaded invoice PDF — returns extracted header + matched line items. Nothing saved.
router.post('/parse', requireRole(...DISPOSAL_ROLES), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No PDF file uploaded', 422, 'NO_FILE');
    const result = await parseInvoiceBuffer(req.file.buffer);
    result.header.source_file = req.file.originalname;
    ok(res, result);
  } catch (err) { next(err); }
});

// Confirm a parsed invoice — persists it and subtracts quantities from the ledger.
router.post('/', requireRole(...DISPOSAL_ROLES), validate(createDisposalInvoiceSchema), async (req, res, next) => {
  try {
    const invoice = await createDisposalInvoice(req.body, req.user);
    ok(res, invoice, 201);
  } catch (err) { next(err); }
});

// Live stock lookup for a category — current stock on hand. Used by the review preview.
router.get('/stock', requireRole(...DISPOSAL_ROLES), async (req, res, next) => {
  try {
    if (!req.query.category) throw new AppError('category is required', 422, 'NO_CATEGORY');
    const stock = await getStockFor(req.query.category);
    ok(res, stock);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await getDisposalInvoices(req.query);
    ok(res, result);
  } catch (err) { next(err); }
});

export default router;
