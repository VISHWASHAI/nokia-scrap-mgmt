import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { listLedger, createLedgerRow, updateLedgerRow, deleteLedgerRow } from '../services/ledger.service.js';
import { ok } from '../utils/response.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try { ok(res, await listLedger(req.query)); } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try { ok(res, await createLedgerRow(req.body, req.user.id), 201); } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try { ok(res, await updateLedgerRow(req.params.id, req.body, req.user.id)); } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try { await deleteLedgerRow(req.params.id, req.user.id); ok(res, { deleted: true }); } catch (err) { next(err); }
});

export default router;
