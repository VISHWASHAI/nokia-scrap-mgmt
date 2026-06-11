import { z } from 'zod';
import { PRODUCTION_FUNCTIONS } from '../constants/productionFunctions.js';

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
  production_function: z.enum(PRODUCTION_FUNCTIONS),
  source: z.enum(['BAT', 'SOFT']).optional(),
  description: z.string().optional(),
  reference_no: z.string().optional(),
  disposal_route: z.enum(['CIRCULARITY', 'AUTHORIZED_AGENCY']),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateDisposalSchema = z.object({
  disposal: z.number().nonnegative(),
});

const STORAGE_LOCATIONS = ['GENERAL_SCRAP_YARD', 'HAZARDOUS_WASTE_STORAGE', 'EWASTE_STORAGE', 'PLASTICS_STORAGE', 'METALS_STORAGE'];

export const updateStorageLocationSchema = z.object({
  storage_location: z.enum(STORAGE_LOCATIONS).nullable(),
});
