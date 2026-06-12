import { z } from 'zod';

const itemSchema = z.object({
  material_description: z.string().min(1),
  category: z.string().min(1),
  waste_type: z.enum(['GENERAL', 'HAZARDOUS', 'EWASTE']).optional(),
  qty_kg: z.number().positive(),
  unit_price: z.number().nonnegative().nullable().optional(),
});

export const createDisposalInvoiceSchema = z.object({
  invoice_no: z.string().min(1),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendor_name: z.string().min(1),
  vendor_gstin: z.string().nullable().optional(),
  total_net_amount: z.number().nullable().optional(),
  total_tax: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  source_file: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});
