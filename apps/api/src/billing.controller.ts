import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { PlanCode } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from './prisma.service';
import { userId } from './session';

export function planEndsAt(code: PlanCode, from = new Date()) {
  const end = new Date(from);
  if (code === 'WEEK') end.setUTCDate(end.getUTCDate() + 7);
  if (code === 'MONTH') end.setUTCMonth(end.getUTCMonth() + 1);
  if (code === 'YEAR') end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

@Controller()
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('plans') plans() {
    return this.prisma.plan.findMany({ orderBy: { price: 'asc' } });
  }

  @Post('payments/simulate')
  async pay(
    @Req() req: Request,
    @Body() body: { planCode: PlanCode; result: 'success' | 'failure'; cardLast4?: string; autoRenew?: boolean },
  ) {
    const uid = userId(req);
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: body.planCode } });
    const success = body.result === 'success';
    const payment = await this.prisma.paymentAttempt.create({
      data: {
        userId: uid,
        planCode: plan.code,
        amount: plan.price,
        status: success ? 'SUCCEEDED' : 'FAILED',
        cardLast4: (body.cardLast4 ?? '4242').slice(-4),
        failureReason: success ? null : 'SIMULATED_DECLINE',
      },
    });
    if (!success) return { payment, subscription: null };
    await this.prisma.subscription.updateMany({
      where: { userId: uid, status: 'ACTIVE' },
      data: { status: 'EXPIRED', autoRenew: false },
    });
    const start = new Date();
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: uid,
        planCode: plan.code,
        status: 'ACTIVE',
        startsAt: start,
        endsAt: planEndsAt(plan.code, start),
        autoRenew: !!body.autoRenew,
        events: { create: { type: 'ACTIVATED', detail: { paymentId: payment.id } } },
      },
    });
    return { payment, subscription };
  }

  @Get('subscriptions/me')
  async mine(@Req() req: Request) {
    return {
      subscription: await this.prisma.subscription.findFirst({
        where: { userId: userId(req), status: 'ACTIVE', endsAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { endsAt: 'desc' },
      }),
    };
  }

  @Patch('subscriptions/me/auto-renew')
  async renew(@Req() req: Request, @Body() body: { autoRenew: boolean }) {
    const sub = await this.prisma.subscription.findFirstOrThrow({
      where: { userId: userId(req), status: 'ACTIVE', endsAt: { gt: new Date() } },
    });
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        autoRenew: !!body.autoRenew,
        events: { create: { type: 'AUTO_RENEW_CHANGED', detail: { autoRenew: !!body.autoRenew } } },
      },
    });
  }

  @Post('subscriptions/me/cancel')
  async cancel(@Req() req: Request) {
    const sub = await this.prisma.subscription.findFirstOrThrow({
      where: { userId: userId(req), status: 'ACTIVE', endsAt: { gt: new Date() } },
    });
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        autoRenew: false,
        canceledAt: new Date(),
        events: { create: { type: 'CANCELED_AT_PERIOD_END', detail: {} } },
      },
    });
  }
}
