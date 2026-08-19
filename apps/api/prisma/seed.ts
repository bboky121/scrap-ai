import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PlanCode } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter });
async function main() {
  const plans = [
    { code: PlanCode.WEEK, name: '1주', price: 3900, durationUnit: 'day', durationCount: 7 },
    { code: PlanCode.MONTH, name: '1개월', price: 9900, durationUnit: 'month', durationCount: 1 },
    { code: PlanCode.YEAR, name: '1년', price: 79000, durationUnit: 'year', durationCount: 1 },
  ];
  for (const plan of plans) await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  await prisma.user.upsert({
    where: { email: 'demo@kisbrief.local' },
    update: {},
    create: { email: 'demo@kisbrief.local', name: '데모 투자자' },
  });
}
main().finally(() => prisma.$disconnect());
