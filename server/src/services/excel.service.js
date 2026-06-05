import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { uploadToOneDrive } from './graph.upload.js';

const NOKIA_BLUE = 'FF0068B3';
const NOKIA_TEAL = 'FF00B4A0';
const ROW_ALT = 'FFF9FAFB';

function styleHeader(row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOKIA_BLUE } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
}

function styleTotals(row) {
  row.eachCell(cell => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
    cell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
}

function addLedgerSheet(wb, title, rows) {
  const ws = wb.addWorksheet(title);
  ws.columns = [
    { header: 'Category', key: 'category', width: 36 },
    { header: 'Opening Stock (kg)', key: 'opening_stock', width: 20 },
    { header: 'Waste for Day (kg)', key: 'waste_for_day', width: 20 },
    { header: 'Disposal (kg)', key: 'disposal', width: 18 },
    { header: 'Closing Stock (kg)', key: 'closing_stock', width: 20 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
  ];

  styleHeader(ws.getRow(1));

  let totals = { opening_stock: 0, waste_for_day: 0, disposal: 0, closing_stock: 0 };
  rows.forEach((r, i) => {
    const row = ws.addRow({
      category: r.category,
      opening_stock: Number(r.opening_stock),
      waste_for_day: Number(r.waste_for_day),
      disposal: Number(r.disposal),
      closing_stock: Number(r.closing_stock),
      source: r.source,
      date: dayjs(r.date).format('YYYY-MM-DD'),
    });
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
      });
    }
    totals.opening_stock += Number(r.opening_stock);
    totals.waste_for_day += Number(r.waste_for_day);
    totals.disposal += Number(r.disposal);
    totals.closing_stock += Number(r.closing_stock);
  });

  const totRow = ws.addRow({
    category: 'TOTAL',
    opening_stock: totals.opening_stock,
    waste_for_day: totals.waste_for_day,
    disposal: totals.disposal,
    closing_stock: totals.closing_stock,
    source: '',
    date: '',
  });
  styleTotals(totRow);
  ws.getRow(1).height = 22;
}

export async function generateReport(dateFrom, dateTo) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo + 'T23:59:59Z');

  const ledger = await prisma.generationDisposalLedger.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ date: 'asc' }, { category: 'asc' }],
  });

  const declarations = await prisma.scrapDeclaration.findMany({
    where: { date: { gte: from, lte: to } },
    include: { employee: true, line_items: true },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nokia Scrap Management System';
  wb.created = new Date();

  // Sheet 1 — General Waste
  addLedgerSheet(wb, 'General Scrap', ledger.filter(l => l.waste_type === 'GENERAL'));

  // Sheet 2 — Hazardous & E-Waste
  addLedgerSheet(wb, 'Hazardous & E-Scrap', ledger.filter(l => l.waste_type !== 'GENERAL'));

  // Sheet 3 — Summary
  const ws3 = wb.addWorksheet('Summary');
  ws3.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  styleHeader(ws3.getRow(1));

  const bySource = { BAT: 0, SOFT: 0, COMBINED: 0 };
  ledger.forEach(l => { bySource[l.source] = (bySource[l.source] || 0) + Number(l.waste_for_day); });

  const summaryRows = [
    { metric: 'Date Range', value: `${dateFrom} → ${dateTo}` },
    { metric: 'Total Declarations', value: declarations.length },
    { metric: 'Total Waste BAT (kg)', value: bySource.BAT },
    { metric: 'Total Waste SOFT (kg)', value: bySource.SOFT },
    { metric: 'Total Waste COMBINED (kg)', value: bySource.COMBINED },
    { metric: 'Total General Waste (kg)', value: ledger.filter(l => l.waste_type === 'GENERAL').reduce((s, l) => s + Number(l.waste_for_day), 0) },
    { metric: 'Total Hazardous Waste (kg)', value: ledger.filter(l => l.waste_type === 'HAZARDOUS').reduce((s, l) => s + Number(l.waste_for_day), 0) },
    { metric: 'Total E-Waste (kg)', value: ledger.filter(l => l.waste_type === 'EWASTE').reduce((s, l) => s + Number(l.waste_for_day), 0) },
  ];

  summaryRows.forEach((r, i) => {
    const row = ws3.addRow(r);
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
      });
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function triggerExport(declarationId, triggeredBy = 'DECLARATION_COMPLETED') {
  const today = dayjs().format('YYYY-MM-DD');
  const buffer = await generateReport(today, today);
  const filename = `Nokia_Scrap_Report_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  return uploadToOneDrive(buffer, filename, declarationId, triggeredBy);
}
