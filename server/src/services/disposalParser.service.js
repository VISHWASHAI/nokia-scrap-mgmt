import { PDFParse } from 'pdf-parse';
import { AppError } from '../utils/AppError.js';

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

// Units we recognise on the second line of each item row.
const UNIT_RE = /^([A-Z]{2,4})\s+([\d,]+(?:\.\d+)?)\b/;
// Item header line: "<sno> \t <description...> \t <qty>"
const ITEM_RE = /^(\d{1,3})\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s*$/;

function parseLineItems(lines) {
  const items = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const next = lines[i + 1].trim();

    const head = ITEM_RE.exec(line);
    const unit = UNIT_RE.exec(next);
    if (!head || !unit) continue;

    const description = head[2].replace(/\s+/g, ' ').trim();
    const qty = num(head[3]);
    if (!description || qty == null) continue;

    items.push({
      material_description: description,
      qty_kg: qty,
      unit: unit[1],
      unit_price: num(unit[2]),
    });
  }
  return items;
}

/**
 * Extract structured data from a Nokia scrap tax-invoice PDF buffer.
 * Returns { header, items } — nothing is persisted here.
 */
export async function parseDisposalInvoice(buffer) {
  let text;
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const res = await parser.getText();
    text = res.text;
    await parser.destroy();
  } catch (err) {
    throw new AppError('Could not read PDF file', 422, 'PDF_PARSE_FAILED');
  }

  if (!text || !/TAX INVOICE/i.test(text)) {
    throw new AppError('This does not look like a tax invoice PDF', 422, 'NOT_AN_INVOICE');
  }

  const invoice_no  = firstMatch(text, /Invoice No\.\s*\t?\s*(\S+)/);
  const dateRaw     = firstMatch(text, /Invoice Date\s*\t?\s*(\d{2}\.\d{2}\.\d{4})/);
  const invoice_date = dateRaw ? toISODate(dateRaw) : null;

  // Vendor name = the company line immediately after the 64-char IRN hash.
  let vendor_name = firstMatch(text, /\n[0-9a-f]{64}\n([^\n]+)/i);
  if (vendor_name) vendor_name = vendor_name.replace(/\s+/g, ' ').trim();
  const vendor_gstin = firstMatch(text, /GSTIN:\s*\t?\s*([0-9A-Z]+)/);

  const total_net_amount = num(firstMatch(text, /Value of taxable supply \/ Items total\s*\tINR\s*\t([\d,]+\.\d+)/));
  const total_tax        = num(firstMatch(text, /Total TAX\s*\tINR\s*\t([\d,]+\.\d+)/));
  const total_amount     = num(firstMatch(text, /Net Amount Payable\s*\tINR\s*\t([\d,]+\.\d+)/));

  const items = parseLineItems(text.split('\n'));

  if (!invoice_no) throw new AppError('Invoice number not found in PDF', 422, 'NO_INVOICE_NO');
  if (!items.length) throw new AppError('No line items found in PDF', 422, 'NO_LINE_ITEMS');

  return {
    header: { invoice_no, invoice_date, vendor_name, vendor_gstin, total_net_amount, total_tax, total_amount },
    items,
  };
}
