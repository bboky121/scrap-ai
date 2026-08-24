import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { AutoRenewDto } from './dto/auto-renew.dto';
import { planEndsAt } from './domain/subscription-period';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  plans() {
    return this.prisma.plan.findMany({ orderBy: { price: 'asc' } });
  }

  async pay(userId: string, body: SimulatePaymentDto) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: body.planCode } });
    const success = body.result === 'success';
    const payment = await this.prisma.paymentAttempt.create({
      data: {
        userId,
        planCode: plan.code,
        amount: plan.price,
        status: success ? 'SUCCEEDED' : 'FAILED',
        cardLast4: (body.cardLast4 ?? '4242').slice(-4),
        failureReason: success ? null : 'SIMULATED_DECLINE',
      },
    });
    if (!success) return { payment, subscription: null };
    await this.prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'EXPIRED', autoRenew: false },
    });
    const start = new Date();
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
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

  async mine(userId: string) {
    return {
      subscription: await this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { endsAt: 'desc' },
      }),
    };
  }

  async renew(userId: string, body: AutoRenewDto) {
    const sub = await this.prisma.subscription.findFirstOrThrow({
      where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
    });
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        autoRenew: !!body.autoRenew,
        events: { create: { type: 'AUTO_RENEW_CHANGED', detail: { autoRenew: !!body.autoRenew } } },
      },
    });
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.findFirstOrThrow({
      where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
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
