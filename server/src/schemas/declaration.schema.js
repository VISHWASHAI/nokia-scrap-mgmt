import { z } from 'zod';

const lineItemSchema = z.object({
  waste_type: z.enum(['GENERAL', 'HAZARDOUS', 'EWASTE']),
  category: z.string().min(1),
  pallet_qty: z.number().nonnegative().nullable().optional(),
  weight_kg: z.number().nonnegative().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const createDeclarationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum(['A', 'B', 'C', 'G']),
  time: z.string().min(1),
  zone: z.string().min(1),
  production_function: z.enum(['SMT', 'MFT', 'REPAIR', 'RFM', 'FILTER', 'SQ']),
  description: z.string().optional(),
  reference_no: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateDisposalSchema = z.object({
  disposal: z.number().nonnegative(),
});
