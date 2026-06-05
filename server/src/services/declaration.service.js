import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';
import { triggerExport } from './excel.service.js';

async function generateDeclarationNo() {
  const today = dayjs().format('YYYYMMDD');
  const prefix = `DCL-${today}-`;
  const last = await prisma.scrapDeclaration.findFirst({
    where: { declaration_no: { startsWith: prefix } },
    orderBy: { declaration_no: 'desc' },
  });
  const seq = last ? parseInt(last.declaration_no.split('-')[2]) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const STATUS_FLOW = {
  DRAFT: 'SUBMITTED',
  SUBMITTED: 'ZONE_APPROVED',
  ZONE_APPROVED: 'DEPT_APPROVED',
  DEPT_APPROVED: 'IREP_AUTHORIZED',
  IREP_AUTHORIZED: 'SECURITY_AUTHORIZED',
  SECURITY_AUTHORIZED: 'COMPLETED',
};

const APPROVER_ROLE_FOR_STATUS = {
  SUBMITTED:          ['ZONE_MANAGER', 'DEPT_HEAD', 'IREP', 'SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  ZONE_APPROVED:      ['DEPT_HEAD', 'IREP', 'SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  DEPT_APPROVED:      ['IREP', 'FACILITY_MANAGER', 'ADMIN'],
  IREP_AUTHORIZED:    ['SECURITY', 'FACILITY_MANAGER', 'ADMIN'],
  SECURITY_AUTHORIZED:['FACILITY_MANAGER', 'ADMIN'],
};

function sourceFromFunction(fn) {
  return ['SMT', 'MFT'].includes(fn) ? 'BAT' : 'SOFT';
}

export async function createDeclaration(body, user) {
  const declaration_no = await generateDeclarationNo();
  const source = sourceFromFunction(body.production_function);

  const decl = await prisma.scrapDeclaration.create({
    data: {
      declaration_no,
      employee_id: user.id,
      date: new Date(body.date),
      shift: body.shift,
      time: body.time,
      zone: body.zone,
      production_function: body.production_function,
      source,
      description: body.description,
      reference_no: body.reference_no,
      status: 'DRAFT',
      line_items: {
        create: body.line_items.map(li => ({
          waste_type: li.waste_type,
          category: li.category,
          pallet_qty: li.pallet_qty ?? null,
          weight_kg: li.weight_kg ?? null,
          remarks: li.remarks ?? null,
        })),
      },
    },
    include: { line_items: true },
  });

  await logAudit({
    userId: user.id,
    action: 'DECLARATION_CREATED',
    entity: 'scrap_declarations',
    entityId: decl.id,
    newValue: { declaration_no, status: 'DRAFT' },
  });

  return decl;
}

export async function updateDeclaration(id, body, user) {
  const decl = await prisma.scrapDeclaration.findUnique({ where: { id } });
  if (!decl) throw new AppError('Declaration not found', 404, 'NOT_FOUND');
  if (decl.status !== 'DRAFT') throw new AppError('Only DRAFT declarations can be edited', 409, 'CONFLICT');
  if (decl.employee_id !== user.id && user.role !== 'ADMIN') {
    throw new AppError('Cannot edit another user\'s declaration', 403, 'FORBIDDEN');
  }

  const source = sourceFromFunction(body.production_function);

  // Replace all line items and update header atomically
  await prisma.declarationLineItem.deleteMany({ where: { declaration_id: id } });

  const updated = await prisma.scrapDeclaration.update({
    where: { id },
    data: {
      date: new Date(body.date),
      shift: body.shift,
      time: body.time,
      zone: body.zone,
      production_function: body.production_function,
      source,
      description: body.description,
      reference_no: body.reference_no,
      line_items: {
        create: body.line_items.map(li => ({
          waste_type: li.waste_type,
          category: li.category,
          pallet_qty: li.pallet_qty ?? null,
          weight_kg: li.weight_kg ?? null,
          remarks: li.remarks ?? null,
        })),
      },
    },
    include: { line_items: true },
  });

  await logAudit({
    userId: user.id,
    action: 'DECLARATION_UPDATED',
    entity: 'scrap_declarations',
    entityId: id,
    newValue: { status: 'DRAFT' },
  });

  return updated;
}

export async function submitDeclaration(id, user, ipAddress) {
  const decl = await prisma.scrapDeclaration.findUnique({ where: { id }, include: { line_items: true } });
  if (!decl) throw new AppError('Declaration not found', 404, 'NOT_FOUND');
  if (decl.employee_id !== user.id && user.role !== 'ADMIN') {
    throw new AppError('Cannot submit another user\'s declaration', 403, 'FORBIDDEN');
  }
  if (decl.status !== 'DRAFT') throw new AppError('Only DRAFT declarations can be submitted', 409, 'CONFLICT');

  const hasWeight = decl.line_items.some(li => li.weight_kg && Number(li.weight_kg) > 0);
  if (!hasWeight) throw new AppError('At least one line item must have weight > 0', 422, 'VALIDATION_ERROR');

  const updated = await prisma.scrapDeclaration.update({
    where: { id },
    data: { status: 'SUBMITTED' },
  });

  await logAudit({
    userId: user.id,
    action: 'DECLARATION_SUBMITTED',
    entity: 'scrap_declarations',
    entityId: id,
    oldValue: { status: 'DRAFT' },
    newValue: { status: 'SUBMITTED' },
    ipAddress,
  });

  return updated;
}

export async function approveDeclaration(id, user, ipAddress) {
  const decl = await prisma.scrapDeclaration.findUnique({ where: { id }, include: { line_items: true } });
  if (!decl) throw new AppError('Declaration not found', 404, 'NOT_FOUND');

  const allowedRoles = APPROVER_ROLE_FOR_STATUS[decl.status];
  if (!allowedRoles) throw new AppError('Declaration cannot be approved at this status', 409, 'CONFLICT');
  if (!allowedRoles.includes(user.role)) {
    throw new AppError('Your role cannot approve at this stage', 403, 'FORBIDDEN');
  }

  const newStatus = STATUS_FLOW[decl.status];
  const now = new Date();

  const updateData = { status: newStatus };
  if (decl.status === 'SUBMITTED') { updateData.zone_manager_id = user.id; updateData.zone_approved_at = now; }
  if (decl.status === 'ZONE_APPROVED') { updateData.dept_head_id = user.id; updateData.dept_approved_at = now; }
  if (decl.status === 'DEPT_APPROVED') { updateData.irep_auth_by = user.id; updateData.irep_authorized_at = now; }
  if (decl.status === 'IREP_AUTHORIZED') { updateData.security_auth_by = user.id; updateData.security_authorized_at = now; }
  if (decl.status === 'SECURITY_AUTHORIZED') { updateData.completed_at = now; }

  const updated = await prisma.scrapDeclaration.update({ where: { id }, data: updateData });

  await logAudit({
    userId: user.id,
    action: 'DECLARATION_APPROVED',
    entity: 'scrap_declarations',
    entityId: id,
    oldValue: { status: decl.status },
    newValue: { status: newStatus },
    ipAddress,
  });

  // Post-completion: create ledger entries + trigger Excel export
  if (newStatus === 'COMPLETED') {
    await createLedgerEntries(decl);
    triggerExport(id, 'DECLARATION_COMPLETED').catch(err =>
      console.error('[ExcelExport] Auto-export failed:', err.message)
    );
  }

  return updated;
}

async function createLedgerEntries(decl) {
  const date = decl.date;
  for (const li of decl.line_items) {
    if (!li.weight_kg || Number(li.weight_kg) <= 0) continue;

    // Find previous closing stock for this category+waste_type+source
    const prev = await prisma.generationDisposalLedger.findFirst({
      where: {
        category: li.category,
        waste_type: li.waste_type,
        source: decl.source,
        date: { lt: date },
      },
      orderBy: { date: 'desc' },
    });

    const opening = prev ? Number(prev.closing_stock) : 0;
    const waste = Number(li.weight_kg);
    const disposal = 0;
    const closing = opening + waste - disposal;

    await prisma.generationDisposalLedger.create({
      data: {
        date,
        category: li.category,
        waste_type: li.waste_type,
        opening_stock: opening,
        waste_for_day: waste,
        disposal,
        closing_stock: closing,
        source: decl.source,
        declaration_id: decl.id,
      },
    });
  }
}

export async function getDeclarations(query, user) {
  const where = {};

  // Non-admin/manager only see their own
  if (user.role === 'EMPLOYEE') where.employee_id = user.id;

  if (query.date_from) where.date = { ...where.date, gte: new Date(query.date_from) };
  if (query.date_to) where.date = { ...where.date, lte: new Date(query.date_to + 'T23:59:59Z') };
  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.function) where.production_function = query.function;
  if (query.zone) where.zone = query.zone;

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);

  const [items, total] = await Promise.all([
    prisma.scrapDeclaration.findMany({
      where,
      include: {
        employee: { select: { name: true, emp_no: true } },
        line_items: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scrapDeclaration.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getDeclarationById(id, user) {
  const decl = await prisma.scrapDeclaration.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true, emp_no: true, zone: true, production_function: true } },
      zone_manager: { select: { name: true, emp_no: true } },
      dept_head: { select: { name: true, emp_no: true } },
      irep_authorizer: { select: { name: true, emp_no: true } },
      security_authorizer: { select: { name: true, emp_no: true } },
      line_items: true,
    },
  });

  if (!decl) throw new AppError('Declaration not found', 404, 'NOT_FOUND');
  if (user.role === 'EMPLOYEE' && decl.employee_id !== user.id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  return decl;
}
