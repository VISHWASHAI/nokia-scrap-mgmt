import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';
import { wasteTypeForCategory } from '../constants/wasteCategories.js';
import { parseDisposalInvoice } from './disposalParser.service.js';
import { matchCategory } from './disposalMatch.service.js';

export const DISPOSAL_ROLES = ['SECURITY', 'IREP', 'ADMIN'];

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Choose the source (BAT/SOFT) whose latest entry holds the most stock — the
 * same source a disposal will be booked against. Defaults to BAT.
 */
async function pickSource(client, category, waste_type) {
  const rows = await client.generationDisposalLedger.findMany({
    where: { category, waste_type },
    orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
  });
  if (!rows.length) return 'BAT';
  const latestBySource = {};
  for (const r of rows) latestBySource[r.source] = r; // ascending → last wins
  return Object.values(latestBySource)
    .sort((a, b) => Number(b.closing_stock) - Number(a.closing_stock))[0].source;
}

/**
 * Stock position for a category on a specific date, on its target source:
 *   opening   = closing balance carried into that date
 *   waste     = generation already recorded on that date
 *   available = opening + waste − disposal already booked that date  (max disposable)
 */
async function getStockForDate(client, category, waste_type, date) {
  const source = await pickSource(client, category, waste_type);
  const rows = await client.generationDisposalLedger.findMany({
    where: { category, waste_type, source },
    orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
  });
  const target = new Date(date);
  const dayRow = rows.find(r => isoDay(r.date) === isoDay(target));

  let opening, waste, priorDisposal;
  if (dayRow) {
    opening = Number(dayRow.opening_stock);
    waste = Number(dayRow.waste_for_day);
    priorDisposal = Number(dayRow.disposal);
  } else {
    const before = [...rows].reverse().find(r => new Date(r.date) < target);
    opening = before ? Number(before.closing_stock) : 0;
    waste = 0;
    priorDisposal = 0;
  }
  const available = opening + waste - priorDisposal;
  return { source, opening, waste, available };
}

/** Public: current available stock for a category on a date — used for live preview lookups. */
export async function getStockFor(category, date) {
  const waste_type = wasteTypeForCategory(category);
  if (!waste_type) return { available: null, opening: null, waste: null, source: null, waste_type: null };
  const stock = await getStockForDate(prisma, category, waste_type, date || isoDay(new Date()));
  return { ...stock, waste_type };
}

/** Parse a PDF buffer, attach a best-guess category and date-aware available stock to each item. */
export async function parseInvoiceBuffer(buffer) {
  const { header, items } = await parseDisposalInvoice(buffer);
  const date = header.invoice_date || isoDay(new Date());
  const enriched = await Promise.all(items.map(async it => {
    const m = matchCategory(it.material_description);
    const stock = m.category
      ? await getStockForDate(prisma, m.category, m.waste_type, date)
      : { source: null, opening: null, waste: null, available: null };
    return {
      ...it,
      category: m.category,
      waste_type: m.waste_type,
      match_confidence: m.confidence,
      available_stock: stock.available,
      opening_stock: stock.opening,
      waste_for_day: stock.waste,
      stock_source: stock.source,
    };
  }));
  return { header, items: enriched };
}

/**
 * Subtract `qty` kg of disposal for a category on `date`, then recompute the
 * running opening/closing balances forward through every later ledger entry of
 * the same (category, waste_type, source) group. Runs inside the given tx.
 * Returns the ledger entry the disposal was booked against + the chosen source.
 */
async function applyDisposalTx(tx, { category, waste_type, date, qty }) {
  const allRows = await tx.generationDisposalLedger.findMany({
    where: { category, waste_type },
    orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
  });

  // Target the source (BAT/SOFT) whose latest entry holds the most stock.
  const source = await pickSource(tx, category, waste_type);

  const target = new Date(date);
  const group = allRows.filter(r => r.source === source);

  // Find (or create) the ledger row for the disposal date.
  let dayRow = group.find(r => isoDay(r.date) === isoDay(target));
  if (!dayRow) {
    const before = [...group].reverse().find(r => new Date(r.date) < target);
    const opening = before ? Number(before.closing_stock) : 0;
    dayRow = await tx.generationDisposalLedger.create({
      data: {
        date: target, category, waste_type, source,
        opening_stock: opening, waste_for_day: 0, disposal: 0, closing_stock: opening,
        declaration_id: null,
      },
    });
  }

  // Book the disposal onto that row.
  const newDisposal = Number(dayRow.disposal) + qty;
  await tx.generationDisposalLedger.update({
    where: { id: dayRow.id },
    data: {
      disposal: newDisposal,
      closing_stock: Number(dayRow.opening_stock) + Number(dayRow.waste_for_day) - newDisposal,
    },
  });

  // Cascade running balance forward through the whole group.
  const fresh = await tx.generationDisposalLedger.findMany({
    where: { category, waste_type, source },
    orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
  });
  let prevClosing = null;
  for (const r of fresh) {
    const opening = prevClosing === null ? Number(r.opening_stock) : prevClosing;
    const closing = opening + Number(r.waste_for_day) - Number(r.disposal);
    if (opening !== Number(r.opening_stock) || closing !== Number(r.closing_stock)) {
      await tx.generationDisposalLedger.update({
        where: { id: r.id },
        data: { opening_stock: opening, closing_stock: closing },
      });
    }
    prevClosing = closing;
  }

  return { ledger_entry_id: dayRow.id, source };
}

