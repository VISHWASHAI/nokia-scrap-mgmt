import { z } from 'zod';

export const createEmployeeSchema = z.object({
  emp_no: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['EMPLOYEE', 'ZONE_MANAGER', 'DEPT_HEAD', 'FACILITY_MANAGER', 'ADMIN']),
  production_function: z.enum(['SMT', 'MFT', 'REPAIR', 'RFM', 'FILTER', 'SQ']).optional(),
  zone: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['EMPLOYEE', 'ZONE_MANAGER', 'DEPT_HEAD', 'FACILITY_MANAGER', 'ADMIN']).optional(),
  production_function: z.enum(['SMT', 'MFT', 'REPAIR', 'RFM', 'FILTER', 'SQ']).optional().nullable(),
  zone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});
