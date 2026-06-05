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
      name: 'Zone Manager A',
      email: 'zm-a@nokia.com',
      password_hash: hash,
      role: 'ZONE_MANAGER',
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

  console.log('Seed complete. Default password: nokia@123');
  console.log('Accounts:', ['EMP001 (ADMIN)', 'EMP002 (FACILITY_MANAGER)', 'EMP003 (ZONE_MANAGER)', 'EMP004 (DEPT_HEAD)', 'EMP005 (EMPLOYEE)']);
}

main().catch(console.error).finally(() => prisma.$disconnect());
