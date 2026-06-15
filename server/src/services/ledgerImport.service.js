import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';
import { matchCategory } from './disposalMatch.service.js';

const SUB_HEADERS = ['Opening Stock', 'Waste for the Day', 'Disposal', 'Closing Stock'];

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Excel serial date → JS Date (Excel epoch 1899-12-30). Also accepts real Dates.
function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 1) return new Date(Math.round((v - 25569) * 86400 * 1000));
  if (typeof v === 'string') {
    const d = dayjs(v, ['DD-MM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'M/D/YYYY']);
    if (d.isValid()) return d.toDate();
  }
  return null;
}

// Strip "(Kgs)"/"(Nos)" unit hints (anywhere) from a material header.
function cleanName(name) {
  return String(name).replace(/\(\s*(?:kgs?|nos?|units?)\s*\)/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Import the material under its own name (faithful to the source sheet) and
// classify only the waste type: General sheet → GENERAL; otherwise HAZARDOUS,
// upgraded to EWASTE when the material clearly matches a known e-waste category.
function resolveCategory(rawName, sheetName) {
  const category = rawName;
  let waste_type = /general/i.test(sheetName) ? 'GENERAL' : 'HAZARDOUS';
  const m = matchCategory(rawName);
  if (!/general/i.test(sheetName) && m.category && m.waste_type === 'EWASTE') waste_type = 'EWASTE';
  return { category, waste_type };
}

/**
 * Parse a wide monthly ledger workbook (one sheet per waste group; each material
 * is a 4-column block of Opening / Waste / Disposal / Closing across date rows).
 * Returns one descriptor per sheet with detected materials + flattened entries.
 */
export function parseLedgerWorkbook(buffer) {
  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new AppError('Could not read the Excel file', 422, 'XLSX_PARSE_FAILED');
  }

  const sheets = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });

    // Find the material-header row (its first cell is "Date").
    const hdrIdx = rows.findIndex(r => r && String(r[0] ?? '').trim().toLowerCase() === 'date');
    if (hdrIdx < 0) continue;
    const headerRow = rows[hdrIdx];

    // Each non-empty header cell after Date starts a 4-column material block.
    const blocks = [];
    for (let c = 1; c < headerRow.length; c++) {
      if (headerRow[c] != null && String(headerRow[c]).trim() !== '') {
        blocks.push({ raw: cleanName(headerRow[c]), col: c });
      }
    }
    if (!blocks.length) continue;

    const materials = blocks.map(b => ({ raw: b.raw, ...resolveCategory(b.raw, sheetName) }));

    // Data rows start after the sub-header row; a data row has a real date in col 0.
    const entries = [];
    const dates = [];
    for (let r = hdrIdx + 2; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const date = toDate(row[0]);
      if (!date) continue;
      dates.push(date);
      blocks.forEach((b, i) => {
        const opening = num(row[b.col]);
        const waste = num(row[b.col + 1]);
        const disposal = num(row[b.col + 2]);
        const closing = num(row[b.col + 3]);
        // Skip completely empty cells (no movement and no stock) to avoid noise.
        if (opening === 0 && waste === 0 && disposal === 0 && closing === 0) return;
        entries.push({
          date,
          category: materials[i].category,
          waste_type: materials[i].waste_type,
          opening_stock: opening,
          waste_for_day: waste,
          disposal,
          closing_stock: closing,
        });
      });
    }

    sheets.push({
      sheetName,
      materials,
      row_count: entries.length,
      date_from: dates.length ? dayjs(Math.min(...dates)).format('YYYY-MM-DD') : null,
      date_to: dates.length ? dayjs(Math.max(...dates)).format('YYYY-MM-DD') : null,
      entries,
    });
  }

  if (!sheets.length) throw new AppError('No ledger sheets found (need a "Date" header row)', 422, 'NO_LEDGER_DATA');
  return sheets;
}

/** Build the preview payload (no entries, just the summary the UI shows). */
export function buildPreview(sheets) {
  return sheets.map(s => ({
    sheetName: s.sheetName,
    row_count: s.row_count,
    date_from: s.date_from,
    date_to: s.date_to,
    materials: s.materials.map(m => ({ raw: m.raw, category: m.category, waste_type: m.waste_type })),
  }));
}

/** Write parsed ledger entries into the database (upsert by date+category+waste_type+source). */
export async function commitLedgerImport(buffer, source, user) {
  if (!['BAT', 'SOFT'].includes(source)) throw new AppError('source must be BAT or SOFT', 422, 'BAD_SOURCE');
  const sheets = parseLedgerWorkbook(buffer);
  const all = sheets.flatMap(s => s.entries);

  let written = 0;
  // Chunk the work so a big month doesn't open one giant transaction.
  for (const e of all) {
    const date = new Date(dayjs(e.date).format('YYYY-MM-DD'));
    const existing = await prisma.generationDisposalLedger.findFirst({
      where: { date, category: e.category, waste_type: e.waste_type, source },
    });
    const data = {
      opening_stock: e.opening_stock, waste_for_day: e.waste_for_day,
      disposal: e.disposal, closing_stock: e.closing_stock,
    };
    if (existing) {
      await prisma.generationDisposalLedger.update({ where: { id: existing.id }, data });
    } else {
      await prisma.generationDisposalLedger.create({
        data: { date, category: e.category, waste_type: e.waste_type, source, declaration_id: null, ...data },
      });
    }
    written++;
  }

  await logAudit({
    userId: user.id,
    action: 'LEDGER_IMPORTED',
    entity: 'generation_disposal_ledger',
    entityId: source,
    newValue: { source, sheets: sheets.map(s => s.sheetName), rows: written },
  });

  return { written, sheets: buildPreview(sheets) };
}
