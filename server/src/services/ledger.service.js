import prisma from '../utils/prisma.js';
import dayjs from 'dayjs';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';

const n = (v, fallback = 0) => {
  if (v === null || v === undefined || v === '') return fallback;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const dateOnly = (d) => new Date(dayjs(d).format('YYYY-MM-DD'));

// Paginated ledger rows with filters — for the editable ledger view.
export async function listLedger(query) {
  const where = {};
  if (query.date_from) where.date = { ...where.date, gte: dateOnly(query.date_from) };
  if (query.date_to) where.date = { ...where.date, lte: dateOnly(query.date_to) };
  if (query.source) where.source = query.source;
  if (query.waste_type) where.waste_type = query.waste_type;
  if (query.category) where.category = { contains: query.category, mode: 'insensitive' };

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(200, parseInt(query.limit) || 50);

  const [items, total] = await Promise.all([
    prisma.generationDisposalLedger.findMany({
      where, orderBy: [{ date: 'desc' }, { category: 'asc' }],
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.generationDisposalLedger.count({ where }),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function createLedgerRow(body, userId) {
  if (!body.date || !body.category || !body.waste_type || !body.source) {
    throw new AppError('date, category, waste_type and source are required', 422, 'VALIDATION_ERROR');
  }
  const opening = n(body.opening_stock), waste = n(body.waste_for_day), disposal = n(body.disposal);
  const row = await prisma.generationDisposalLedger.create({
    data: {
      date: dateOnly(body.date), category: body.category, waste_type: body.waste_type, source: body.source,
      opening_stock: opening, waste_for_day: waste, disposal, closing_stock: opening + waste - disposal,
      declaration_id: null,
    },
  });
  await logAudit({ userId, action: 'LEDGER_ROW_CREATED', entity: 'generation_disposal_ledger', entityId: row.id,
    newValue: { date: body.date, category: row.category, source: row.source } });
  return row;
}

export async function updateLedgerRow(id, body, userId) {
  const existing = await prisma.generationDisposalLedger.findUnique({ where: { id } });
  if (!existing) throw new AppError('Ledger row not found', 404, 'NOT_FOUND');

  const opening = n(body.opening_stock, Number(existing.opening_stock));
  const waste = n(body.waste_for_day, Number(existing.waste_for_day));
  const disposal = n(body.disposal, Number(existing.disposal));
  const row = await prisma.generationDisposalLedger.update({
    where: { id },
    data: {
      opening_stock: opening, waste_for_day: waste, disposal, closing_stock: opening + waste - disposal,
      ...(body.date ? { date: dateOnly(body.date) } : {}),
      ...(body.category ? { category: body.category } : {}),
      ...(body.source ? { source: body.source } : {}),
      ...(body.waste_type ? { waste_type: body.waste_type } : {}),
    },
  });
  await logAudit({ userId, action: 'LEDGER_ROW_UPDATED', entity: 'generation_disposal_ledger', entityId: id,
    oldValue: { closing: Number(existing.closing_stock) }, newValue: { closing: Number(row.closing_stock) } });
  return row;
}

export async function deleteLedgerRow(id, userId) {
  const existing = await prisma.generationDisposalLedger.findUnique({ where: { id } });
  if (!existing) throw new AppError('Ledger row not found', 404, 'NOT_FOUND');
  await prisma.generationDisposalLedger.delete({ where: { id } });
  await logAudit({ userId, action: 'LEDGER_ROW_DELETED', entity: 'generation_disposal_ledger', entityId: id,
    oldValue: { date: existing.date, category: existing.category, source: existing.source } });
}

export async function getLedger(query) {
  const where = {};
  if (query.date_from) where.date = { ...where.date, gte: new Date(query.date_from) };
  if (query.date_to) where.date = { ...where.date, lte: new Date(query.date_to + 'T23:59:59Z') };
  if (query.source) where.source = query.source;
  if (query.waste_type) where.waste_type = query.waste_type;

  return prisma.generationDisposalLedger.findMany({
    where,
    orderBy: [{ date: 'desc' }, { category: 'asc' }],
  });
}

export async function updateDisposal(id, disposal, userId) {
  const entry = await prisma.generationDisposalLedger.findUnique({ where: { id } });
  if (!entry) throw new Error('Ledger entry not found');

  const closing = Number(entry.opening_stock) + Number(entry.waste_for_day) - disposal;
  return prisma.generationDisposalLedger.update({
    where: { id },
    data: { disposal, closing_stock: closing },
  });
}
