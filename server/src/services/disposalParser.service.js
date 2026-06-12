import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AppError } from '../utils/AppError.js';

// Bundled Tesseract language data lives at the server root, so OCR works
// offline without downloading from a CDN at runtime.
const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// pdf-parse pulls in pdfjs-dist, which touches browser globals (DOMMatrix) at
// import time. Load it (and tesseract) lazily so the rest of the server can
// start even if that fails — only the disposal-parse endpoint depends on them.
let PDFParsePromise;
function loadPdfParse() {
  if (!PDFParsePromise) PDFParsePromise = import('pdf-parse').then(m => m.PDFParse);
  return PDFParsePromise;
}
let TesseractPromise;
function loadTesseract() {
  if (!TesseractPromise) TesseractPromise = import('tesseract.js').then(m => m.default ?? m);
  return TesseractPromise;
}

// Convert DD.MM.YYYY → YYYY-MM-DD
function toISODate(ddmmyyyy) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ddmmyyyy);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function num(str) {
  if (str == null) return null;
  const n = Number(String(str).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function firstMatch(text, re) {
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

// ── Digital (text-layer) line items: "<sno> <desc> <qty>" then "KGS <price> …" ──
const UNIT_RE = /^([A-Z]{2,4})\s+([\d,]+(?:\.\d+)?)\b/;
const ITEM_RE = /^(\d{1,3})\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s*$/;

function parseLineItemsDigital(lines) {
  const items = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const head = ITEM_RE.exec(lines[i].trim());
    const unit = UNIT_RE.exec(lines[i + 1].trim());
    if (!head || !unit) continue;
    const description = head[2].replace(/\s+/g, ' ').trim();
    const qty = num(head[3]);
    if (!description || qty == null) continue;
    items.push({ material_description: description, qty_kg: qty, unit: unit[1], unit_price: num(unit[2]) });
  }
  return items;
}

// ── OCR line items: one noisy line per row. Columns collapse together, so we
// derive the quantity from gross ÷ unit price (qty × unit price = gross). ──
//   "1 Blank PCB 85340000 = 47.00 278240.00 0.00 278240.00 18 ..."
const OCR_ITEM_RE = /^\s*\d{1,3}\s+([A-Za-z][A-Za-z0-9 /&().,'-]*?)\s+\d{6,}\D*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;

function parseLineItemsOcr(lines) {
  const items = [];
  for (const raw of lines) {
    const m = OCR_ITEM_RE.exec(raw.trim());
    if (!m) continue;
    const description = m[1].replace(/\s+/g, ' ').trim();
    const unit_price = num(m[2]);
    const gross = num(m[3]);
    if (!description || !unit_price || !gross) continue;
    const qty = Math.round((gross / unit_price) * 1000) / 1000;
    items.push({ material_description: description, qty_kg: qty, unit: 'KGS', unit_price });
  }
  return items;
}

// Render each page to a high-resolution image and OCR it.
async function ocrPdf(buffer) {
  const PDFParse = await loadPdfParse();
  const Tesseract = await loadTesseract();
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let text = '';
  try {
    const shot = await parser.getScreenshot({ scale: 3 });
    for (const page of shot.pages ?? []) {
      const b64 = (page.dataUrl || '').split(',')[1];
      if (!b64) continue;
      const { data } = await Tesseract.recognize(Buffer.from(b64, 'base64'), 'eng', {
        langPath: SERVER_ROOT,
        gzip: false,
        cacheMethod: 'none',
      });
      text += data.text + '\n';
    }
  } finally {
    await parser.destroy();
  }
  return text;
}

/**
 * Extract structured data from a Nokia scrap tax-invoice PDF buffer.
 * Falls back to OCR for scanned PDFs that have no text layer.
 * Returns { header, items } — nothing is persisted here.
 */
export async function parseDisposalInvoice(buffer) {
  let text = '';
  try {
    const PDFParse = await loadPdfParse();
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    text = (await parser.getText()).text || '';
    await parser.destroy();
  } catch (err) {
    text = '';
  }

  // No real text layer (scanned image) → OCR fallback.
  let ocrUsed = false;
  if (text.replace(/[^A-Za-z0-9]/g, '').length < 40) {
    try {
      text = await ocrPdf(buffer);
      ocrUsed = true;
    } catch (err) {
      throw new AppError('Could not read this PDF, even with OCR. Try a clearer scan or a digital PDF.', 422, 'PDF_PARSE_FAILED');
    }
  }

  if (!text || !/TAX\s*INVOICE/i.test(text)) {
    throw new AppError('This does not look like a tax invoice PDF', 422, 'NOT_AN_INVOICE');
  }

  // ── Header (tolerant to OCR noise) ──
  let invoice_no = firstMatch(text, /Invoice No\.?\s*[:,]?\s*\t?\s*(NSS[-\s]?TN[-\s]?\d+)/i);
  if (!invoice_no) {
    // OCR fallback: take the longest digit run on the "Invoice No" line.
    const invLine = (/Inv\w*\s*No[^\n]*/i.exec(text) || [])[0] || '';
    const runs = invLine.match(/\d{4,}/g);
    if (runs) invoice_no = `NSS-TN-${runs.sort((a, b) => b.length - a.length)[0]}`;
  }
  if (invoice_no) invoice_no = invoice_no.replace(/\s+/g, '').toUpperCase();

  const dateMatch = /Inv\w*\s*Date[^\d\n]*(\d{2})[.\/](\d{2})[.\/](\d{4})/i.exec(text);
  const invoice_date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;

  let vendor_name = firstMatch(text, /\n[0-9a-f]{64}\n([^\n]+)/i)
    || firstMatch(text, /Bill to\s*\n+\s*([^\n]+)/i)
    || firstMatch(text, /Ship To\s*\n+\s*([^\n]+)/i);
  if (vendor_name) vendor_name = vendor_name.replace(/\s+/g, ' ').trim();
  const vendor_gstin = firstMatch(text, /GSTIN[:\s]*\t?\s*([0-9A-Z]{10,})/i);

  const total_net_amount = num(firstMatch(text, /Value of taxable supply[^\n]*?([\d,]+\.\d{2})/));
  const total_tax        = num(firstMatch(text, /Total TAX[^\n]*?([\d,]+\.\d{2})/));
  const total_amount     = num(firstMatch(text, /Net Amount Payable[^\n]*?([\d,]+\.\d{2})/));

  // ── Line items: digital structure first, OCR-derived as fallback ──
  let items = parseLineItemsDigital(text.split('\n'));
  if (!items.length) items = parseLineItemsOcr(text.split('\n'));

  // For digital PDFs we insist on a clean parse; for OCR we return best-effort
  // and let the user verify/correct in the review screen.
  if (!ocrUsed && !invoice_no) throw new AppError('Invoice number not found in PDF', 422, 'NO_INVOICE_NO');
  if (!items.length) throw new AppError('No line items could be read from this PDF', 422, 'NO_LINE_ITEMS');

  return {
    header: { invoice_no, invoice_date, vendor_name, vendor_gstin, total_net_amount, total_tax, total_amount, ocr: ocrUsed },
    items,
  };
}
