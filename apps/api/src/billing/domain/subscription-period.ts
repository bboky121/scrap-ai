import { PlanCode } from '../../generated/prisma/client';

export function planEndsAt(code: PlanCode, from = new Date()) {
  const end = new Date(from);
  if (code === 'WEEK') end.setUTCDate(end.getUTCDate() + 7);
  if (code === 'MONTH') end.setUTCMonth(end.getUTCMonth() + 1);
  if (code === 'YEAR') end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}