/** Persist a parsed/confirmed disposal invoice and subtract its quantities from the ledger. */
export async function createDisposalInvoice(payload, user) {
  if (!DISPOSAL_ROLES.includes(user.role)) {
    throw new AppError('Only Security, IREP or Admin can record disposals', 403, 'FORBIDDEN');
  }

  const existing = await prisma.disposalInvoice.findUnique({ where: { invoice_no: payload.invoice_no } });
  if (existing) throw new AppError('This invoice has already been recorded', 409, 'DUPLICATE_INVOICE');

  // Every line must resolve to a known category before we touch the ledger.
  const unmatched = payload.items.filter(it => !it.category || !wasteTypeForCategory(it.category));
  if (unmatched.length) {
    throw new AppError(
      `Unrecognised material(s): ${unmatched.map(i => i.material_description).join(', ')}`,
      422, 'UNMATCHED_CATEGORY',
    );
  }

  // Stock guard (hard block): a disposal can never exceed the available stock for
  // that day — max = opening stock + waste of the day (less any disposal already booked).
  const fmt = (n) => Number(Number(n).toFixed(3));
  const byCat = new Map();
  for (const it of payload.items) byCat.set(it.category, (byCat.get(it.category) || 0) + it.qty_kg);
  const shortfalls = [];
  for (const [category, qty] of byCat) {
    const { opening, waste, available } = await getStockForDate(
      prisma, category, wasteTypeForCategory(category), payload.invoice_date,
    );
    if (qty > available) shortfalls.push({ category, qty, opening, waste, available });
  }
  if (shortfalls.length) {
    const detail = shortfalls
      .map(s => `${s.category}: tried ${fmt(s.qty)} kg but max is ${fmt(s.available)} kg (opening ${fmt(s.opening)} + waste ${fmt(s.waste)})`)
      .join('; ');
    throw new AppError(`Disposal not possible — exceeds available stock. ${detail}`, 422, 'INSUFFICIENT_STOCK');
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.disposalInvoice.create({
      data: {
        invoice_no: payload.invoice_no,
        invoice_date: new Date(payload.invoice_date),
        vendor_name: payload.vendor_name,
        vendor_gstin: payload.vendor_gstin ?? null,
        total_net_amount: payload.total_net_amount ?? null,
        total_tax: payload.total_tax ?? null,
        total_amount: payload.total_amount ?? null,
        source_file: payload.source_file ?? null,
        created_by: user.id,
      },
    });

    for (const it of payload.items) {
      const waste_type = wasteTypeForCategory(it.category);
      const { ledger_entry_id, source } = await applyDisposalTx(tx, {
        category: it.category, waste_type, date: payload.invoice_date, qty: it.qty_kg,
      });
      await tx.disposalInvoiceItem.create({
        data: {
          disposal_invoice_id: inv.id,
          material_description: it.material_description,
          category: it.category,
          waste_type,
          source,
          qty_kg: it.qty_kg,
          unit_price: it.unit_price ?? null,
          ledger_entry_id,
        },
      });
    }
    return inv;
  });

  await logAudit({
    userId: user.id,
    action: 'DISPOSAL_INVOICE_RECORDED',
    entity: 'disposal_invoices',
    entityId: invoice.id,
    newValue: { invoice_no: invoice.invoice_no, vendor_name: invoice.vendor_name, items: payload.items.length },
  });

  return getDisposalInvoiceById(invoice.id);
}

export async function getDisposalInvoiceById(id) {
  return prisma.disposalInvoice.findUnique({
    where: { id },
    include: { items: true, creator: { select: { name: true, emp_no: true } } },
  });
}

export async function getDisposalInvoices(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);

  const where = {};
  if (query.date_from) where.invoice_date = { ...where.invoice_date, gte: new Date(query.date_from) };
  if (query.date_to) where.invoice_date = { ...where.invoice_date, lte: new Date(query.date_to + 'T23:59:59Z') };

  const [items, total] = await Promise.all([
    prisma.disposalInvoice.findMany({
      where,
      include: { items: true, creator: { select: { name: true, emp_no: true } } },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.disposalInvoice.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
