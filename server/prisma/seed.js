import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('nokia@123', 12);

  const admin = await prisma.employee.upsert({
    where: { emp_no: 'EMP001' },
    update: {},
    create: {
      emp_no: 'EMP001',
      name: 'System Admin',
      email: 'admin@nokia.com',
      password_hash: hash,
      role: 'ADMIN',
      zone: 'HQ',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP002' },
    update: {},
    create: {
      emp_no: 'EMP002',
      name: 'Facility Manager',
      email: 'fm@nokia.com',
      password_hash: hash,
      role: 'FACILITY_MANAGER',
      zone: 'MAIN',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP003' },
    update: {},
    create: {
      emp_no: 'EMP003',
      name: 'Dept Head A',
      email: 'zm-a@nokia.com',
      password_hash: hash,
      role: 'DEPT_HEAD',
      production_function: 'SMT',
      zone: 'ZONE-A',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP004' },
    update: {},
    create: {
      emp_no: 'EMP004',
      name: 'Dept Head BAT',
      email: 'dh-bat@nokia.com',
      password_hash: hash,
      role: 'DEPT_HEAD',
      production_function: 'MFT',
      zone: 'ZONE-B',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP005' },
    update: {},
    create: {
      emp_no: 'EMP005',
      name: 'Floor Employee SMT',
      email: 'smt@nokia.com',
      password_hash: hash,
      role: 'EMPLOYEE',
      production_function: 'SMT',
      zone: 'ZONE-A',
    },
  });

  // SOFT production line employees
  await prisma.employee.upsert({
    where: { emp_no: 'EMP006' },
    update: {},
    create: {
      emp_no: 'EMP006',
      name: 'Dept Head SOFT',
      email: 'zm-soft@nokia.com',
      password_hash: hash,
      role: 'DEPT_HEAD',
      production_function: 'REPAIR',
      zone: 'ZONE-B',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP007' },
    update: {},
    create: {
      emp_no: 'EMP007',
      name: 'Floor Employee SOFT',
      email: 'soft@nokia.com',
      password_hash: hash,
      role: 'EMPLOYEE',
      production_function: 'RFM',
      zone: 'ZONE-B',
    },
  });

  // IREP and Security approvers
  await prisma.employee.upsert({
    where: { emp_no: 'EMP008' },
    update: {},
    create: {
      emp_no: 'EMP008',
      name: 'IREP Officer',
      email: 'irep@nokia.com',
      password_hash: hash,
      role: 'IREP',
      zone: 'HQ',
    },
  });

  await prisma.employee.upsert({
    where: { emp_no: 'EMP009' },
    update: {},
    create: {
      emp_no: 'EMP009',
      name: 'Security Officer',
      email: 'security@nokia.com',
      password_hash: hash,
      role: 'SECURITY',
      zone: 'GATE',
    },
  });

  console.log('Seed complete. Default password: nokia@123');
  console.log('Accounts:', [
    'EMP001 (ADMIN)',
    'EMP002 (FACILITY_MANAGER)',
    'EMP003 (DEPT_HEAD/BAT)',
    'EMP004 (DEPT_HEAD/BAT)',
    'EMP005 (EMPLOYEE/BAT)',
    'EMP006 (DEPT_HEAD/SOFT)',
    'EMP007 (EMPLOYEE/SOFT)',
    'EMP008 (IREP)',
    'EMP009 (SECURITY)',
  ]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
